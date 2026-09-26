import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

type FetchMock = (url: unknown, init?: RequestInit) => Promise<Response>;

interface UpstreamMockOptions {
  /** 输出完事件后保持挂起（不 close），用于模拟客户端中断场景 */
  hangAfter?: boolean;
  /** 输出完事件后让上游流出错 */
  errorAfter?: Error;
}

/**
 * 构造 SiliconFlow 风格的 SSE 上游 mock；关键点：
 * 1. 把 fetch 的 AbortSignal 接线到流错误上，模拟真实 fetch 被 abort 后
 *    reader.read() 抛错的行为；
 * 2. 用 pull 模型投递数据，保证 errorAfter 的错误发生在已产出数据被
 *    消费之后（error() 会清空未消费队列）。
 */
function sseUpstream(events: string[], opts: UpstreamMockOptions = {}): FetchMock {
  return async (_url: unknown, init?: RequestInit) => {
    const encoder = new TextEncoder();
    let idx = 0;
    return new Response(
      new ReadableStream<Uint8Array>({
        start(controller) {
          init?.signal?.addEventListener("abort", () => {
            controller.error(init.signal?.reason ?? new Error("aborted"));
          });
        },
        pull(controller) {
          if (idx < events.length) {
            controller.enqueue(encoder.encode(events[idx++]));
            return;
          }
          if (opts.errorAfter) {
            controller.error(opts.errorAfter);
          } else if (!opts.hangAfter) {
            controller.close();
          }
          // hangAfter：既不 close 也不 error，read() 保持挂起直到 abort
        },
      }),
    );
  };
}

interface StreamEvent {
  type: string;
  status?: string;
  finishReason?: string;
  code?: string;
  delta?: string;
  usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number };
}

interface ChatRunResult {
  response: Response;
  streamText: string;
  events: StreamEvent[];
  sessionId: string;
}

async function runChat(fetchMock: FetchMock, userText = "你好"): Promise<ChatRunResult> {
  const previousFetch = globalThis.fetch;
  const previousKey = process.env.SILICONFLOW_API_KEY;
  process.env.SILICONFLOW_API_KEY = "test-key";
  globalThis.fetch = fetchMock as typeof fetch;
  const sessionId = `sess_ts_${randomUUID().slice(0, 8)}`;
  try {
    const { POST } = await import("../src/app/api/chat/route");
    const response = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          messages: [{ role: "user", content: userText }],
        }),
      }) as never,
    );
    assert.equal(response.status, 200);
    const streamText = await response.text();
    const events = streamText
      .split("\n\n")
      .filter(Boolean)
      .map((block) => JSON.parse(block.match(/^data: (.+)$/m)?.[1] || "{}") as StreamEvent);
    return { response, streamText, events, sessionId };
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.SILICONFLOW_API_KEY;
    else process.env.SILICONFLOW_API_KEY = previousKey;
  }
}

async function loadTrace(sessionId: string) {
  const { db } = await import("../src/db/client");
  const { llmCallTraces } = await import("../src/db/schema");
  const { eq } = await import("drizzle-orm");
  const rows = await db.select().from(llmCallTraces).where(eq(llmCallTraces.sessionId, sessionId));
  return rows;
}

async function loadAssistantText(sessionId: string): Promise<string> {
  const { db } = await import("../src/db/client");
  const { messages } = await import("../src/db/schema");
  const { and, eq } = await import("drizzle-orm");
  const rows = await db
    .select()
    .from(messages)
    .where(and(eq(messages.sessionId, sessionId), eq(messages.role, "assistant")));
  const parts = rows[0]?.partsJson ? (JSON.parse(rows[0].partsJson) as Array<{ type: string; text?: string }>) : [];
  return parts[0]?.text ?? "";
}

test("successful stream settles run.finished as success/stop with estimated usage", async () => {
  const { events, sessionId } = await runChat(
    sseUpstream(['data: {"choices":[{"delta":{"content":"你好，我是旁白。"}}]}\n\n', "data: [DONE]\n\n"]),
  );

  const finished = events.find((e) => e.type === "run.finished");
  assert.ok(finished, "run.finished must be emitted");
  assert.equal(finished.status, "success");
  assert.equal(finished.finishReason, "stop");
  assert.equal(events.some((e) => e.type === "run.error"), false);
  assert.ok((finished.usage?.totalTokens ?? 0) > 0);

  const traceRows = await loadTrace(sessionId);
  assert.equal(traceRows.length, 1);
  assert.equal(traceRows[0].status, "success");
});

