import { NextResponse } from "next/server";
import { generateGeminiText } from "@/lib/server/gemini";

const MAX_PROMPT_LENGTH = 4000;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { prompt?: string };
    const prompt = body.prompt?.trim();

    if (!prompt) {
      return NextResponse.json(
        { error: "Missing prompt." },
        { status: 400 }
      );
    }

    if (prompt.length > MAX_PROMPT_LENGTH) {
      return NextResponse.json(
        { error: `Prompt too long. Max ${MAX_PROMPT_LENGTH} characters.` },
        { status: 400 }
      );
    }

    const text = await generateGeminiText(prompt);

    return NextResponse.json({ text });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
