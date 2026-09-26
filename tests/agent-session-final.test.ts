import test from "node:test";
import assert from "node:assert/strict";
import { AgentSession } from "../src/business/entities/agent-session";
import { agentBus } from "../src/business/bus/agent-bus";
import type { AgentMessage } from "../src/business/entities/message-part";

type HandleAgentEvent = (msg: AgentMessage, event: unknown) => void;

function makeSessionWithMessage(): { session: AgentSession; msg: AgentMessage } {
  const session = new AgentSession("test_final", "终稿同步测试");
  const msg: AgentMessage = {
    id: "msg_final_1",
    role: "assistant",
    timestamp: "刚刚",
    parts: [],
  };
  session.messages.push(msg);
  return { session, msg };
}

function asHandler(session: AgentSession): HandleAgentEvent {
  const holder = session as unknown as { handleAgentEvent: HandleAgentEvent };
  return (msg, event) => holder.handleAgentEvent(msg, event);
}

test("message.final replaces delta-accumulated text with the gated authoritative text", () => {
  const { session, msg } = makeSessionWithMessage();
  const handle = asHandler(session);

  handle(msg, { type: "message.delta", delta: "这是未门禁的原始开头，" });
  handle(msg, { type: "message.delta", delta: "包含一段开场白文本。" });

  const gated = `---
title: "落地方案.md"
type: "prd"
---
# 落地方案
正文内容`;
  handle(msg, { type: "message.final", text: gated });

  const textParts = msg.parts.filter((p) => p.type === "text");
  const combined = textParts.map((p) => (p.type === "text" ? p.text : "")).join("\n");
  assert.doesNotMatch(combined, /未门禁的原始开头/);
  // 终稿含 frontmatter 时应解析出 artifact part，且正文进入 artifact 而非残留旧文本
  const artifactPart = msg.parts.find((p) => p.type === "artifact");
  assert.ok(artifactPart && artifactPart.type === "artifact");
  assert.match(artifactPart.title, /落地方案/);
});

test("message.final with identical artifact does not dispatch a second canvas_open_requested", () => {
  const { session, msg } = makeSessionWithMessage();
  const handle = asHandler(session);

  let canvasOpens = 0;
  const unsubscribe = agentBus.on("canvas_open_requested", () => {
    canvasOpens++;
  });

  try {
    const docContent = `---
title: "方案.md"
type: "prd"
---
正文`;

    // 流式累积解析设置 pendingArtifactDoc，flush 派发第一次
    handle(msg, { type: "message.delta", delta: docContent });
    (session as unknown as { flushPendingArtifactDoc: () => void }).flushPendingArtifactDoc();
    assert.equal(canvasOpens, 1);

    // message.final 携带相同内容 → 重解析再次设置 pendingArtifactDoc，flush 应去重
    handle(msg, { type: "message.final", text: docContent });
    (session as unknown as { flushPendingArtifactDoc: () => void }).flushPendingArtifactDoc();
    assert.equal(canvasOpens, 1);

    // 内容真正变化（门禁改写）时仍应派发
    handle(msg, { type: "message.final", text: docContent + "\n补充结论" });
    (session as unknown as { flushPendingArtifactDoc: () => void }).flushPendingArtifactDoc();
    assert.equal(canvasOpens, 2);
  } finally {
    unsubscribe();
  }
});

test("run.error appends a visible error part with code", () => {
  const { session, msg } = makeSessionWithMessage();
  const handle = asHandler(session);

  handle(msg, { type: "message.delta", delta: "已流出的部分内容" });
  handle(msg, { type: "run.error", error: "上游连接中断", code: "UPSTREAM_READ" });

  const errorPart = msg.parts.find(
    (p) => p.type === "text" && p.text.includes("上游连接中断"),
  );
  assert.ok(errorPart && errorPart.type === "text");
  assert.match(errorPart.text, /UPSTREAM_READ/);
});

test("run.finished stores server-adjudicated status and finishReason on the message", () => {
  const { session, msg } = makeSessionWithMessage();
  const handle = asHandler(session);

  handle(msg, {
    type: "run.finished",
    status: "failed",
    finishReason: "empty_reply",
    usage: { totalTokens: 10 },
  });

  assert.equal(msg.runStatus, "failed");
  assert.equal(msg.finishReason, "empty_reply");
  assert.equal(msg.usage?.totalTokens, 10);
});
