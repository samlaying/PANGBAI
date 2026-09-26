import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { events } from "@/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

/**
 * GET /api/events/[id] — 获取单条事件详情
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const result = await db.select().from(events).where(eq(events.id, id)).limit(1);
    if (result.length === 0) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    const e = result[0];
    let metadata = {};
    try { metadata = e.metadataJson ? JSON.parse(e.metadataJson) : {}; } catch { /* ignore */ }
    return NextResponse.json({ ...e, metadata });
  } catch (error) {
    console.error("GET /api/events/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch event" }, { status: 500 });
  }
}

/**
 * DELETE /api/events/[id] — 删除单条事件
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await db.delete(events).where(eq(events.id, id));
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("DELETE /api/events/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete event" }, { status: 500 });
  }
}
