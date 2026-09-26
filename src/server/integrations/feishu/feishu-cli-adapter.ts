/**
 * PANGBAI · 飞书 CLI 适配器 (Lark CLI Adapter)
 *
 * 封装对系统官方 lark-cli 的调用能力，支持双重身份模式：
 * 1. Bot 模式 (--as bot): 受 Bot 可见范围与加群状态约束 (tenant_access_token)
 * 2. User 模式 (--as user): 以授权最终用户身份运行 (user_access_token)
 *    突破性能力：支持读取本人参与的 P2P 单聊（私聊）、跨会话消息搜索 (+messages-search) 与个人可见群聊
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

export interface LarkCliMessage {
  create_time?: string;
  sender?: { name?: string; sender_type?: string; id?: string };
  body?: { content?: string };
  [key: string]: unknown;
}

export interface LarkCliChat {
  chat_id: string;
  name: string;
  chat_mode?: string; // "group" | "p2p" | "topic"
  chat_type?: string; // "private" | "public"
  description?: string;
  user_id?: string;
}

export interface LarkCliAuthStatus {
  profile: string;
  appId: string;
  brand: string;
  identity: "bot" | "user";
  hasUserToken: boolean;
  loggedInUsers: string[];
}

export class LarkCliAdapter {
  private cliPath: string;

  constructor() {
    this.cliPath =
      process.env.LARK_CLI_BIN ||
      "lark-cli";
  }

  /**
   * 执行底层 lark-cli 命令并解析 JSON
   */
  async runCommand(args: string[]): Promise<JsonRecord> {
    try {
      const { stdout } = await execFileAsync(this.cliPath, args, {
        env: {
          ...process.env,
          LARK_CLI_NO_PROXY: "1",
          NO_PROXY: "*",
        },
        timeout: 15000,
      });

      const trimmed = stdout.trim();
      try {
        return asRecord(JSON.parse(trimmed));
      } catch {
        return { raw: trimmed };
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown lark-cli error";
      console.warn("lark-cli execution error:", message);
      return { ok: false, error: message };
    }
  }

  /**
   * 获取当前飞书 CLI 鉴权状态（包括是否有用户 OAuth 登录）
   */
  async getAuthStatus(): Promise<LarkCliAuthStatus> {
    const whoami = await this.runCommand(["whoami"]);
    const listRes = await this.runCommand(["auth", "list"]);

    let loggedInUsers: string[] = [];
    if (Array.isArray(listRes.users)) {
      loggedInUsers = listRes.users.filter((user): user is string => typeof user === "string");
    } else if (typeof listRes.raw === "string" && !listRes.raw.includes("No logged-in users")) {
      loggedInUsers = listRes.raw.split("\n").filter(Boolean);
    }

    return {
      profile: typeof whoami.profile === "string" ? whoami.profile : "default",
      appId: typeof whoami.appId === "string" ? whoami.appId : "",
      brand: typeof whoami.brand === "string" ? whoami.brand : "feishu",
      identity: whoami.identity === "user" ? "user" : "bot",
      hasUserToken: loggedInUsers.length > 0 || whoami.identity === "user",
      loggedInUsers,
    };
  }

  /**
   * 列出会话列表（群聊与 P2P 单聊）
   *
   * @param options.as "user" (本人身份，可读 P2P 单聊) | "bot" (应用机器人身份)
   * @param options.types "p2p,group" (包含单聊与群聊) | "group" | "p2p"
   */
  async listChats(options: { as?: "user" | "bot"; types?: "p2p,group" | "group" | "p2p" } = {}): Promise<LarkCliChat[]> {
    const args = ["im", "+chat-list"];

    if (options.as === "user") {
      args.push("--as", "user");
      // user 身份下，默认包含 P2P 单聊和群聊
      args.push(`--types=${options.types || "p2p,group"}`);
    } else if (options.as === "bot") {
      args.push("--as", "bot");
    }

    const res = await this.runCommand(args);
    const data = asRecord(res.data);
    if (Array.isArray(data.items)) {
      return data.items.filter((item): item is LarkCliChat => !!item && typeof item === "object");
    }
    return [];
  }

  /**
   * 获取指定会话的历史消息列表
   *
   * @param chatId 聊天 ID (支持群聊 oc_xxx 或 P2P 单聊)
   * @param options.as "user" | "bot"
   * @param options.limit 抓取条数 (默认 30)
   */
  async getChatMessages(
    chatId: string,
    options: { as?: "user" | "bot"; limit?: number } = {}
  ): Promise<LarkCliMessage[]> {
    const args = [
      "im",
      "+chat-messages-list",
      "--chat-id",
      chatId,
      "--page-size",
      String(options.limit || 30),
    ];

    if (options.as === "user") {
      args.push("--as", "user");
    } else if (options.as === "bot") {
      args.push("--as", "bot");
    }

    const res = await this.runCommand(args);
    const data = asRecord(res.data);
    if (Array.isArray(data.items)) {
      return data.items.filter((item): item is LarkCliMessage => !!item && typeof item === "object");
    }
    return [];
  }

  /**
   * 跨会话搜索历史消息 (仅 user 身份可用)
   *
   * @param query 搜索关键词（如：排期、砍需求、技术方案）
   */
  async searchMessages(query: string, limit = 20): Promise<LarkCliMessage[]> {
    const args = [
      "im",
      "+messages-search",
      "--query",
      query,
      "--page-size",
      String(limit),
      "--as",
      "user",
    ];

    const res = await this.runCommand(args);
    const data = asRecord(res.data);
    if (Array.isArray(data.items)) {
      return data.items.filter((item): item is LarkCliMessage => !!item && typeof item === "object");
    }
    return [];
  }

  /**
   * 发起 User 身份 Device Flow 授权登录
   */
  async initiateUserLogin(domain = "im,contact,docs"): Promise<{
    verificationUri?: string;
    userCode?: string;
    deviceCode?: string;
    raw?: string;
  }> {
    const res = await this.runCommand([
      "auth",
      "login",
      "--domain",
      domain,
      "--no-wait",
      "--json",
    ]);

    return {
      verificationUri: typeof res.verification_uri === "string" ? res.verification_uri : typeof res.verification_url === "string" ? res.verification_url : undefined,
      userCode: typeof res.user_code === "string" ? res.user_code : undefined,
      deviceCode: typeof res.device_code === "string" ? res.device_code : undefined,
      raw: JSON.stringify(res),
    };
  }
}

export const larkCliAdapter = new LarkCliAdapter();
