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
