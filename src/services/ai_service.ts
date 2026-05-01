import { getAIContext } from "@/core/ai/contextEngine";
import {
  getLowStock,
  getTodayProduction,
  getWorkerPerformance,
} from "@/core/ai/dataAnalyzer";
import { runRules, type AnalysisData } from "@/core/ai/ruleEngine";

export type AIIntent = "data_query" | "erp_command" | "ai_advice";

const DANGEROUS_TOKENS = ["delete", "drop", "bypass", "admin", "truncate", "reset"];
const ERP_COMMAND_TOKENS = ["tao", "cap nhat", "dong bo", "generate", "command"];
const ADVICE_TOKENS = ["nen", "goi y", "cai thien", "advice", "optimize"];

function normalize(input: string): string {
  return input.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function detectIntent(message: string): AIIntent {
  const normalized = normalize(message);
  if (ADVICE_TOKENS.some((token) => normalized.includes(token))) return "ai_advice";
  if (ERP_COMMAND_TOKENS.some((token) => normalized.includes(token))) return "erp_command";
  return "data_query";
}

function containsDangerousToken(message: string): boolean {
  const normalized = normalize(message);
  return DANGEROUS_TOKENS.some((token) => normalized.includes(token));
}

function formatDataQueryReply(analysisData: AnalysisData, warnings: string[]): string {
  const lines: string[] = [
    `Tong san luong hom nay: ${analysisData.todayProduction.totalOutput}.`,
    `Don hang dang chay: ${analysisData.todayProduction.runningOrders}.`,
    `Don hang tre deadline: ${analysisData.todayProduction.lateOrders}.`,
    `So vat tu ton thap: ${analysisData.lowStock.length}.`,
  ];
  if (warnings.length > 0) {
    lines.push("Canh bao hien tai:");
    lines.push(...warnings.map((item) => `- ${item}`));
  }
  return lines.join("\n");
}

function formatErpCommandReply(message: string): string {
  return [
    "Da nhan lenh ERP command o che do an toan.",
    "Hien tai @q chi mo phong command noi bo, khong tu dong ghi du lieu nguy hiem.",
    `Noi dung yeu cau: "${message.trim()}"`,
  ].join("\n");
}

async function askGeminiAdvice(analysisData: AnalysisData): Promise<string> {
  const prompt = [
    "You are Q-DevCom ERP assistant.",
    "Give concise production advice based on this tenant data:",
    JSON.stringify(analysisData, null, 2),
  ].join("\n\n");

  const response = await fetch("/api/gemini", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });

  if (!response.ok) {
    throw new Error(`Gemini request failed: ${response.status}`);
  }
  const data = (await response.json()) as { text?: string };
  if (!data.text?.trim()) throw new Error("Gemini returned empty response.");
  return data.text.trim();
}

export async function handleAIMessage(message: string): Promise<string> {
  const cleanMessage = message.replace(/^@q\s*/i, "").trim();
  if (!cleanMessage) {
    return "Hay nhap noi dung sau @q de toi ho tro.";
  }

  if (containsDangerousToken(cleanMessage)) {
    return "Yeu cau bi chan boi security filter. Vui long dieu chinh cau lenh an toan hon.";
  }

  const context = await getAIContext();
  const [todayProduction, lowStock, workerPerformance] = await Promise.all([
    getTodayProduction(context.companyId),
    getLowStock(context.companyId),
    getWorkerPerformance(context.companyId),
  ]);

  const analysisData: AnalysisData = { todayProduction, lowStock, workerPerformance };
  const warnings = runRules(analysisData);
  const intent = detectIntent(cleanMessage);

  if (intent === "data_query") {
    return formatDataQueryReply(analysisData, warnings);
  }

  if (intent === "erp_command") {
    return formatErpCommandReply(cleanMessage);
  }

  try {
    return await askGeminiAdvice(analysisData);
  } catch {
    return [
      "Khong ket noi duoc Gemini, chuyen sang che do goi y noi bo:",
      formatDataQueryReply(analysisData, warnings),
    ].join("\n\n");
  }
}
