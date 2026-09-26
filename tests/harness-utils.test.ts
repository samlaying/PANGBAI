import test from "node:test";
import assert from "node:assert/strict";
import { estimateTokens } from "../src/server/harness/tokens";
import { classifyRunOutcome } from "../src/server/harness/run-outcome";
import { createSseEmitter, sseChunk } from "../src/server/harness/sse-emitter";

// ---------------------------------------------------------------- tokens

test("estimateTokens counts CJK characters at ~1 token each", () => {
  assert.equal(estimateTokens("你好世界"), 4);
});

test("estimateTokens counts non-CJK text at ~4 chars per token", () => {
  assert.equal(estimateTokens("abcdefgh"), 2);
});

test("estimateTokens mixes CJK and non-CJK additively", () => {
  // 2 CJK (2 tokens) + 3 ASCII (ceil(3/4) = 1 token)
  assert.equal(estimateTokens("你好abc"), 3);
});

test("estimateTokens returns 0 for empty input", () => {
  assert.equal(estimateTokens(""), 0);
});

test("estimateTokens counts full-width punctuation as CJK", () => {
  assert.equal(estimateTokens("，。！"), 3);
});

// ----------------------------------------------------------- run-outcome

test("classifyRunOutcome reports aborted on client disconnect", () => {
  const outcome = classifyRunOutcome({ clientDisconnected: true, replyChars: 120 });
  assert.equal(outcome.status, "aborted");
  assert.equal(outcome.finishReason, "client_disconnect");
});

test("classifyRunOutcome reports failed on stream error", () => {
  const outcome = classifyRunOutcome({
    clientDisconnected: false,
    streamError: new Error("read failed"),
    replyChars: 40,
  });
  assert.equal(outcome.status, "failed");
  assert.equal(outcome.finishReason, "upstream_error");
  assert.equal(outcome.errorMessage, "read failed");
});

test("classifyRunOutcome reports failed on empty reply", () => {
  const outcome = classifyRunOutcome({ clientDisconnected: false, replyChars: 0 });
  assert.equal(outcome.status, "failed");
  assert.equal(outcome.finishReason, "empty_reply");
});

test("classifyRunOutcome reports degraded success when gate retry exhausted", () => {
  const outcome = classifyRunOutcome({
    clientDisconnected: false,
    replyChars: 500,
    gateRetryExhausted: true,
  });
  assert.equal(outcome.status, "success");
  assert.equal(outcome.finishReason, "gate_retry_exhausted");
});

test("classifyRunOutcome reports plain success otherwise", () => {
  const outcome = classifyRunOutcome({ clientDisconnected: false, replyChars: 500 });
  assert.deepEqual(outcome, { status: "success", finishReason: "stop" });
});

// ----------------------------------------------------------- sse-emitter

test("sseChunk formats event name and JSON data with blank-line terminator", () => {
  const chunk = sseChunk("run.started", { sessionId: "s1" });
  assert.equal(chunk, 'event: run.started\ndata: {"sessionId":"s1"}\n\n');
});

test("sse emitter swallows enqueue errors after close and reports closed", () => {
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
    },
  });
  const emitter = createSseEmitter(controller, new TextEncoder());

  assert.equal(emitter.closed, false);
  assert.equal(emitter.emit("run.started", { type: "run.started" }), true);

  controller.close();
  assert.equal(emitter.emit("message.delta", { delta: "x" }), false);
  assert.equal(emitter.closed, true);
  assert.equal(emitter.emit("run.finished", {}), false);

  void stream.cancel();
});
