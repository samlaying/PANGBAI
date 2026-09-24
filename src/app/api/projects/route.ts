import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { projects, projectArtifacts } from "@/db/schema";
import { randomUUID } from "node:crypto";

export const runtime = "nodejs";

function parseObjectJson(value: string | null): Record<string, unknown> {
  if (!value) return {};
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

export async function GET() {
  try {
    const list = await db.select().from(projects);
    const artifacts = await db.select().from(projectArtifacts);
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
        artifacts: artifacts.filter((art) => art.projectId === p.id).map((art) => ({
          id: art.id,
          projectId: art.projectId,
          title: art.title,
          content: art.content,
          updatedAt: art.updatedAt,
          frontmatter: parseObjectJson(art.frontmatterJson),
        })),
      };
    });

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("GET /api/projects error:", error);
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });
    const id = randomUUID();
    const deadline = typeof body.deadline === "string" ? body.deadline.trim() : null;
    await db.insert(projects).values({ id, name, deadline, status: "in_progress" });
    return NextResponse.json({ id, name, deadline, status: "in_progress", progress: 0, risks: [], milestones: [], stakeholders: [], artifacts: [] }, { status: 201 });
  } catch (error) {
    console.error("POST /api/projects error:", error);
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}
