import { NextRequest, NextResponse } from "next/server";
import { confirmMemoryToDatabase } from "@/server/world-model/people-service";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const { candidateId, observation, inferredPattern, confidence, source } = body;

    if (!observation || !inferredPattern) {
      return NextResponse.json(
        { error: "observation and inferredPattern are required" },
        { status: 400 }
      );
    }

    const updatedPerson = await confirmMemoryToDatabase({
      personId: id,
      candidateId,
      observation,
      inferredPattern,
      confidence: confidence ?? 0.85,
      source: source || "职场对话反思提炼",
    });

    return NextResponse.json({
      success: true,
      message: "Memory successfully confirmed and recorded to SQLite world model",
      person: updatedPerson,
    });
  } catch (error) {
    console.error("POST /api/people/[id]/memory/confirm error:", error);
    return NextResponse.json({ error: "Failed to confirm memory" }, { status: 500 });
  }
}
