import { NextResponse } from "next/server";
import { analyzeIssueContext } from "@/lib/issueClassifier";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { text, language } = body;

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { success: false, error: "Complaint text is required." },
        { status: 400 }
      );
    }

    const analysis = analyzeIssueContext(text, language);

    return NextResponse.json({
      success: true,
      data: analysis,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Classification failed." },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const text = searchParams.get("text") || "";
  const language = searchParams.get("language") || undefined;

  const analysis = analyzeIssueContext(text, language);
  return NextResponse.json({
    success: true,
    data: analysis,
  });
}
