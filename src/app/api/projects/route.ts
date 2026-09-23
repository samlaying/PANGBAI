import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { projects } from "@/db/schema";

export const runtime = "nodejs";

export async function GET() {
  try {
    const list = await db.select().from(projects);
    const formatted = list.map((p) => {
      let risks = [];
      let milestones = [];
      let stakeholders = [];
      try {
        risks = p.risksJson ? JSON.parse(p.risksJson) : [];
        milestones = p.milestonesJson ? JSON.parse(p.milestonesJson) : [];
        stakeholders = p.stakeholdersJson ? JSON.parse(p.stakeholdersJson) : [];
      } catch {
        // ignore
      }

      return {
        ...p,
        risks,
        milestones,
        stakeholders,
      };
    });

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("GET /api/projects error:", error);
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 });
  }
}
