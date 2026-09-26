/**
 * PANGBAI · 飞书开放平台集成客户端 (Feishu Client)
 *
 * 核心特性：
 * 1. 自动维护 tenant_access_token 生命周期与缓存
 * 2. 具备直连 SNI 回退机制 (Direct SNI Fallback)：在本地开启 TUN/代理时自动保障直连飞书服务器
 * 3. 深度打通 Harness 事实反思管线：获取飞书群聊记录后一键流入 runEventIngestionPipeline
 */

import * as https from "node:https";
import { runEventIngestionPipeline } from "@/server/harness/event-ingestion-worker";

export interface FeishuChat {
  chat_id: string;
  name: string;
  description?: string;
  avatar?: string;
  chat_mode: string;
  chat_type: string;
  owner_id?: string;
}

export interface FeishuMessageItem {
  message_id: string;
  chat_id: string;
  sender: {
    id: string;
    id_type: string;
    sender_type: string;
  };
  msg_type: string;
  body: {
    content: string; // JSON string
  };
  create_time: string;
  update_time: string;
}

export interface FeishuSyncResult {
  eventId: string;
  chatId: string;
  chatName: string;
  messageCount: number;
  extractedPeople: Array<{ id: string; name: string; isNew: boolean }>;
  extractedPatterns: Array<{ personId: string; pattern: string; confidence: number }>;
  actionItems: Array<{ task: string; owner?: string }>;
  riskSignals: string[];
}

// 飞书开放平台备用直连公网 IP (用于绕过部分本地 TUN 代理重置)
const FEISHU_DIRECT_IPS = ["71.18.1.161", "71.18.1.162", "71.18.1.163"];

class FeishuClient {
  private appId: string;
  private appSecret: string;
  private cachedToken: string | null = null;
  private tokenExpiresAt = 0;

  constructor() {
    this.appId = process.env.FEISHU_APP_ID || "";
    this.appSecret = process.env.FEISHU_APP_SECRET || "";
  }

  /**
   * 底层 HTTPS 请求封装（具备代理自适应与 SNI 直连回退）
   */
  private async requestDirect<T>(options: {
    path: string;
    method?: string;
    headers?: Record<string, string>;
    body?: unknown;
  }): Promise<T> {
    const method = options.method || "GET";
    const bodyStr = options.body ? JSON.stringify(options.body) : undefined;

    // 先尝试标准 fetch
    try {
      const res = await fetch(`https://open.feishu.cn${options.path}`, {
        method,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          ...options.headers,
        },
        body: bodyStr,
      });
      if (res.ok) {
        return (await res.json()) as T;
      }
    } catch {
      // 标准 fetch 失败（常见于本地 TUN / Clash 拦截），平滑降级走底层 SNI 直连通道
    }

    // 降级使用 Node.js https.request 绑定直连 IP 与 SNI
    return new Promise<T>((resolve, reject) => {
      const ip = FEISHU_DIRECT_IPS[0];
      const req = https.request(
        {
          host: ip,
          port: 443,
          path: options.path,
          method,
          servername: "open.feishu.cn",
          headers: {
            Host: "open.feishu.cn",
            "Content-Type": "application/json; charset=utf-8",
            ...options.headers,
          },
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            try {
              const parsed = JSON.parse(data);
              resolve(parsed as T);
            } catch {
              reject(new Error(`Feishu invalid JSON response: ${data.slice(0, 100)}`));
            }
          });
        }
      );

