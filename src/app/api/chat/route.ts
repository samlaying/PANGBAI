import "@/server/network/dns-patch";
import { NextRequest } from "next/server";
import { db } from "@/db/client";
import { sessions, messages as messagesTable, llmCallTraces, projects, people } from "@/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import {
  runJevDecision,
  generateInitialTodoList,
  updatePlanningState,
  assembleHarnessContext,
  pruneMessagesForTokenBudget,
  QualityGate,
  runWorkplaceCRMPipeline,
  USER_SELF_PERSON_ID,
  PREFERENCE_KIND_LABELS,
} from "@/server/harness";
import { parseFrontmatter } from "@/server/artifacts/frontmatter";

export const runtime = "nodejs";

/**
 * 格式化 SSE 消息块
 */
function sseChunk(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  let ttftMs: number | null = null;
  let fullReply = "";

  try {
    const body = await req.json();
    const {
      messages = [],
      activeCanvas,
      activeProject,
      projectId,
      sessionId,
      sessionTitle,
      profile,
    } = body;

    // 0. 项目 ID 与会话 ID 归一化
    let targetProjectId = projectId || activeProject?.id;
    if (!targetProjectId) {
      const pList = await db.select({ id: projects.id }).from(projects).limit(1);
      if (pList.length > 0) {
        targetProjectId = pList[0].id;
      } else {
        targetProjectId = "default_project";
        await db
          .insert(projects)
          .values({
            id: targetProjectId,
            name: "通用产品工作区",
            status: "in_progress",
          })
          .onConflictDoNothing();
      }
    }
    const currentSessionId = sessionId || `sess_${randomUUID().slice(0, 8)}`;
    const assistantMsgId = `msg_${randomUUID().slice(0, 8)}`;

    const lastUser = messages[messages.length - 1];
    const userQuery = lastUser?.content || "";

    // 1. 【Jev 决策层】：毫秒级 TypeSafe 预判
    const jevDecision = await runJevDecision({
      userQuery,
      activeCanvas,
    });

    // 2. 【任务规划状态机】：复杂任务 (score >= 60) 激活独立 TodoList 状态
    let todoList = undefined;
    if (jevDecision.score >= 60) {
      todoList = generateInitialTodoList(jevDecision.choice, userQuery);
      updatePlanningState(currentSessionId, {
        todoList,
        activeSkill: jevDecision.choice,
        complexityScore: jevDecision.score,
      });
    }

    // 3. 【上下文工程引擎】：按 Token 预算动态 Load，并执行 20K Offload 剪裁
    const systemPrompt = await assembleHarnessContext({
      sessionId: currentSessionId,
      projectId: targetProjectId,
      activeCanvas,
      profile,
      jevDecision,
      todoList,
      userQuery,
    });

    // 4. 【多轮压缩与 85% 窗口保底】：剪裁中间历史，保证不爆上下文
    const prunedMessages = pruneMessagesForTokenBudget(messages, 12000);

    const apiKey = process.env.SILICONFLOW_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "SiliconFlow API Key not configured" }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      });
    }

    const baseUrl = process.env.SILICONFLOW_BASE_URL || "https://api.siliconflow.cn/v1";
    const model = process.env.DEFAULT_MODEL || "deepseek-ai/DeepSeek-V3";

    const payload = {
      model,
      messages: [
        { role: "system", content: systemPrompt },
        ...prunedMessages,
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
      console.error("SiliconFlow Upstream Error:", upstreamRes.status, errText);
      return new Response(JSON.stringify({ error: `SiliconFlow upstream error: ${upstreamRes.status}` }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    // 5. 构造标准 SSE 事件流输出
    const stream = new ReadableStream({
      async start(controller) {
        // 5.1 推送 run.started 事件
        controller.enqueue(
          encoder.encode(
            sseChunk("run.started", {
              type: "run.started",
              sessionId: currentSessionId,
              messageId: assistantMsgId,
              timestamp: Date.now(),
            })
          )
        );

        // 5.2 若 Jev 命中技能，推送 tool.started 事件 (让前端感知到正在调用技能)
        if (jevDecision.choice !== "direct_chat") {
          controller.enqueue(
            encoder.encode(
              sseChunk("tool.started", {
                type: "tool.started",
                toolCallId: `call_${jevDecision.choice}`,
                toolName: jevDecision.choice,
                input: {
                  skill: jevDecision.choice,
                  score: jevDecision.score,
                  rationale: jevDecision.rationale,
                },
                timestamp: Date.now(),
              })
            )
          );
        }

        const reader = upstreamRes.body!.getReader();
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            let newlineIdx = buffer.indexOf("\n");

            while (newlineIdx !== -1) {
              const line = buffer.slice(0, newlineIdx).trim();
              buffer = buffer.slice(newlineIdx + 1);
              newlineIdx = buffer.indexOf("\n");

              if (!line.startsWith("data:")) continue;
              const jsonStr = line.slice(5).trim();
              if (!jsonStr || jsonStr === "[DONE]") continue;

              try {
                const parsed = JSON.parse(jsonStr);
                const deltaContent = parsed.choices?.[0]?.delta?.content;
                if (typeof deltaContent === "string" && deltaContent) {
                  if (ttftMs === null) {
                    ttftMs = Date.now() - startTime;
                  }
                  fullReply += deltaContent;

                  // 5.3 标准推送 message.delta 事件
                  controller.enqueue(
                    encoder.encode(
                      sseChunk("message.delta", {
                        type: "message.delta",
                        messageId: assistantMsgId,
                        delta: deltaContent,
                        timestamp: Date.now(),
                      })
                    )
                  );
                }
              } catch {
                // 忽略非完整 JSON 行
              }
            }
          }
        } finally {
          reader.releaseLock();
        }

        // 6. 【流式质量门禁与契约校验】：修复 YAML Frontmatter 与引用卡片格式
        const knownPeopleList = await db.select({ id: people.id, name: people.name }).from(people);
        fullReply = QualityGate.processOutput(fullReply, {
          activeSkill: jevDecision.choice,
          knownPeople: knownPeopleList,
        });

        // 7. 【Canvas 文档检测与唤起】：若正文包含 YAML Frontmatter，下发 artifact.suggested
        const docParsed = parseFrontmatter(fullReply);
        if (docParsed.frontmatter.title || docParsed.frontmatter.type) {
          controller.enqueue(
            encoder.encode(
              sseChunk("artifact.suggested", {
                type: "artifact.suggested",
                artifactId: `art_${randomUUID().slice(0, 8)}`,
                title: docParsed.frontmatter.title || "落地方案.md",
                artifactType: typeof docParsed.frontmatter.type === "string" ? docParsed.frontmatter.type : "prd",
                frontmatter: docParsed.frontmatter,
                content: fullReply,
                description: docParsed.frontmatter.expected_solution || "由 Harness 技能自动生成的大纲与方案",
                timestamp: Date.now(),
              })
            )
          );
        }

        // 8. 闭环技能调用事件 tool.result
        if (jevDecision.choice !== "direct_chat") {
          controller.enqueue(
            encoder.encode(
              sseChunk("tool.result", {
                type: "tool.result",
                toolCallId: `call_${jevDecision.choice}`,
                output: {
                  status: "success",
                  skill: jevDecision.choice,
                  summary: jevDecision.rationale,
                },
                status: "success",
                timestamp: Date.now(),
              })
            )
          );
        }

        // 9. 【异步 Workplace CRM Worker】：真实因果语义反思与推流（人物洞察 + 偏好信号）
        const { insights, preferences } = await runWorkplaceCRMPipeline({
          sessionId: currentSessionId,
          projectId: targetProjectId,
          userMessage: userQuery,
          assistantReply: fullReply,
        });

        for (const item of insights) {
          controller.enqueue(
            encoder.encode(
              sseChunk("memory.candidate", {
                type: "memory.candidate",
                candidateId: item.candidateId || `cand_${randomUUID().slice(0, 8)}`,
                personId: item.personId,
                personName: item.personName,
                pattern: item.framework ? `${item.inferredPattern}（${item.framework}）` : item.inferredPattern,
                observation: item.observation,
                confidence: item.confidence,
                targetScene: "实时职场交互",
                timestamp: Date.now(),
              })
            )
          );
        }

        for (const pref of preferences) {
          if (!pref.candidateId) continue;
          controller.enqueue(
            encoder.encode(
              sseChunk("memory.candidate", {
                type: "memory.candidate",
                candidateId: pref.candidateId,
                personId: USER_SELF_PERSON_ID,
                personName: "我",
                pattern: pref.guidance,
                observation: pref.observation,
                confidence: pref.confidence,
                targetScene: `偏好进化 · ${PREFERENCE_KIND_LABELS[pref.kind] || pref.kind}`,
                timestamp: Date.now(),
              })
            )
          );
        }

        // 10. 结算统计与推送 run.finished
        const totalLatencyMs = Date.now() - startTime;
        const promptTokens = Math.ceil(systemPrompt.length / 3) + Math.ceil(JSON.stringify(messages).length / 3);
        const completionTokens = Math.ceil(fullReply.length / 3);
        const totalTokens = promptTokens + completionTokens;

        controller.enqueue(
          encoder.encode(
            sseChunk("run.finished", {
              type: "run.finished",
              usage: {
                promptTokens,
                completionTokens,
                totalTokens,
              },
              timestamp: Date.now(),
            })
          )
        );

        // 11. 异步落库持久化 (不阻塞用户)
        try {
          // 保存 Session
          const existingSession = await db.select({ id: sessions.id }).from(sessions).where(eq(sessions.id, currentSessionId)).limit(1);
          if (existingSession.length === 0) {
            await db.insert(sessions).values({
              id: currentSessionId,
              projectId: targetProjectId,
              title: sessionTitle || userQuery.slice(0, 16) || "新对话",
              sessionType: "coaching",
            });
          }

          // 保存用户与助手消息
          if (lastUser && lastUser.role === "user") {
            await db.insert(messagesTable).values({
              id: `msg_${randomUUID().slice(0, 8)}`,
              sessionId: currentSessionId,
              projectId: targetProjectId,
              role: "user",
              partsJson: JSON.stringify([{ type: "text", text: lastUser.content }]),
              timestampStr: "刚刚",
            });
          }

          await db.insert(messagesTable).values({
            id: assistantMsgId,
            sessionId: currentSessionId,
            projectId: targetProjectId,
            role: "assistant",
            partsJson: JSON.stringify([{ type: "text", text: fullReply }]),
            timestampStr: "刚刚",
          });

          // 记录 Trace
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
            metadataJson: JSON.stringify({
              charCount: fullReply.length,
              jevChoice: jevDecision.choice,
              jevScore: jevDecision.score,
            }),
          });
        } catch (dbErr) {
          console.error("Async DB persistence error:", dbErr);
        }

        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
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
