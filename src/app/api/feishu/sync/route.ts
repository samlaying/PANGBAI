import { NextRequest, NextResponse } from "next/server";
import { feishuClient } from "@/server/integrations/feishu/feishu-client";
import { larkCliAdapter } from "@/server/integrations/feishu/feishu-cli-adapter";
import { runEventIngestionPipeline } from "@/server/harness/event-ingestion-worker";

export const runtime = "nodejs";

/**
 * POST /api/feishu/sync — 从指定飞书群聊或 P2P 单聊同步对话记录并触发 Harness 事实反思管线
 *
 * Request Body:
 * {
 *   "chatId": "oc_xxx",
 *   "as": "user" | "bot" (默认 auto),
 *   "projectId": "project_id (可选)"
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const chatId = typeof body.chatId === "string" ? body.chatId.trim() : "";
    const asMode = (body.as || "auto") as "user" | "bot" | "auto";
    const projectId = typeof body.projectId === "string" ? body.projectId.trim() : undefined;

    if (!chatId) {
      return NextResponse.json({ error: "chatId is required" }, { status: 400 });
    }

    const authStatus = await larkCliAdapter.getAuthStatus();
    const shouldUseUser = asMode === "user" || (asMode === "auto" && authStatus.hasUserToken);

    if (shouldUseUser) {
      // 走 User OAuth 身份通道 (可读取 P2P 单聊与用户可见群聊)
      const messages = await larkCliAdapter.getChatMessages(chatId, { as: "user", limit: 50 });
      const lines: string[] = [];

      for (const m of messages) {
        const timeStr = m.create_time ? new Date(Number(m.create_time)).toLocaleTimeString("zh-CN") : "未知时间";
        const sender = m.sender?.name || (m.sender?.sender_type === "user" ? `成员(${m.sender?.id?.slice(-4) || "某人"})` : "系统/机器人");
        let content = m.body?.content || "";
        try {
          const parsed = JSON.parse(content);
          content = parsed.text || parsed.title || JSON.stringify(parsed);
        } catch { /* ignore */ }
        lines.push(`[${timeStr}] ${sender}: ${content}`);
      }

      const fullTranscript = lines.join("\n") || "（未抓取到该单聊/群聊的历史消息文本）";
      const eventId = `evt_feishu_user_${chatId.slice(-8)}_${Date.now()}`;

      const ingestion = await runEventIngestionPipeline({
        eventId,
        type: "chat",
        title: `飞书对话(${chatId.startsWith("oc_") ? "群聊" : "P2P单聊"}): ${chatId.slice(-6)}`,
        content: fullTranscript,
        projectId,
        metadata: {
          chatType: chatId.startsWith("oc_") ? "group" : "private",
          feishuChatId: chatId,
          identityMode: "user",
          messageCount: messages.length,
        },
      });

      return NextResponse.json({
        success: true,
        mode: "user",
        sync: {
          eventId,
          chatId,
          messageCount: messages.length,
          extractedPeople: ingestion.extractedPeople,
          extractedPatterns: ingestion.extractedPatterns,
          actionItems: ingestion.actionItems,
          riskSignals: ingestion.riskSignals,
        },
      });
    }

    // 走 Bot 通道
    const result = await feishuClient.syncChatToHarnessEvents(chatId, projectId);
    return NextResponse.json({
      success: true,
      mode: "bot",
      sync: result,
    });
  } catch (error: unknown) {
    console.error("POST /api/feishu/sync error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to sync feishu chat" }, { status: 500 });
  }
}
