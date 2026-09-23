import { NextRequest, NextResponse } from "next/server";
import { getPersonById } from "@/server/world-model/people-service";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const person = await getPersonById(id);
    if (!person) {
      return NextResponse.json({ error: "Person not found" }, { status: 404 });
    }
    return NextResponse.json(person);
  } catch (error) {
    console.error("GET /api/people/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch person" }, { status: 500 });
  }
}
