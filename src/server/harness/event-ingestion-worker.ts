/**
 * PANGBAI Agent Harness · 事实录入反思管线 (Event Ingestion Worker)
 *
 * Harness 工程范式：每条原始素材落库后自动触发异步语义提取，而非传统 CRUD "存完就完"。
 *
 * 职责：
 * 1. 从群聊/私聊/会议/评审/突发事件的原始文本中提取涉事干系人（新人自动建档）
 * 2. 提炼行为模式 (Pattern) 与事实观察 (Observation)
 * 3. 提取 Action Items（会议待办、研发承诺）
 * 4. 检测风险信号（排期延误、推诿、冲突预警）
 * 5. 沉淀至 evidence / person_models，更新 project risks
 */

import { db } from "@/db/client";
import { people, personModels, evidence, events, projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";

export type EventType = "chat" | "meeting" | "review" | "incident";

export interface EventIngestionInput {
  eventId: string;
  type: EventType;
  title: string;
  content: string;
  personId?: string;
  projectId?: string;
  metadata?: {
    chatType?: "group" | "private";
    attendees?: Array<{ name: string; role?: string }>;
    actionItems?: Array<{ task: string; owner?: string; deadline?: string }>;
    conclusion?: string;
    blockingIssues?: string[];
    [key: string]: unknown;
  };
}

export interface IngestionResult {
  extractedPeople: Array<{ id: string; name: string; isNew: boolean }>;
  extractedPatterns: Array<{ personId: string; pattern: string; confidence: number }>;
  actionItems: Array<{ task: string; owner?: string }>;
  riskSignals: string[];
}

/**
 * 通过 LLM 从原始事实文本中提取结构化信息
 */
async function extractWithLLM(input: EventIngestionInput): Promise<{
  people: Array<{ name: string; role?: string; observation?: string; pattern?: string }>;
  actionItems: Array<{ task: string; owner?: string; deadline?: string }>;
  riskSignals: string[];
  summary: string;
}> {
  const existingPeople = await db.select({ id: people.id, name: people.name, role: people.role }).from(people);
  const peopleCatalog = existingPeople.map((p) => `${p.name} (id: ${p.id})`).join(", ");

  const typeLabel = {
    chat: "群聊/私聊记录",
    meeting: "会议纪要 (MT+1)",
    review: "研发对接/技术评审记录",
    incident: "职场突发事件",
  }[input.type];

  const prompt = `你是职场事实分析专家。以下是一段${typeLabel}的原始内容。
已知干系人: [${peopleCatalog || "暂无"}]

标题: "${input.title}"
内容: """
${input.content.slice(0, 2000)}
"""

请从中提取以下结构化信息，严格仅返回 JSON（不要输出任何额外文字或 markdown）:
{
  "people": [{"name": "姓名", "role": "职位或角色(如不知写null)", "observation": "此人在本次事件中的客观言行(不超30字)", "pattern": "由此推断的行为模式(不超20字)"}],
  "actionItems": [{"task": "待办事项描述", "owner": "负责人姓名", "deadline": "截止日期(如有)"}],
  "riskSignals": ["简要风险描述，如排期延误、资源不足、推诿信号等"],
  "summary": "整体事件一句话摘要(不超40字)"
}
若内容不涉及具体人物或待办，对应数组返回空 []。`;

  const apiKey = process.env.SILICONFLOW_API_KEY;
  const baseUrl = process.env.SILICONFLOW_BASE_URL || "https://api.siliconflow.cn/v1";
  const model = process.env.FAST_MODEL || "deepseek-ai/DeepSeek-V3";

  if (!apiKey) {
    return { people: [], actionItems: [], riskSignals: [], summary: input.title };
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 500,
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content || "";
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        return JSON.parse(match[0]);
      }
    }
  } catch {
    // 降级到启发式
  }

  // 启发式兜底：从 metadata 中提取
  return {
    people: (input.metadata?.attendees || []).map((a) => ({
      name: a.name,
      role: a.role,
      observation: undefined,
      pattern: undefined,
    })),
    actionItems: input.metadata?.actionItems || [],
    riskSignals: input.metadata?.blockingIssues || [],
    summary: input.title,
  };
}

/**
 * 执行事实录入 Harness 反思管线
 */
