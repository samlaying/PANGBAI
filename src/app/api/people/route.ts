import { NextRequest, NextResponse } from "next/server";
import { getPeopleWithDetails } from "@/server/world-model/people-service";
import { db } from "@/db/client";
import { people } from "@/db/schema";
import { randomUUID } from "node:crypto";

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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const role = typeof body.role === "string" ? body.role.trim() : "";
    if (!name || !role) return NextResponse.json({ error: "name and role are required" }, { status: 400 });
    const id = randomUUID();
    await db.insert(people).values({ id, name, role });
    return NextResponse.json({ id, name, role, models: [], evidence: [] }, { status: 201 });
  } catch (error) {
    console.error("POST /api/people error:", error);
    return NextResponse.json({ error: "Failed to create person" }, { status: 500 });
  }
}
