import { NextRequest, NextResponse } from "next/server";
import { feishuClient } from "@/server/integrations/feishu/feishu-client";
import { larkCliAdapter, type LarkCliChat } from "@/server/integrations/feishu/feishu-cli-adapter";

export const runtime = "nodejs";

/**
 * GET /api/feishu/chats — 获取可访问的飞书会话列表 (支持群聊与 P2P 单聊)
 *
 * Query Parameters:
 * - as: "user" (以本人身份获取，包含 P2P 单聊与私聊) | "bot" (应用机器人加群模式，默认)
 * - types: "p2p,group" | "p2p" | "group" (仅在 as=user 时生效)
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const asMode = (url.searchParams.get("as") || "auto") as "user" | "bot" | "auto";
    const types = (url.searchParams.get("types") || "p2p,group") as "p2p,group" | "p2p" | "group";

    let chats: LarkCliChat[] = [];
    let effectiveMode: "user" | "bot" = "bot";

    const userToken = feishuClient.getUserAccessToken();
    const hasUser = !!userToken;

    if (asMode === "user" || (asMode === "auto" && hasUser)) {
      try {
        chats = await feishuClient.getChats({ as: "user" });
        effectiveMode = "user";
      } catch (err) {
        console.warn("feishuClient user chats failed, trying CLI:", err);
        chats = await larkCliAdapter.listChats({ as: "user", types });
        effectiveMode = "user";
      }
    } else {
      try {
        chats = await feishuClient.getChats({ as: "bot" });
        effectiveMode = "bot";
      } catch {
        chats = await larkCliAdapter.listChats({ as: "bot" });
        effectiveMode = "bot";
      }
    }

    return NextResponse.json({
      chats,
      count: chats.length,
      mode: effectiveMode,
      types: effectiveMode === "user" ? types : "group_only",
      note:
        effectiveMode === "user"
          ? `已成功以【用户本人身份】读取 ${chats.length} 个会话 (包含 P2P 私聊与群聊)`
          : `当前为【Bot 机器人模式】。若需读取本人 P2P 单聊与私聊记录，可执行 lark-cli auth login 登录用户身份。`,
    });
  } catch (error: unknown) {
    console.error("GET /api/feishu/chats error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch feishu chats" },
      { status: 500 }
    );
  }
}