export async function runEventIngestionPipeline(input: EventIngestionInput): Promise<IngestionResult> {
  const result: IngestionResult = {
    extractedPeople: [],
    extractedPatterns: [],
    actionItems: [],
    riskSignals: [],
  };

  try {
    // 1. LLM 语义提取
    const extracted = await extractWithLLM(input);

    // 2. 处理提取出的人物——新人自动建档，老人追加 evidence
    const existingPeople = await db.select().from(people);
    const existingMap = new Map(existingPeople.map((p) => [p.name, p]));

    for (const ep of extracted.people) {
      if (!ep.name) continue;

      let personId: string;
      let isNew = false;

      const existing = existingMap.get(ep.name);
      if (existing) {
        personId = existing.id;
      } else {
        // 自动建档
        personId = ep.name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, "_").toLowerCase() || `p_${randomUUID().slice(0, 6)}`;
        isNew = true;
        await db.insert(people).values({
          id: personId,
          name: ep.name,
          role: ep.role || "业务干系人",
          relationshipTone: "稳定协同",
          tensionScore: input.type === "incident" ? 70 : 50,
          advice: `由${input.type === "chat" ? "聊天记录" : input.type === "meeting" ? "会议纪要" : input.type === "review" ? "研发对接" : "突发事件"}自动建档`,
        }).onConflictDoNothing();
      }

      result.extractedPeople.push({ id: personId, name: ep.name, isNew });

      // 沉淀 evidence
      if (ep.observation) {
        await db.insert(evidence).values({
          id: `ev_${randomUUID().slice(0, 8)}`,
          personId,
          projectId: input.projectId,
          eventId: input.eventId,
          observation: ep.observation,
          rationale: ep.pattern || "由事实录入自动提炼",
          source: input.type === "chat" ? (input.metadata?.chatType === "group" ? "群聊记录" : "私聊记录")
            : input.type === "meeting" ? "会议纪要"
            : input.type === "review" ? "技术评审"
            : "突发事件",
          dateStr: "刚刚",
        });

        // 更新或新建 person_models
        if (ep.pattern) {
          const existingModels = await db.select().from(personModels).where(eq(personModels.personId, personId)).limit(1);
          const confidence = input.type === "incident" ? 0.85 : 0.75;

          if (existingModels.length > 0) {
            const m = existingModels[0];
            await db.update(personModels).set({
              evidenceCount: m.evidenceCount + 1,
              confidence: Math.min(0.98, Math.max(m.confidence, confidence)),
              lastObservedAt: "刚刚",
            }).where(eq(personModels.id, m.id));
          } else {
            await db.insert(personModels).values({
              id: `pm_${randomUUID().slice(0, 8)}`,
              personId,
              pattern: ep.pattern,
              confidence,
              evidenceCount: 1,
              lastObservedAt: "刚刚",
            });
          }

          result.extractedPatterns.push({ personId, pattern: ep.pattern, confidence });
        }
      }
    }

    // 3. Action Items 持久化（存入 event metadata 以供后续查阅）
    result.actionItems = extracted.actionItems || [];

    // 4. 风险信号 → 更新项目 risks（如果关联了项目）
    result.riskSignals = extracted.riskSignals || [];

    if (input.projectId && result.riskSignals.length > 0) {
      try {
        const proj = await db.select().from(projects).where(eq(projects.id, input.projectId)).limit(1);
        if (proj.length > 0) {
          let existingRisks: Array<{ title: string; note: string }> = [];
          try {
            existingRisks = proj[0].risksJson ? JSON.parse(proj[0].risksJson) : [];
          } catch { /* ignore */ }

          const newRisks = result.riskSignals
            .filter((r) => !existingRisks.some((er) => er.title === r))
            .map((r) => ({ title: r, note: `由${input.type}记录自动检测 (${new Date().toLocaleDateString("zh-CN")})` }));

          if (newRisks.length > 0) {
            await db.update(projects).set({
              risksJson: JSON.stringify([...existingRisks, ...newRisks]),
            }).where(eq(projects.id, input.projectId));
          }
        }
      } catch {
        // ignore
      }
    }

    // 5. 更新 event 记录的 metadataJson（追加提取结果）
    try {
      await db.update(events).set({
        metadataJson: JSON.stringify({
          ...input.metadata,
          harness_extraction: {
            summary: extracted.summary,
            extractedPeopleCount: result.extractedPeople.length,
            actionItemsCount: result.actionItems.length,
            riskSignalsCount: result.riskSignals.length,
            processedAt: new Date().toISOString(),
          },
        }),
      }).where(eq(events.id, input.eventId));
    } catch {
      // ignore
    }

  } catch (err) {
    console.error("EventIngestionWorker failed:", err);
  }

  return result;
}
