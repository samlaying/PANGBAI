import { NextResponse } from "next/server";
import { getPeopleWithDetails } from "@/server/world-model/people-service";

export const runtime = "nodejs";

export async function GET() {
  try {
    const data = await getPeopleWithDetails();
    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/people error:", error);
    return NextResponse.json({ error: "Failed to fetch people" }, { status: 500 });
  }
}