test("empty upstream reply classifies failed/empty_reply and emits run.error before run.finished", async () => {
  const { events, sessionId } = await runChat(sseUpstream(["data: [DONE]\n\n"]));

  const errorIdx = events.findIndex((e) => e.type === "run.error");
  const finishedIdx = events.findIndex((e) => e.type === "run.finished");
  assert.ok(errorIdx !== -1, "run.error must be emitted");
  assert.ok(finishedIdx !== -1, "run.finished must be emitted");
  assert.ok(errorIdx < finishedIdx, "run.error must precede run.finished");
  assert.equal(events[errorIdx].code, "EMPTY_REPLY");

  const finished = events[finishedIdx];
  assert.equal(finished.status, "failed");
  assert.equal(finished.finishReason, "empty_reply");

  const traceRows = await loadTrace(sessionId);
  assert.equal(traceRows[0].status, "failed");
  // 失败回合不应推流任何记忆候选
  assert.equal(events.some((e) => e.type === "memory.candidate"), false);
});

test("mid-stream upstream error persists partial reply and a failed trace", async () => {
  const { events, sessionId } = await runChat(
    sseUpstream(['data: {"choices":[{"delta":{"content":"部分输出"}}]}\n\n'], {
      errorAfter: new Error("upstream exploded"),
    }),
  );

  const errorEvent = events.find((e) => e.type === "run.error");
  assert.ok(errorEvent);
  assert.equal(errorEvent.code, "UPSTREAM_READ");
  const finished = events.find((e) => e.type === "run.finished");
  assert.ok(finished);
  assert.equal(finished.status, "failed");
  assert.equal(finished.finishReason, "upstream_error");

  const assistantText = await loadAssistantText(sessionId);
  assert.equal(assistantText, "部分输出");

  const traceRows = await loadTrace(sessionId);
  assert.equal(traceRows[0].status, "failed");
  assert.match(traceRows[0].metadataJson ?? "", /upstream_error/);
});

test("final usage chunk with empty choices populates usage and is not parsed as a delta", async () => {
  const { events } = await runChat(
    sseUpstream([
      'data: {"choices":[{"delta":{"content":"Hi"}}]}\n\n',
      'data: {"choices":[],"usage":{"prompt_tokens":11,"completion_tokens":7,"total_tokens":18}}\n\n',
      "data: [DONE]\n\n",
    ]),
  );

  const deltas = events.filter((e) => e.type === "message.delta");
  assert.equal(deltas.length, 1);
  assert.equal(deltas[0].delta, "Hi");

  const finished = events.find((e) => e.type === "run.finished");
  assert.ok(finished);
  assert.deepEqual(finished.usage, { promptTokens: 11, completionTokens: 7, totalTokens: 18 });
});

test("client disconnect writes an aborted trace without memory candidates", async () => {
  const previousFetch = globalThis.fetch;
  const previousKey = process.env.SILICONFLOW_API_KEY;
  process.env.SILICONFLOW_API_KEY = "test-key";
  const sessionId = `sess_ts_${randomUUID().slice(0, 8)}`;
  // 上游输出一个 delta 后挂起，直到 fetch signal abort 才出错
  globalThis.fetch = sseUpstream(
    ['data: {"choices":[{"delta":{"content":"开始"}}]}\n\n'],
    { hangAfter: true },
  ) as typeof fetch;

  try {
    const { POST } = await import("../src/app/api/chat/route");
    const response = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          messages: [{ role: "user", content: "你好" }],
        }),
      }) as never,
    );
    assert.equal(response.status, 200);
    assert.ok(response.body);

    const reader = response.body.getReader();
    const firstChunk = await reader.read();
    assert.ok(!firstChunk.done, "run.started / first delta should arrive");

    // 客户端中断：触发流 cancel() → disconnect.abort() → 上游 reader 抛错
    await reader.cancel();

    // start() 异步继续结算；轮询等待 trace 落库
    const deadline = Date.now() + 8000;
    let traceRows: Awaited<ReturnType<typeof loadTrace>> = [];
    while (Date.now() < deadline) {
      traceRows = await loadTrace(sessionId);
      if (traceRows.length > 0) break;
      await new Promise((r) => setTimeout(r, 50));
    }
    assert.equal(traceRows.length, 1, "aborted trace must still be persisted");
    assert.equal(traceRows[0].status, "aborted");
    assert.match(traceRows[0].metadataJson ?? "", /client_disconnect/);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.SILICONFLOW_API_KEY;
    else process.env.SILICONFLOW_API_KEY = previousKey;
  }
});
