import { NextRequest, NextResponse } from "next/server";
import { larkCliAdapter } from "@/server/integrations/feishu/feishu-cli-adapter";

export const runtime = "nodejs";

/**
 * GET /api/feishu/auth — 查询飞书鉴权状态 (Bot 与 User OAuth 状态)
 */
export async function GET() {
  try {
    const status = await larkCliAdapter.getAuthStatus();
    return NextResponse.json({
      success: true,
      status,
      summary: {
        botReady: true,
        userReady: status.hasUserToken,
        mode: status.hasUserToken
          ? "已激活【User 本人身份模式】(可读取本人 P2P 单聊、私聊与跨聊天搜索)"
          : "当前为【Bot 机器人模式】(受 Bot 加群限制；可发起 OAuth 登录升级为本人身份)",
      },
    });
  } catch (error: unknown) {
    console.error("GET /api/feishu/auth error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to get feishu auth status" }, { status: 500 });
  }
}

/**
 * POST /api/feishu/auth — 发起 User 身份 Device Flow 授权登录
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const domain = typeof body.domain === "string" ? body.domain : "im,contact,docs";

    const loginRes = await larkCliAdapter.initiateUserLogin(domain);

    return NextResponse.json({
      success: true,
      login: loginRes,
      instructions: "请在终端或点击链接完成飞书 OAuth 最终用户身份授权，授权成功后旁白将能直接读取您的 P2P 单聊与私聊历史。",
    });
  } catch (error: unknown) {
    console.error("POST /api/feishu/auth error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to initiate feishu auth" }, { status: 500 });
  }
}
