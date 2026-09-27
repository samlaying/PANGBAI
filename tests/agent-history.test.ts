import test from "node:test";
import assert from "node:assert/strict";
import { AgentSession } from "../src/business/entities/agent-session";
import type { AgentMessage } from "../src/business/entities/message-part";

test("send() includes real truncated assistant text in history instead of a fixed placeholder", async () => {
  const session = new AgentSession("sess_history_1", "历史真实化测试");

  const userMsg: AgentMessage = {
    id: "hist_u1",
    role: "user",
    timestamp: "刚刚",
    parts: [{ type: "text", text: "第一次提问：如何向上汇报" }],
  };
  const assistantMsg: AgentMessage = {
    id: "hist_a1",
    role: "assistant",
    timestamp: "刚刚",
    parts: [{ type: "text", text: "结论先行。".repeat(180) }], // ~900 字
  };
  session.messages.push(userMsg, assistantMsg);

  const originalFetch = globalThis.fetch;
  let capturedMessages: Array<{ role: string; content: string }> = [];
  globalThis.fetch = async (url: unknown, init?: RequestInit) => {
    if (String(url).includes("/api/chat")) {
      const body = JSON.parse((init?.body as string) ?? "{}") as { messages?: Array<{ role: string; content: string }> };
      capturedMessages = body.messages ?? [];
    }
    // 非 SSE 空响应：客户端走 plain-text fallback，send() 正常收尾
    return new Response("{}", { headers: { "Content-Type": "application/json" } });
  };

  try {
    await session.send("第二次提问");
  } finally {
    globalThis.fetch = originalFetch;
  }

  const assistantHistory = capturedMessages.filter((m) => m.role === "assistant");
  assert.equal(assistantHistory.length, 1, "prior assistant turn must be sent as history");
  const content = assistantHistory[0].content;
  assert.doesNotMatch(content, /已提供建议/, "fixed placeholder must be gone");
  assert.match(content, /结论先行。/);
  assert.ok(content.length <= 530, `assistant history must be truncated (~500 chars), got ${content.length}`);
  assert.match(content, /该轮后文已省略/);
  // 当前用户输入在末尾原样发送
  assert.equal(capturedMessages[capturedMessages.length - 1].content, "第二次提问");
});

test("send() falls back to an honest marker when an assistant turn has no text", async () => {
  const session = new AgentSession("sess_history_2", "空正文测试");
  session.messages.push(
    { id: "hist2_u1", role: "user", timestamp: "刚刚", parts: [{ type: "text", text: "画个图" }] },
    {
      id: "hist2_a1",
      role: "assistant",
      timestamp: "刚刚",
      parts: [{ type: "generative_ui", component: "timeline_chart", props: {} }],
    },
  );

  const originalFetch = globalThis.fetch;
  let capturedMessages: Array<{ role: string; content: string }> = [];
  globalThis.fetch = async (url: unknown, init?: RequestInit) => {
    if (String(url).includes("/api/chat")) {
      const body = JSON.parse((init?.body as string) ?? "{}") as { messages?: Array<{ role: string; content: string }> };
      capturedMessages = body.messages ?? [];
    }
    return new Response("{}", { headers: { "Content-Type": "application/json" } });
  };

  try {
    await session.send("继续");
  } finally {
    globalThis.fetch = originalFetch;
  }

  const assistantHistory = capturedMessages.filter((m) => m.role === "assistant");
  assert.equal(assistantHistory[0].content, "（该轮无正文）");
});
