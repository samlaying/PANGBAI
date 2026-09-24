import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { projectArtifacts } from "@/db/schema";
import { parseFrontmatter } from "@/server/artifacts/frontmatter";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const res = await db.select().from(projectArtifacts).where(eq(projectArtifacts.id, id)).limit(1);
    if (!res || res.length === 0) {
      return NextResponse.json({ error: "Artifact not found" }, { status: 404 });
    }

    const art = res[0];
    let frontmatter = {};
    try {
      frontmatter = art.frontmatterJson ? JSON.parse(art.frontmatterJson) : {};
    } catch {
      // ignore
    }

    return NextResponse.json({
      id: art.id,
      projectId: art.projectId,
      filename: art.filename,
      title: art.title,
      docType: art.docType,
      frontmatter,
      content: art.content,
      version: art.version,
      updatedAt: art.updatedAt,
    });
  } catch (error) {
    console.error("GET /api/artifacts/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch artifact" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await db.select({ id: projectArtifacts.id }).from(projectArtifacts).where(eq(projectArtifacts.id, id)).limit(1);
    if (existing.length === 0) return NextResponse.json({ error: "Artifact not found" }, { status: 404 });
    const body = await req.json();
    const { content, title } = body;

    if (content === undefined) {
      return NextResponse.json({ error: "content is required" }, { status: 400 });
    }

    const { frontmatter } = parseFrontmatter(content);
    const finalTitle = title || frontmatter.title;

    const updatePayload: Record<string, unknown> = {
      content,
      frontmatterJson: JSON.stringify(frontmatter),
      updatedAt: new Date().toISOString(),
    };
    if (finalTitle) updatePayload.title = finalTitle;
    if (frontmatter.version) updatePayload.version = String(frontmatter.version);
    if (frontmatter.doc_type || frontmatter.type) {
      updatePayload.docType = String(frontmatter.doc_type || frontmatter.type);
    }

    await db.update(projectArtifacts).set(updatePayload).where(eq(projectArtifacts.id, id));

    return NextResponse.json({
      success: true,
      id,
      title: finalTitle,
      frontmatter,
      content,
    });
  } catch (error) {
    console.error("PUT /api/artifacts/[id] error:", error);
    return NextResponse.json({ error: "Failed to update artifact" }, { status: 500 });
  }
}
