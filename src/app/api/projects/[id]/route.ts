import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { projects, projectArtifacts } from "@/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const res = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
    if (!res || res.length === 0) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const p = res[0];
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

    const artifacts = await db
      .select()
      .from(projectArtifacts)
      .where(eq(projectArtifacts.projectId, id));

    return NextResponse.json({
      ...p,
      risks,
      milestones,
      stakeholders,
      artifacts: artifacts.map((art) => {
        let frontmatter = {};
        try {
          frontmatter = art.frontmatterJson ? JSON.parse(art.frontmatterJson) : {};
        } catch {
          // ignore
        }
        return {
          id: art.id,
          projectId: art.projectId,
          filename: art.filename,
          title: art.title,
          docType: art.docType,
          frontmatter,
          content: art.content,
          version: art.version,
          updatedAt: art.updatedAt,
        };
      }),
    });
  } catch (error) {
    console.error("GET /api/projects/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch project detail" }, { status: 500 });
  }
}
