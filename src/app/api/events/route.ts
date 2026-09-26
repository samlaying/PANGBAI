import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { events } from "@/db/schema";
import { desc } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { runEventIngestionPipeline, type EventType } from "@/server/harness/event-ingestion-worker";

export const runtime = "nodejs";

/**
 * GET /api/events — 获取事件列表（支持 ?projectId=xxx&type=chat 过滤）
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const projectId = url.searchParams.get("projectId");
    const type = url.searchParams.get("type");

    const query = db.select().from(events).orderBy(desc(events.createdAt)).limit(50);

    // Drizzle 的链式 where 需要逐步拼
    const allEvents = await query;

    const filtered = allEvents.filter((e) => {
      if (projectId && e.projectId !== projectId) return false;
      if (type && e.type !== type) return false;
      return true;
    });

    const result = filtered.map((e) => ({
      ...e,
      metadata: e.metadataJson ? safeJsonParse(e.metadataJson) : {},
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/events error:", error);
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
  }
}

/**
 * POST /api/events — 录入事实素材（群聊/私聊/会议/评审/突发事件）
 *
 * Harness 工程范式：落库 → 异步触发反思管线 → 返回录入结果 + 提取摘要
 *
 * Request Body:
 * {
 *   type: "chat" | "meeting" | "review" | "incident",
 *   title: "评审会讨论排期延误",
 *   content: "原始聊天文本 / 会议纪要全文 / 评审反馈...",
 *   personId?: "关联的主要干系人 ID (可选)",
 *   projectId?: "关联的项目 ID (可选)",
 *   metadata?: {
 *     chatType?: "group" | "private",
 *     attendees?: [{ name: "老李", role: "技术总监" }],
 *     actionItems?: [{ task: "确认排期", owner: "老李", deadline: "本周五" }],
 *     conclusion?: "会议结论摘要",
 *     blockingIssues?: ["前端资源不足", "设计稿未交付"]
 *   }
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const type = body.type as EventType;
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const content = typeof body.content === "string" ? body.content.trim() : "";

    if (!type || !["chat", "meeting", "review", "incident"].includes(type)) {
      return NextResponse.json(
        { error: 'type is required and must be one of: "chat", "meeting", "review", "incident"' },
        { status: 400 }
      );
    }
    if (!title || !content) {
      return NextResponse.json(
        { error: "title and content are required" },
        { status: 400 }
      );
    }

    const eventId = `evt_${randomUUID().slice(0, 8)}`;
    const personId = typeof body.personId === "string" ? body.personId : null;
    const projectId = typeof body.projectId === "string" ? body.projectId : null;
    const metadata = body.metadata || {};

    // 1. 持久化到 events 表
    await db.insert(events).values({
      id: eventId,
      type,
      title,
      content,
      personId,
      projectId,
      metadataJson: JSON.stringify(metadata),
    });

    // 2. 异步触发 Harness 反思管线（非阻塞，但在本次请求生命周期内完成以便返回结果）
    const ingestionResult = await runEventIngestionPipeline({
      eventId,
      type,
      title,
      content,
      personId: personId || undefined,
      projectId: projectId || undefined,
      metadata,
    });

    return NextResponse.json({
      id: eventId,
      type,
      title,
      projectId,
      harness: {
        extractedPeople: ingestionResult.extractedPeople,
        extractedPatterns: ingestionResult.extractedPatterns,
        actionItems: ingestionResult.actionItems,
        riskSignals: ingestionResult.riskSignals,
      },
    }, { status: 201 });
  } catch (error) {
    console.error("POST /api/events error:", error);
    return NextResponse.json({ error: "Failed to create event" }, { status: 500 });
  }
}

function safeJsonParse(str: string): unknown {
  try { return JSON.parse(str); } catch { return {}; }
}
