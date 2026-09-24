import test from "node:test";
import assert from "node:assert/strict";
import { parseMarkdownToBlocksAndParts } from "../src/business/parser/block-parser";
import { AgentBus } from "../src/business/bus/agent-bus";
import { AgentSession } from "../src/business/entities/agent-session";
import type { AgentMessage, MessagePart } from "../src/business/entities/message-part";

test("parseMarkdownToBlocksAndParts parses YAML frontmatter into artifact suggestion", () => {
  const content = `---
title: "用户画像分析方案.md"
type: "prd"
expected_solution: "建立统一标签体系"
---
# 用户画像分析方案
正文内容...`;

  let detectedTitle = "";
  const result = parseMarkdownToBlocksAndParts(content, (title) => {
    detectedTitle = title;
  });

  assert.equal(detectedTitle, "用户画像分析方案.md");
  assert.equal(result.parts.length, 2);
  assert.equal(result.parts[0].type, "text");
  if (result.parts[0].type === "text") {
    assert.equal(result.parts[0].dropcap, true);
  }
  assert.equal(result.parts[1].type, "artifact");
  if (result.parts[1].type === "artifact") {
    assert.equal(result.parts[1].title, "用户画像分析方案.md");
    assert.equal(result.parts[1].artifactType, "prd");
  }
});

test("parseMarkdownToBlocksAndParts parses blockquote as suggested reply quote", () => {
  const content = `你好，我是旁白。\n\n> 领导，关于上次提到的重构，方案已经准备好了。\n\n你可以参考上面这版回复。`;
  const result = parseMarkdownToBlocksAndParts(content);

  const quotePart = result.parts.find((p) => p.type === "text" && p.isQuote);
  assert.ok(quotePart && quotePart.type === "text");
  assert.equal(quotePart.text, "领导，关于上次提到的重构，方案已经准备好了。");
});

test("AgentBus dispatches events and handles unsubscribe", () => {
  const bus = new AgentBus();
  let receivedCount = 0;

  const unsubscribe = bus.on("session_changed", (data) => {
    if (data.sessionId === "test_session") {
      receivedCount++;
    }
  });

  bus.dispatch("session_changed", {
    sessionId: "test_session",
    action: "message_added",
  });
  assert.equal(receivedCount, 1);

  unsubscribe();
  bus.dispatch("session_changed", {
    sessionId: "test_session",
    action: "message_added",
  });
  assert.equal(receivedCount, 1);
});

test("AgentSession processes stream events into structured parts", () => {
  const session = new AgentSession("test_id", "测试会话");

  const assistantMsg: AgentMessage = {
    id: "msg_1",
    role: "assistant",
    timestamp: "刚刚",
    parts: [],
  };
  session.messages.push(assistantMsg);

  // 1. 推送文本增量
  (session as unknown as { handleAgentEvent: (msg: AgentMessage, event: unknown) => void }).handleAgentEvent(
    assistantMsg,
    {
      type: "message.delta",
      delta: "旁白正在分析当前情况...",
    },
  );

  assert.equal(assistantMsg.parts.length, 1);
  const firstPart = assistantMsg.parts[0];
  assert.equal(firstPart.type, "text");
  if (firstPart.type === "text") {
    assert.equal(firstPart.text, "旁白正在分析当前情况...");
  }

  // 2. 推送工具调用事件
  (session as unknown as { handleAgentEvent: (msg: AgentMessage, event: unknown) => void }).handleAgentEvent(
    assistantMsg,
    {
      type: "tool.started",
      toolCallId: "tool_search_1",
      toolName: "search_people",
      input: { query: "张总" },
    },
  );

  assert.equal(assistantMsg.parts.length, 2);
  const toolPart = assistantMsg.parts.find((p): p is Extract<MessagePart, { type: "tool" }> => p.type === "tool");
  assert.ok(toolPart);
  assert.equal(toolPart.name, "search_people");
  assert.equal(toolPart.status, "running");

  // 3. 推送工具完成事件
  (session as unknown as { handleAgentEvent: (msg: AgentMessage, event: unknown) => void }).handleAgentEvent(
    assistantMsg,
    {
      type: "tool.result",
      toolCallId: "tool_search_1",
      output: { found: 1 },
      status: "success",
    },
  );

  assert.equal(toolPart.status, "done");
});

