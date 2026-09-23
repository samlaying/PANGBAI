import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { projectArtifacts } from "@/db/schema";
import { parseFrontmatter } from "@/server/artifacts/frontmatter";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    const query = projectId
      ? db.select().from(projectArtifacts).where(eq(projectArtifacts.projectId, projectId))
      : db.select().from(projectArtifacts);

    const list = await query;
    const formatted = list.map((art) => {
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
    });

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("GET /api/artifacts error:", error);
    return NextResponse.json({ error: "Failed to fetch artifacts" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { projectId, filename, title, content, docType } = body;

    if (!projectId || !content) {
      return NextResponse.json(
        { error: "projectId and content are required" },
        { status: 400 }
      );
    }

    const { frontmatter } = parseFrontmatter(content);
    const finalTitle = title || frontmatter.title || filename || "未命名文档";
    const finalDocType = docType || frontmatter.doc_type || frontmatter.type || "prd";
    const newId = `art_${Date.now()}`;

    await db.insert(projectArtifacts).values({
      id: newId,
      projectId,
      filename: filename || `${newId}.md`,
      title: finalTitle,
      docType: String(finalDocType),
      frontmatterJson: JSON.stringify(frontmatter),
      content,
      version: String(frontmatter.version || "v1.0"),
    });

    return NextResponse.json({
      id: newId,
      projectId,
      filename: filename || `${newId}.md`,
      title: finalTitle,
      docType: finalDocType,
      frontmatter,
      content,
      version: frontmatter.version || "v1.0",
    });
  } catch (error) {
    console.error("POST /api/artifacts error:", error);
    return NextResponse.json({ error: "Failed to create artifact" }, { status: 500 });
  }
}
