import { NextRequest } from "next/server";
import { assembleCoachContext } from "@/server/agent/context-assembler";
import { db } from "@/db/client";
import { sessions, messages as messagesTable, llmCallTraces, personModels, evidence } from "@/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  let ttftMs: number | null = null;
  let fullReply = "";

  try {
    const { messages, activeCanvas, activeProject, projectId, sessionId, sessionTitle, profile } = await req.json();

    const targetProjectId = projectId || activeProject?.id;
    const currentSessionId = sessionId || randomUUID();

    // 动态从数据库、当前工作区及用户画像组装权威 System Prompt
    const systemPrompt = await assembleCoachContext({
      projectId: targetProjectId,
      activeCanvas,
      profile,
    });

    const apiKey = process.env.SILICONFLOW_API_KEY;
    if (!apiKey) return new Response(JSON.stringify({ error: "Chat service is not configured" }), { status: 503, headers: { "Content-Type": "application/json" } });
    const baseUrl =
      process.env.SILICONFLOW_BASE_URL || "https://api.siliconflow.cn/v1";
    const model = process.env.DEFAULT_MODEL || "deepseek-ai/DeepSeek-V3";

    const payload = {
      model,
      messages: [
        { role: "system", content: systemPrompt },
        ...(messages || []),
      ],
      stream: true,
      temperature: 0.6,
    };

    const upstreamRes = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!upstreamRes.ok || !upstreamRes.body) {
      const errText = await upstreamRes.text().catch(() => "");
      console.error("SiliconFlow API Error:", upstreamRes.status, errText);
      return new Response(
        JSON.stringify({ error: `API upstream error: ${upstreamRes.status}` }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    // 将上游流式数据转换为标准的文本流返回给前端，并在流结束时完成异步落库与活体演进
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    let pending = "";

    const emitLine = (line: string, controller: TransformStreamDefaultController<Uint8Array>) => {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) return;
      const payloadStr = trimmed.slice(5).trim();
      if (!payloadStr || payloadStr === "[DONE]") return;
      try {
        const data = JSON.parse(payloadStr);
        const content = data.choices?.[0]?.delta?.content;
        if (typeof content === "string" && content) {
          if (ttftMs === null) {
            ttftMs = Date.now() - startTime;
          }
          fullReply += content;
          controller.enqueue(encoder.encode(content));
        }
      } catch {
        // 跳过上游无效事件；完整事件会在换行后才进入此处
      }
    };

    const onStreamFinished = async () => {
      const totalLatencyMs = Date.now() - startTime;
      const promptTokens = Math.ceil(systemPrompt.length / 3) + Math.ceil(JSON.stringify(messages || []).length / 3);
      const completionTokens = Math.ceil(fullReply.length / 3);
      const totalTokens = promptTokens + completionTokens;

      if (!targetProjectId) return;

      try {
        // 1. 确保 session 存在 (项目级强绑定)
        const existingSession = await db.select({ id: sessions.id }).from(sessions).where(eq(sessions.id, currentSessionId)).limit(1);
        if (existingSession.length === 0) {
          await db.insert(sessions).values({
            id: currentSessionId,
            projectId: targetProjectId,
            title: sessionTitle || (messages?.[messages.length - 1]?.content?.slice(0, 16) || "新对话"),
            sessionType: "coaching",
          });
        }

        // 2. 持久化最新一轮用户消息与助手消息
        const lastUser = messages?.[messages.length - 1];
        if (lastUser && lastUser.role === "user") {
          await db.insert(messagesTable).values({
            id: randomUUID(),
            sessionId: currentSessionId,
            projectId: targetProjectId,
            role: "user",
            partsJson: JSON.stringify([{ type: "text", text: lastUser.content }]),
            timestampStr: "刚刚",
          });
        }

        const assistantMsgId = randomUUID();
        await db.insert(messagesTable).values({
          id: assistantMsgId,
          sessionId: currentSessionId,
          projectId: targetProjectId,
          role: "assistant",
          partsJson: JSON.stringify([{ type: "text", text: fullReply }]),
          timestampStr: "刚刚",
        });

        // 3. 记录 LLM 调用 Trace 与 Token 耗时
        await db.insert(llmCallTraces).values({
          id: randomUUID(),
          traceId: randomUUID(),
          projectId: targetProjectId,
          sessionId: currentSessionId,
          messageId: assistantMsgId,
          modelName: model,
          promptTokens,
          completionTokens,
          totalTokens,
          ttftMs: ttftMs || totalLatencyMs,
          totalLatencyMs,
          status: "success",
          metadataJson: JSON.stringify({ charCount: fullReply.length }),
        });

        // 4. 因果演进检测：若本次对话提到人物，动态更新其上次观察时间与证据计数
        const personMatch = fullReply.match(/\[([^\]]+)\]\(person:([^)]+)\)/);
        if (personMatch) {
          const personId = personMatch[2];
          const models = await db.select().from(personModels).where(eq(personModels.personId, personId));
          if (models.length > 0) {
            const firstModel = models[0];
            await db
              .update(personModels)
              .set({
                evidenceCount: firstModel.evidenceCount + 1,
                lastObservedAt: "刚刚",
                confidence: Math.min(0.98, firstModel.confidence + 0.02),
              })
              .where(eq(personModels.id, firstModel.id));

            // 同时记录一条新因果证据
            await db.insert(evidence).values({
              id: randomUUID(),
              personId,
              projectId: targetProjectId,
              observation: lastUser?.content?.slice(0, 100) || "对话沟通中观察到的新现象",
              rationale: "由对话交互自动触发的情绪与态度模式演进",
              inferredPatternId: firstModel.id,
              source: "实时对话推演",
              dateStr: "刚刚",
            });
          }
        }
      } catch (saveErr) {
        console.error("Async chat persistence error:", saveErr);
      }
    };

    const transformStream = new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        pending += decoder.decode(chunk, { stream: true });
        let newline = pending.indexOf("\n");
        while (newline !== -1) {
          emitLine(pending.slice(0, newline), controller);
          pending = pending.slice(newline + 1);
          newline = pending.indexOf("\n");
        }
      },
      flush(controller) {
        pending += decoder.decode();
        if (pending) emitLine(pending, controller);
        // 异步执行落库与活体演进，绝不阻塞用户完成感知
        onStreamFinished().catch((e) => console.error("onStreamFinished error:", e));
      },
    });

    return new Response(upstreamRes.body.pipeThrough(transformStream), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