test("parseMarkdownToBlocksAndParts unwraps outer markdown code block and preserves divider lines without false artifact detection", () => {
  const content = `\`\`\`markdown
---
复盘需求结构提示:
1. 场景性质: [日常沟通]
2. 相关人员: [王总]
---
需要您补充的关键细节：
• 冲突发生的前置背景
• 对方的决策权限范围
\`\`\``;

  const result = parseMarkdownToBlocksAndParts(content);

  // 不应误判为 artifact
  assert.equal(result.artifactDoc, undefined);
  assert.ok(result.parts.length > 0);
  // 必须成功解开外层代码围栏
  const textParts = result.parts.filter((p) => p.type === "text");
  assert.ok(textParts.length > 0);
  const combined = textParts.map((p) => (p.type === "text" ? p.text : "")).join("\n");
  assert.doesNotMatch(combined, /```markdown/);
  assert.match(combined, /复盘需求结构提示/);
  assert.match(combined, /需要您补充的关键细节/);
});

test("parseMarkdownToBlocksAndParts normalizes stuck dividers and headings like ---### into separate blocks", () => {
  const stuckContent = `我会从三个维度帮你拆解：---### 一、破局策略预判\n1. 针对资源被砍风险:\n• 提前准备两版方案"2. 针对延期质疑:\n• 主动暴露风险赶工）---### 二、分角色发言提纲`;

  const result = parseMarkdownToBlocksAndParts(stuckContent);
  const textParts = result.parts.filter((p) => p.type === "text");
  const combined = textParts.map((p) => (p.type === "text" ? p.text : "")).join("\n");

  assert.doesNotMatch(combined, /---###/);
  assert.match(combined, /### 一、破局策略预判/);
  assert.match(combined, /### 二、分角色发言提纲/);
  assert.match(combined, /2\. 针对延期质疑/);
});

test("parseMarkdownToBlocksAndParts preserves bold numbered lists and does not tear ** into orphan lines", () => {
  const content = `好的，给您的核心建议如下：
**1. 关键问题定位**
对方的核心顾虑在于资源投入产出比。
**2. 立即行动建议**
先提供最小可行范围。
**3. 长期策略**
建立定期对齐机制。`;

  const result = parseMarkdownToBlocksAndParts(content);
  const textParts = result.parts.filter((p) => p.type === "text");
  const combined = textParts.map((p) => (p.type === "text" ? p.text : "")).join("\n");

  // 不应产生单独成行的孤立星号
  assert.doesNotMatch(combined, /^\*{1,2}$/m);
  // 应完整保留 **1. 关键问题定位** 的加粗数字序号
  assert.match(combined, /\*\*1\.\s*关键问题定位\*\*/);
  assert.match(combined, /\*\*2\.\s*立即行动建议\*\*/);
  assert.match(combined, /\*\*3\.\s*长期策略\*\*/);
});

test("sseTransport streams plain text chunks preserving all newlines and spaces", async () => {
  const { SSETransport } = await import("../src/infra/transport/sse-transport");
  const transport = new SSETransport();

  const originalFetch = globalThis.fetch;
  const rawTextChunks = [
    "拆解：\n\n",
    "---\n\n",
    "### 一、破局策略预判\n\n",
    "1. 针对资源被砍风险:\n",
    "• 准备方案\n",
  ];

  let chunkIdx = 0;
  globalThis.fetch = async () =>
    new Response(
      new ReadableStream({
        pull(controller) {
          if (chunkIdx < rawTextChunks.length) {
            controller.enqueue(new TextEncoder().encode(rawTextChunks[chunkIdx++]));
          } else {
            controller.close();
          }
        },
      }),
      {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      },
    );

  let accumulated = "";
  try {
    await transport.stream("/api/test", {}, (event) => {
      if (event.type === "message.delta") {
        accumulated += event.delta;
      }
    });

    assert.equal(accumulated, rawTextChunks.join(""));
    assert.match(accumulated, /拆解：\n\n---\n\n### 一、破局策略预判/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

