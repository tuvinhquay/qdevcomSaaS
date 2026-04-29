export const runtime = "nodejs";

type GeminiRoutePayload = {
  prompt?: string;
};

type GeminiResponseBody = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
};

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "Missing GEMINI_API_KEY on server environment." },
      { status: 500 },
    );
  }

  let payload: GeminiRoutePayload;
  try {
    payload = (await request.json()) as GeminiRoutePayload;
  } catch {
    return Response.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const prompt = payload.prompt?.trim() ?? "";
  if (!prompt) {
    return Response.json({ error: "Prompt is required." }, { status: 400 });
  }

  const endpoint =
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  const upstream = await fetch(endpoint, {
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

  if (!upstream.ok) {
    const errorText = await upstream.text();
    return Response.json(
      { error: "Gemini upstream request failed.", details: errorText },
      { status: upstream.status },
    );
  }

  const data = (await upstream.json()) as GeminiResponseBody;
  const text = data.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("\n")
    .trim();

  if (!text) {
    return Response.json(
      { error: "Gemini returned empty content." },
      { status: 502 },
    );
  }

  return Response.json({ text });
}
