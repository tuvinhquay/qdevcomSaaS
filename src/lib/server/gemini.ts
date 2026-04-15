const GEMINI_API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

type GeminiApiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    message?: string;
  };
};

function getGeminiConfig() {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;

  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY. Add it to your .env.local file.");
  }

  return { apiKey, model };
}

export async function generateGeminiText(prompt: string): Promise<string> {
  const { apiKey, model } = getGeminiConfig();

  const response = await fetch(
    `${GEMINI_API_BASE_URL}/models/${model}:generateContent?key=${apiKey}`,
    {
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
    }
  );

  const payload = (await response.json()) as GeminiApiResponse;

  if (!response.ok) {
    throw new Error(payload.error?.message || "Gemini request failed.");
  }

  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

  if (!text) {
    throw new Error("Gemini response was empty.");
  }

  return text;
}
