import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { projects, projectArtifacts, people } from "@/db/schema";
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

/**
 * POST /api/projects — 创建项目（支持完整初始化）
 *
 * Harness 范式：创建项目时可一次性传入干系人、里程碑、风险，
 * 若干系人不存在于 people 表则自动建档。
 *
 * Request Body:
 * {
 *   name: "招聘 Agent v2",
 *   deadline?: "1月31日",
 *   progress?: 0,
 *   advice?: "项目策略建议",
 *   stakeholders?: [
 *     { name: "老李", role: "技术总监", department?: "研发部" },
 *     { name: "王总", role: "CEO" }
 *   ],
 *   milestones?: [
 *     { name: "需求评审", date: "10月1日", done: false },
 *     { name: "技术方案", date: "10月8日", done: false }
 *   ],
 *   risks?: [
 *     { title: "前端资源不足", note: "仅1名前端可用" },
 *     { title: "设计稿延迟", note: "设计师本周请假" }
 *   ]
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

    const id = typeof body.id === "string" ? body.id.trim() : randomUUID();
    const deadline = typeof body.deadline === "string" ? body.deadline.trim() : null;
    const progress = typeof body.progress === "number" ? body.progress : 0;
    const advice = typeof body.advice === "string" ? body.advice.trim() : null;

    // 处理干系人：若不在 people 表中则自动建档
    const stakeholders: Array<{ id: string; name: string; role: string }> = [];
    if (Array.isArray(body.stakeholders)) {
      const existingPeople = await db.select().from(people);
      const existingMap = new Map(existingPeople.map((p) => [p.name, p]));

      for (const sh of body.stakeholders) {
        const shName = typeof sh.name === "string" ? sh.name.trim() : "";
        const shRole = typeof sh.role === "string" ? sh.role.trim() : "业务干系人";
        if (!shName) continue;

        const existing = existingMap.get(shName);
        if (existing) {
          stakeholders.push({ id: existing.id, name: existing.name, role: existing.role });
        } else {
          // 自动建档
          const personId = shName.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, "_").toLowerCase()
            || `p_${randomUUID().slice(0, 6)}`;
          await db.insert(people).values({
            id: personId,
            name: shName,
            role: shRole,
            department: typeof sh.department === "string" ? sh.department : null,
            relationshipTone: "稳定协同",
            tensionScore: 50,
            advice: `由项目「${name}」初始化时自动建档`,
          }).onConflictDoNothing();
          stakeholders.push({ id: personId, name: shName, role: shRole });
          existingMap.set(shName, {
            id: personId,
            userId: "default_user",
            name: shName,
            role: shRole,
            department: null,
            relationshipTone: null,
            tensionScore: 50,
            advice: null,
            createdAt: null,
            updatedAt: null,
          });
        }
      }
    }

    // 处理里程碑
    const milestones: Array<{ name: string; date: string; done: boolean; isRisk?: boolean }> = [];
    if (Array.isArray(body.milestones)) {
      for (const ms of body.milestones) {
        milestones.push({
          name: typeof ms.name === "string" ? ms.name : "",
          date: typeof ms.date === "string" ? ms.date : "",
          done: Boolean(ms.done),
          isRisk: Boolean(ms.isRisk),
        });
      }
    }

    // 处理风险
    const risks: Array<{ title: string; note: string }> = [];
    if (Array.isArray(body.risks)) {
      for (const r of body.risks) {
        risks.push({
          title: typeof r.title === "string" ? r.title : "",
          note: typeof r.note === "string" ? r.note : "",
        });
      }
    }

    await db.insert(projects).values({
      id,
      name,
      deadline,
      status: "in_progress",
      progress,
      advice,
      stakeholdersJson: stakeholders.length > 0 ? JSON.stringify(stakeholders) : null,
      milestonesJson: milestones.length > 0 ? JSON.stringify(milestones) : null,
      risksJson: risks.length > 0 ? JSON.stringify(risks) : null,
    });

    return NextResponse.json({
      id,
      name,
      deadline,
      status: "in_progress",
      progress,
      stakeholders,
      milestones,
      risks,
      artifacts: [],
    }, { status: 201 });
  } catch (error) {
    console.error("POST /api/projects error:", error);
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}
