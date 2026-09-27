import "@/server/network/dns-patch";
import { NextRequest } from "next/server";
import { db } from "@/db/client";
import { sessions, messages as messagesTable, llmCallTraces, projects, people } from "@/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import {
  runJevDecision,
  assembleHarnessContext,
  pruneMessagesForTokenBudget,
  QualityGate,
  runWorkplaceCRMPipeline,
  USER_SELF_PERSON_ID,
  PREFERENCE_KIND_LABELS,
  classifyRunOutcome,
  createSseEmitter,
  estimateTokens,
  isDocSkill,
  headGateCheck,
  type GateReport,
} from "@/server/harness";
import { parseFrontmatter } from "@/server/artifacts/frontmatter";

export const runtime = "nodejs";

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

    // 2. 【上下文工程引擎】：按 Token 预算动态拼装各抽屉
    const systemPrompt = await assembleHarnessContext({
      sessionId: currentSessionId,
      projectId: targetProjectId,
      activeCanvas,
      profile,
      jevDecision,
      userQuery,
    });

    // 3. 【多轮压缩预算保底】：剪裁中间历史，保证不爆上下文
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

    const payload: Record<string, unknown> = {
      model,
      messages: [
        { role: "system", content: systemPrompt },
        ...prunedMessages,
      ],
      stream: true,
      temperature: 0.6,
      // 请求 provider 在流末尾返回真实 usage（choices 为空的 usage chunk）
      stream_options: { include_usage: true },
    };

    // 客户端断连级联：req.signal (Next 已接线真实断连) 与响应体 cancel() 双路触发
    const disconnect = new AbortController();

    const callUpstream = (requestBody: Record<string, unknown>) =>
      fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
        signal: disconnect.signal,
      });

    let upstreamRes = await callUpstream(payload);

    // 个别网关不接受 stream_options：识别后去掉该字段原样重发一次
    if (upstreamRes.status === 400 || upstreamRes.status === 422) {
      const errText = await upstreamRes.text().catch(() => "");
      if (/stream_options|include_usage/i.test(errText)) {
        const fallbackPayload = { ...payload };
        delete fallbackPayload.stream_options;
        upstreamRes = await callUpstream(fallbackPayload);
      } else {
        console.error("SiliconFlow Upstream Error:", upstreamRes.status, errText);
        return new Response(JSON.stringify({ error: `SiliconFlow upstream error: ${upstreamRes.status}` }), {
          status: 502,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

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

    let responseCancelled = false;

    // 5. 构造标准 SSE 事件流输出
    const stream = new ReadableStream({
      // 平台取消响应体而 req.signal 未触发的双保险
      cancel() {
        responseCancelled = true;
        disconnect.abort(new Error("response_cancelled"));
      },
      async start(controller) {
        const emitter = createSseEmitter(controller, encoder);
        let clientDisconnected = false;
        let streamError: unknown;
        let capturedUsage:
          | { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }
          | undefined;

        // 5.1 推送 run.started 事件
        emitter.emit("run.started", {
          type: "run.started",
          sessionId: currentSessionId,
          messageId: assistantMsgId,
          timestamp: Date.now(),
        });

        // 5.2 若 Jev 命中技能，推送 tool.started 事件 (让前端感知到正在调用技能)
        if (jevDecision.choice !== "direct_chat") {
          emitter.emit("tool.started", {
            type: "tool.started",
            toolCallId: `call_${jevDecision.choice}`,
            toolName: jevDecision.choice,
            input: {
              skill: jevDecision.choice,
              score: jevDecision.score,
              rationale: jevDecision.rationale,
            },
            timestamp: Date.now(),
          });
        }

        /**
         * 消费上游 SSE 流并转发 message.delta。
         * headGate=true 时先缓冲流头，直至 frontmatter 契约可判定再放行；
         * 违约时停止消费（由调用方发起一次修正重试）。
         * 读流异常向上抛出，由外层统一分类为 upstream_error。
         */
        const consumeUpstream = async (
          res: Response,
          headGate: boolean,
        ): Promise<{ clientDisconnected: boolean; violation: boolean }> => {
          const reader = res.body!.getReader();
          let sseBuffer = "";
          let headBuffer: string | null = headGate ? "" : null;
          let violation = false;

          try {
            readLoop: while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              sseBuffer += decoder.decode(value, { stream: true });
              let newlineIdx = sseBuffer.indexOf("\n");

              while (newlineIdx !== -1) {
                const line = sseBuffer.slice(0, newlineIdx).trim();
                sseBuffer = sseBuffer.slice(newlineIdx + 1);
                newlineIdx = sseBuffer.indexOf("\n");

                if (!line.startsWith("data:")) continue;
                const jsonStr = line.slice(5).trim();
                if (!jsonStr || jsonStr === "[DONE]") continue;

                try {
                  const parsed = JSON.parse(jsonStr);

                  // 流末尾的真实 usage chunk（choices 为空）
                  if (parsed.usage && (!parsed.choices || parsed.choices.length === 0)) {
                    capturedUsage = parsed.usage;
                    continue;
                  }

                  const deltaContent = parsed.choices?.[0]?.delta?.content;
                  if (typeof deltaContent === "string" && deltaContent) {
                    if (ttftMs === null) {
                      ttftMs = Date.now() - startTime;
                    }

                    // 5.3 流头门禁缓冲：frontmatter 契约在头部几个 delta 即可判定
                    if (headBuffer !== null) {
                      headBuffer += deltaContent;
                      const verdict = headGateCheck(headBuffer);
                      if (verdict.decision === "violation") {
                        violation = true;
                        break readLoop;
                      }
                      if (verdict.decision === "pass") {
                        const bufferedText = headBuffer;
                        headBuffer = null;
                        fullReply += bufferedText;
                        const delivered = emitter.emit("message.delta", {
                          type: "message.delta",
                          messageId: assistantMsgId,
                          delta: bufferedText,
                          timestamp: Date.now(),
                        });
                        if (!delivered) return { clientDisconnected: true, violation: false };
                      }
                      continue;
                    }

                    fullReply += deltaContent;
                    const delivered = emitter.emit("message.delta", {
                      type: "message.delta",
                      messageId: assistantMsgId,
                      delta: deltaContent,
                      timestamp: Date.now(),
                    });
                    if (!delivered) {
                      return { clientDisconnected: true, violation: false };
                    }
                  }
                } catch {
                  // 忽略非完整 JSON 行
                }
              }
            }
          } finally {
            try {
              await reader.cancel();
            } catch {
              // 上游流已关闭
            }
          }

          // 流结束仍未判定（如全文恰为 "---"）：放行剩余缓冲，交由流后门禁修复
          if (headBuffer !== null && headBuffer.length > 0 && !violation) {
            fullReply += headBuffer;
            emitter.emit("message.delta", {
              type: "message.delta",
              messageId: assistantMsgId,
              delta: headBuffer,
              timestamp: Date.now(),
            });
          }

          return { clientDisconnected: false, violation };
        };

        // 5.4 消费上游；文档技能启用流头门禁，违约时携带反馈信息重试一次
        const docSkill = isDocSkill(jevDecision.choice);
        let gateRetried = false;
        try {
          const first = await consumeUpstream(upstreamRes, docSkill);
          clientDisconnected = first.clientDisconnected;

          if (!clientDisconnected && first.violation) {
            gateRetried = true;
            // 丢弃首轮头部；TTFT 以用户可见首字节计，重置后由重试首字节重新起算
            fullReply = "";
            ttftMs = null;

            const retryPayload: Record<string, unknown> = {
              ...payload,
              messages: [
                ...(payload.messages as unknown[]),
                {
                  role: "user",
                  content:
                    "上一次输出未以 YAML Frontmatter 开头，违反了输出契约。请重新完整输出：第一行必须是 ---，随后依次是 title、type、expected_solution 字段，闭合 --- 之后再输出正文，不要输出任何开场白或解释。",
                },
              ],
            };

            const retryRes = await callUpstream(retryPayload);
            if (!retryRes.ok || !retryRes.body) {
              streamError = new Error(`gate retry upstream error: ${retryRes.status}`);
            } else {
              const second = await consumeUpstream(retryRes, false);
              clientDisconnected = clientDisconnected || second.clientDisconnected;
            }
          }
        } catch (err) {
          streamError = err;
        }

        // 6. 【流式质量门禁与契约校验】：修复 YAML Frontmatter 与引用卡片格式
        //    门禁失败不视为回合失败：原文即终稿，仅记录错误
        let gateReport: GateReport = { violations: [], repairs: [], retried: gateRetried };
        if (!clientDisconnected && streamError === undefined) {
          try {
            const knownPeopleList = await db.select({ id: people.id, name: people.name }).from(people);
            const { text: gated, report } = QualityGate.processOutput(fullReply, {
              activeSkill: jevDecision.choice,
              knownPeople: knownPeopleList,
            });
            gateReport = { ...report, retried: gateRetried };
            if (gated !== fullReply) {
              fullReply = gated;
              // 终稿同步：保证用户所见 == 落库 == artifact 内容
              emitter.emit("message.final", {
                type: "message.final",
                messageId: assistantMsgId,
                text: fullReply,
                timestamp: Date.now(),
              });
            }
          } catch (gateErr) {
            console.error("QualityGate error:", gateErr);
          }

          // 7. 【Canvas 文档检测与唤起】：若正文包含 YAML Frontmatter，下发 artifact.suggested
          try {
            const docParsed = parseFrontmatter(fullReply);
            if (docParsed.frontmatter.title || docParsed.frontmatter.type) {
              emitter.emit("artifact.suggested", {
                type: "artifact.suggested",
                artifactId: `art_${randomUUID().slice(0, 8)}`,
                title: docParsed.frontmatter.title || "落地方案.md",
                artifactType: typeof docParsed.frontmatter.type === "string" ? docParsed.frontmatter.type : "prd",
                frontmatter: docParsed.frontmatter,
                content: fullReply,
                description: docParsed.frontmatter.expected_solution || "由 Harness 技能自动生成的大纲与方案",
                timestamp: Date.now(),
              });
            }
          } catch (docErr) {
            console.error("Artifact detection error:", docErr);
          }

          // 8. 闭环技能调用事件 tool.result（附带门禁报告，不再裸 success）
          if (jevDecision.choice !== "direct_chat") {
            emitter.emit("tool.result", {
              type: "tool.result",
              toolCallId: `call_${jevDecision.choice}`,
              output: {
                status: "success",
                skill: jevDecision.choice,
                summary: jevDecision.rationale,
                gate: gateReport,
              },
              status: "success",
              timestamp: Date.now(),
            });
          }
        }

        // 9. 终态结算：idle != turn success，按真实信号分类裁决
        const gateRetryExhausted =
          gateRetried &&
          gateReport.violations.some(
            (v) => v.kind === "frontmatter_missing" || v.kind === "frontmatter_not_at_start",
          );
        const outcome = classifyRunOutcome({
          clientDisconnected: clientDisconnected || responseCancelled || req.signal.aborted,
          streamError,
          replyChars: fullReply.length,
          gateRetryExhausted,
        });

        if (outcome.status !== "success") {
          emitter.emit("run.error", {
            type: "run.error",
            error: outcome.errorMessage ?? "流式生成中断",
            code: outcome.errorCode ?? outcome.finishReason,
            timestamp: Date.now(),
          });
        }

        const totalLatencyMs = Date.now() - startTime;
        const promptTokens =
          capturedUsage?.prompt_tokens ??
          estimateTokens(systemPrompt) + estimateTokens(JSON.stringify(messages));
        const completionTokens = capturedUsage?.completion_tokens ?? estimateTokens(fullReply);
        const totalTokens = capturedUsage?.total_tokens ?? promptTokens + completionTokens;

        emitter.emit("run.finished", {
          type: "run.finished",
          status: outcome.status,
          finishReason: outcome.finishReason,
          usage: {
            promptTokens,
            completionTokens,
            totalTokens,
          },
          metadata: { gate: gateReport },
          timestamp: Date.now(),
        });

        // 10. 【Workplace CRM Worker】：真实因果语义反思与推流（人物洞察 + 偏好信号）
        //     仅成功回合执行；断连/失败回合没有可反思的完整交换
        if (outcome.status === "success") {
          try {
            const { insights, preferences } = await runWorkplaceCRMPipeline({
              sessionId: currentSessionId,
              projectId: targetProjectId,
              userMessage: userQuery,
              assistantReply: fullReply,
            });

            for (const item of insights) {
              emitter.emit("memory.candidate", {
                type: "memory.candidate",
                candidateId: item.candidateId || `cand_${randomUUID().slice(0, 8)}`,
                personId: item.personId,
                personName: item.personName,
                pattern: item.framework ? `${item.inferredPattern}（${item.framework}）` : item.inferredPattern,
                observation: item.observation,
                confidence: item.confidence,
                targetScene: "实时职场交互",
                timestamp: Date.now(),
              });
            }

            for (const pref of preferences) {
              if (!pref.candidateId) continue;
              emitter.emit("memory.candidate", {
                type: "memory.candidate",
                candidateId: pref.candidateId,
                personId: USER_SELF_PERSON_ID,
                personName: "我",
                pattern: pref.guidance,
                observation: pref.observation,
                confidence: pref.confidence,
                targetScene: `偏好进化 · ${PREFERENCE_KIND_LABELS[pref.kind] || pref.kind}`,
                timestamp: Date.now(),
              });
            }
          } catch (crmErr) {
            console.error("Workplace CRM pipeline error:", crmErr);
          }
        }

        // 11. 尽力落库持久化 (不阻塞用户；成败回合都执行，失败也保留部分回复与真实状态)
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

          // 记录 Trace：status 为终态分类结果，不再恒写 success
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
            status: outcome.status,
            metadataJson: JSON.stringify({
              charCount: fullReply.length,
              jevChoice: jevDecision.choice,
              jevScore: jevDecision.score,
              finishReason: outcome.finishReason,
              usageSource: capturedUsage ? "provider" : "estimated",
              gate: gateReport,
            }),
          });
        } catch (dbErr) {
          console.error("Async DB persistence error:", dbErr);
        }

        if (!emitter.closed) {
          try {
            controller.close();
          } catch {
            // 响应体已被取消
          }
        }
      },
    });

    // 客户端断连时级联中断上游请求，停止为已放弃的流付费
    req.signal.addEventListener("abort", () => disconnect.abort(req.signal.reason));

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