      req.on("error", (err) => reject(err));
      if (bodyStr) req.write(bodyStr);
      req.end();
    });
  }

  /**
   * 获取或复用 tenant_access_token
   */
  async getTenantAccessToken(): Promise<string> {
    if (!this.appId || !this.appSecret) {
      throw new Error("FEISHU_APP_ID and FEISHU_APP_SECRET are required for Feishu integration");
    }
    const now = Date.now();
    if (this.cachedToken && this.tokenExpiresAt > now + 60000) {
      return this.cachedToken;
    }

    const res = await this.requestDirect<{
      code: number;
      msg: string;
      tenant_access_token: string;
      expire: number;
    }>({
      path: "/open-apis/auth/v3/tenant_access_token/internal",
      method: "POST",
      body: {
        app_id: this.appId,
        app_secret: this.appSecret,
      },
    });

    if (res.code !== 0 || !res.tenant_access_token) {
      throw new Error(`Failed to get Feishu token: ${res.msg} (code: ${res.code})`);
    }

    this.cachedToken = res.tenant_access_token;
    this.tokenExpiresAt = now + (res.expire - 300) * 1000;
    return this.cachedToken;
  }

  /**
   * 获取本地缓存的用户级 OAuth access_token (若已授权)
   */
  getUserAccessToken(): string | null {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require("node:fs");
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const path = require("node:path");
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const os = require("node:os");
      const tokenPath = path.join(os.homedir(), ".pangbai", "feishu_user_token.json");
      if (fs.existsSync(tokenPath)) {
        const raw = JSON.parse(fs.readFileSync(tokenPath, "utf-8"));
        return raw.user_access_token || null;
      }
    } catch {
      // ignore
    }
    return null;
  }

  /**
   * 获取群聊或单聊列表 (支持 bot 身份或 user 本人身份)
   */
  async getChats(options: { as?: "user" | "bot"; pageSize?: number } = {}): Promise<FeishuChat[]> {
    const userToken = this.getUserAccessToken();
    const useUser = options.as === "user" || (options.as !== "bot" && !!userToken);

    const token = useUser && userToken ? userToken : await this.getTenantAccessToken();
    const pageSize = options.pageSize || 30;

    const res = await this.requestDirect<{
      code: number;
      msg: string;
      data?: {
        items?: FeishuChat[];
        has_more?: boolean;
        page_token?: string;
      };
    }>({
      path: `/open-apis/im/v1/chats?page_size=${pageSize}`,
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.code !== 0) {
      throw new Error(`Feishu getChats error: ${res.msg} (code: ${res.code})`);
    }

    return res.data?.items || [];
  }

  /**
   * 获取指定会话的历史消息记录
   */
  async getChatMessages(chatId: string, pageSize = 30): Promise<FeishuMessageItem[]> {
    const userToken = this.getUserAccessToken();
    const token = userToken || (await this.getTenantAccessToken());
    const res = await this.requestDirect<{
      code: number;
      msg: string;
      data?: {
        items?: FeishuMessageItem[];
        has_more?: boolean;
      };
    }>({
      path: `/open-apis/im/v1/messages?container_id_type=chat&container_id=${encodeURIComponent(chatId)}&page_size=${pageSize}`,
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.code !== 0) {
      throw new Error(`Feishu getChatMessages error: ${res.msg} (code: ${res.code})`);
    }

    return res.data?.items || [];
  }

  /**
   * 将飞书原始消息文本提取为易读文本
   */
  private parseMessageContent(msg: FeishuMessageItem): string {
    try {
      const parsed = JSON.parse(msg.body.content);
      if (typeof parsed.text === "string") {
        return parsed.text;
      }
      if (parsed.title) {
        return `[富文本: ${parsed.title}]`;
      }
      return JSON.stringify(parsed);
    } catch {
      return msg.body.content || "[未知消息格式]";
    }
  }

  /**
   * 核心功能：抓取飞书群聊消息并直接输入 Harness 事实反思管线
   */
  async syncChatToHarnessEvents(chatId: string, projectId?: string): Promise<FeishuSyncResult> {
    const [chats, messages] = await Promise.all([
      this.getChats(),
      this.getChatMessages(chatId, 50),
    ]);

    const targetChat = chats.find((c) => c.chat_id === chatId);
    const chatName = targetChat?.name || "飞书群聊讨论";

    // 格式化对话时间线
    const lines: string[] = [];
    for (const m of messages) {
      const timeStr = m.create_time ? new Date(Number(m.create_time)).toLocaleTimeString("zh-CN") : "未知时间";
      const senderName = m.sender.sender_type === "user" ? `成员(${m.sender.id.slice(-4)})` : "机器人";
      const content = this.parseMessageContent(m);
      lines.push(`[${timeStr}] ${senderName}: ${content}`);
    }

    const fullTranscript = lines.join("\n") || "（未抓取到群聊历史文本消息）";
    const eventId = `evt_feishu_${chatId.slice(-8)}_${Date.now()}`;
    const metadata = {
      chatType: (chatId.startsWith("oc_") ? "group" : "private") as "group" | "private",
      feishuChatId: chatId,
      chatName,
      messageCount: messages.length,
    };

    // 1. 持久化至 events 数据库表
    const { db } = await import("@/db/client");
    const { events } = await import("@/db/schema");
    await db.insert(events).values({
      id: eventId,
      type: "chat",
      title: `飞书对话: ${chatName}`,
      content: fullTranscript,
      projectId: projectId || null,
      metadataJson: JSON.stringify(metadata),
    });

    // 2. 触发 Harness 事实录入反思管线
    const ingestion = await runEventIngestionPipeline({
      eventId,
      type: "chat",
      title: `飞书对话: ${chatName}`,
      content: fullTranscript,
      projectId,
      metadata,
    });

    return {
      eventId,
      chatId,
      chatName,
      messageCount: messages.length,
      extractedPeople: ingestion.extractedPeople,
      extractedPatterns: ingestion.extractedPatterns,
      actionItems: ingestion.actionItems,
      riskSignals: ingestion.riskSignals,
    };
  }
}

export const feishuClient = new FeishuClient();
