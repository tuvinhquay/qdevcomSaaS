"use client";

import { getAIContext } from "@/core/ai/contextEngine";
import {
  getLowStock,
  getTodayProduction,
  getWorkerPerformance,
} from "@/core/ai/dataAnalyzer";
import { runRules, type AnalysisData } from "@/core/ai/ruleEngine";

type AIIntent = "data_query" | "ai_advice";

const DATA_QUERY_KEYWORDS = [
  "bao nhieu",
  "thong ke",
  "ton kho",
  "don hang",
];

const AI_ADVICE_KEYWORDS = ["nen", "cai thien"];

function normalizeVietnameseText(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function detectIntent(cleanMessage: string): AIIntent {
  const normalized = normalizeVietnameseText(cleanMessage);

  if (AI_ADVICE_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return "ai_advice";
  }

  if (DATA_QUERY_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return "data_query";
  }

  // Mặc định ưu tiên data_query để giảm số lần gọi AI.
  return "data_query";
}

function composeDataReply(analysisData: AnalysisData, warnings: string[]): string {
  const lines: string[] = [
    `Hom nay nha may san xuat ${analysisData.todayProduction.totalOutput} san pham.`,
    `Co ${analysisData.todayProduction.runningOrders} don hang dang chay.`,
    `Co ${analysisData.todayProduction.lateOrders} don hang dang tre deadline.`,
  ];

  if (warnings.length > 0) {
    lines.push("Canh bao:");
    lines.push(...warnings.map((warning) => `- ${warning}`));
  }

  return lines.join("\n");
}

function buildAdviceFallback(analysisData: AnalysisData, warnings: string[]): string {
  const advice: string[] = [];

  if (analysisData.todayProduction.lateOrders > 0) {
    advice.push("Tap trung uu tien don hang gan deadline va tach ca xu ly.");
  }
  if (analysisData.lowStock.length > 0) {
    advice.push("Lap ke hoach bo sung ton kho cho nhom vat tu quan trong.");
  }
  if (analysisData.workerPerformance.some((item) => item.progress < 80)) {
    advice.push("Kiem tra nghen cong doan va dao tao lai cho nhom duoi target.");
  }

  if (advice.length === 0) {
    advice.push("San xuat dang on dinh. Duy tri nhip theo doi moi 4 gio.");
  }

  const warningBlock = warnings.length > 0 ? `\nCanh bao hien tai:\n- ${warnings.join("\n- ")}` : "";
  return `Chua ket noi duoc Gemini. Goi y nhanh:\n- ${advice.join("\n- ")}${warningBlock}`;
}

async function askGeminiForAdvice(analysisData: AnalysisData): Promise<string> {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    return "Gemini API key chua cau hinh (NEXT_PUBLIC_GEMINI_API_KEY).";
  }

  const prompt = [
    "You are factory manager AI.",
    "Give short improvement advice based on:",
    JSON.stringify(analysisData, null, 2),
  ].join("\n\n");

  const endpoint =
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini request failed with status ${response.status}.`);
  }

  const data = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
    }>;
  };

  const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("\n").trim();
  if (!text) {
    throw new Error("Gemini returned empty content.");
  }

  return text;
}

export async function handleAIMessage(message: string): Promise<string> {
  const cleanMessage = message.replace("@q", "").trim();

  if (!cleanMessage) {
    return "Ban hay nhap noi dung sau @q de toi phan tich du lieu nha may.";
  }

  const context = await getAIContext();
  const intent = detectIntent(cleanMessage);

  // 80% logic chạy bằng Firestore + JS, dùng chung cho cả data_query và ai_advice.
  const [todayProduction, lowStock, workerPerformance] = await Promise.all([
    getTodayProduction(context.companyId),
    getLowStock(context.companyId),
    getWorkerPerformance(context.companyId),
  ]);

  const analysisData: AnalysisData = {
    todayProduction,
    lowStock,
    workerPerformance,
  };
  const warnings = runRules(analysisData);

  if (intent === "data_query") {
    return composeDataReply(analysisData, warnings);
  }

  try {
    return await askGeminiForAdvice(analysisData);
  } catch {
    return buildAdviceFallback(analysisData, warnings);
  }
}
