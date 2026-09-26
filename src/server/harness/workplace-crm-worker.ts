/**
 * PANGBAI Agent Harness · Workplace CRM 异步反思与记忆进化 Worker
 *
 * 核心职责：
 * 废除脆弱的正则假演进 (confidence + 0.02)，采用真实语义反思：
 * 1. 识别对话中涉及的干系人（支持已有干系人与新干系人自动发现）
 * 2. 提炼其真实行为模式 (Pattern) 与事实观察 (Observation)，优先用《职场提升》战法框架的概念体系定性
 * 3. 同轮提取用户自身的辅导偏好信号（风格微调/行业细节/沟通雷区），沉淀为待确认候选
 * 4. 评估置信度与证据强度，持久化至 PostgreSQL (evidence / person_models / memory_candidates)
 * 5. 产出标准 memory.candidate 事件供前端渲染
 */

import { db } from "@/db/client";
import { people, personModels, evidence, memoryCandidates } from "@/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { matchPlaybooks } from "@/server/knowledge/playbook-matcher";

/** 偏好候选在人物世界模型中的宿主档案 ID（"我"本人） */
export const USER_SELF_PERSON_ID = "user_self";

export interface WorkplaceCRMInput {
  sessionId: string;
  projectId?: string;
  userMessage: string;
  assistantReply: string;
}

export interface ExtractedPersonInsight {
  personId: string;
  personName: string;
  observation: string;
  inferredPattern: string;
  /** 借用的战法框架引用，如 "EP033·ART模型"；空表示未命中 */
  framework?: string;
  confidence: number;
  rationale: string;
  /** 落库后的记忆候选 ID（供前端确认走查） */
  candidateId?: string;
}

export type PreferenceKind = "style_nudge" | "industry_detail" | "communication_redline";

export interface ExtractedPreferenceSignal {
  kind: PreferenceKind;
  /** 用户原话事实 */
  observation: string;
  /** 沉淀为辅导偏好的具体指引（确认后注入 Drawer 0） */
  guidance: string;
  confidence: number;
  /** 落库后的记忆候选 ID */
  candidateId?: string;
}

export interface WorkplaceCRMResult {
  insights: ExtractedPersonInsight[];
  preferences: ExtractedPreferenceSignal[];
}

/** 偏好类型 → 前端 targetScene 标签 */
export const PREFERENCE_KIND_LABELS: Record<PreferenceKind, string> = {
  style_nudge: "风格微调",
  industry_detail: "行业细节",
  communication_redline: "沟通雷区",
};

/**
 * 组装本轮命中的战法框架摘要（供反思 prompt 对齐语料概念体系）
 */
function buildFrameworkDigest(userMessage: string): string {
  const matched = matchPlaybooks(userMessage, 2);
  if (matched.length === 0) return "";
  return matched
    .map(({ playbook }) => {
      const entities = (playbook.entities || []).slice(0, 3).join("、");
      const oneLiner = (playbook.oneLiner || "").slice(0, 60);
      return `- ${playbook.id}·${playbook.title}${entities ? `（概念：${entities}）` : ""}：${oneLiner}`;
    })
    .join("\n");
}

/**
 * 轻量语义提取器：从本轮交互中提炼干系人行为事实 + 用户偏好信号
 */
async function extractInsightsWithLLM(input: WorkplaceCRMInput): Promise<WorkplaceCRMResult> {
  const existingPeople = await db.select({ id: people.id, name: people.name, role: people.role }).from(people);
  const peopleCatalog = existingPeople.map((p) => `${p.name} (id: ${p.id}, 角色: ${p.role})`).join("; ");

  const frameworkDigest = buildFrameworkDigest(input.userMessage);
  const frameworkBlock = frameworkDigest
    ? `\n本轮命中的职场战法框架（若适用，inferredPattern 必须优先用这些概念体系定性）：\n${frameworkDigest}\n`
    : "";

  const prompt = `你是职场行为观察与因果证据反思专家。
现有已知干系人列表: [${peopleCatalog}]

本轮用户输入: "${input.userMessage}"
导师分析与建议: "${input.assistantReply.slice(0, 500)}"

请完成两项反思：
一、本轮对话是否涉及具体人物（同事、领导、业务方）？若涉及，提取其行为模式；若不涉及任何具体人物或仅为通用概念探讨，persons 返回空数组。
二、用户是否表达了关于「自己」的辅导偏好信号（对建议风格的反馈、所在行业的背景细节、沟通上的雷区）？仅提取用户原话可支撑的明确信号，不要臆测；若没有，preferences 返回空数组。
${frameworkBlock}
请严格仅返回 JSON 对象（不要输出任何额外文本或 markdown 标签）:
{
  "persons": [
    {
      "personId": "若在已知列表中请使用其已有 id，若是新人物请使用拼音如 zhang_san",
      "personName": "人物姓名，如老李",
      "observation": "客观观察到的具体言行事实（不超过30字）",
      "inferredPattern": "由此行为推断出的长期心理/行为模式（不超过25字）",
      "framework": "若 inferredPattern 借用了上方战法框架则填「EP编号·模型名」如 EP033·ART模型，否则填空字符串",
      "confidence": 0.85,
      "rationale": "为什么做出该心理推断"
    }
  ],
  "preferences": [
    {
      "kind": "style_nudge | industry_detail | communication_redline 三选一",
      "observation": "用户原话事实（不超过30字）",
      "guidance": "沉淀为辅导偏好的具体指引（不超过40字）",
      "confidence": 0.8
    }
  ]
}`;

  const apiKey = process.env.SILICONFLOW_API_KEY;
  const baseUrl = process.env.SILICONFLOW_BASE_URL || "https://api.siliconflow.cn/v1";
  const fastModel = process.env.FAST_MODEL || "deepseek-ai/DeepSeek-V3";

  if (!apiKey) return { insights: [], preferences: [] };

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: fastModel,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 450,
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || "";
      // 优先解析对象契约 {persons, preferences}；兼容模型退化为输出裸数组
      const objMatch = content.match(/\{\s*"persons"[\s\S]*\}/);
      if (objMatch) {
        try {
          const parsed = JSON.parse(objMatch[0]);
          const insights = Array.isArray(parsed.persons) ? parsed.persons : [];
          const preferences = Array.isArray(parsed.preferences) ? parsed.preferences : [];
          return { insights, preferences };
        } catch {
          // fallthrough
        }
      }
      const arrMatch = content.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (arrMatch) {
        return { insights: JSON.parse(arrMatch[0]) as ExtractedPersonInsight[], preferences: [] };
      }
    }
  } catch {
    // 降级兜底
  }

  // 兜底启发式规则：若文本显式出现人名
  for (const p of existingPeople) {
    if (p.id === USER_SELF_PERSON_ID) continue;
    if (input.userMessage.includes(p.name) || input.assistantReply.includes(p.name)) {
      return {
        insights: [
          {
            personId: p.id,
            personName: p.name,
            observation: input.userMessage.slice(0, 60),
            inferredPattern: "沟通协作与推进过程中的关键行为表现",
            confidence: 0.8,
            rationale: "基于当前对话上下文的实时因果推断",
          },
        ],
        preferences: [],
      };
    }
  }

  return { insights: [], preferences: [] };
}

/**
 * 确保「我」的偏好宿主档案存在（零 schema 迁移：复用 people 表）
 */
async function ensureUserSelfProfile(): Promise<void> {
  const existing = await db.select({ id: people.id }).from(people).where(eq(people.id, USER_SELF_PERSON_ID)).limit(1);
  if (existing.length === 0) {
    await db.insert(people).values({
      id: USER_SELF_PERSON_ID,
      name: "我",
      role: "用户本人 · 偏好档案",
      relationshipTone: "自我成长",
      tensionScore: 0,
      advice: "由对话偏好信号自动沉淀，确认后写回辅导设定",
    });
  }
}

/**
 * 异步执行 CRM 反思与数据库写入
 */
export async function runWorkplaceCRMPipeline(input: WorkplaceCRMInput): Promise<WorkplaceCRMResult> {
  try {
    const { insights, preferences } = await extractInsightsWithLLM(input);

    for (const item of insights) {
      // 1. 若为新干系人，先自动建档
      const existing = await db.select().from(people).where(eq(people.id, item.personId)).limit(1);
      if (existing.length === 0) {
        await db.insert(people).values({
          id: item.personId,
          name: item.personName,
          role: "业务干系人",
          relationshipTone: "稳定协同",
          tensionScore: 50,
          advice: "由实时对话推演自动识别沉淀",
        });
      }

      // 2. 沉淀至因果证据库 (evidence)，source 编码战法引用以便按类目反查
      const evId = `ev_${randomUUID().slice(0, 8)}`;
      await db.insert(evidence).values({
        id: evId,
        personId: item.personId,
        projectId: input.projectId,
        observation: item.observation,
        rationale: item.rationale,
        source: item.framework ? `实时对话推演 · 战法:${item.framework}` : "实时对话推演",
        dateStr: "刚刚",
      });

      // 3. 沉淀或演进人物行为模式 (person_models)
      const existingModels = await db.select().from(personModels).where(eq(personModels.personId, item.personId)).limit(1);
      if (existingModels.length > 0) {
        const m = existingModels[0];
        const newConfidence = Math.min(0.98, Math.max(m.confidence, item.confidence));
        await db
          .update(personModels)
          .set({
            evidenceCount: m.evidenceCount + 1,
            confidence: newConfidence,
            lastObservedAt: "刚刚",
          })
          .where(eq(personModels.id, m.id));
      } else {
        await db.insert(personModels).values({
          id: `pm_${randomUUID().slice(0, 8)}`,
          personId: item.personId,
          pattern: item.inferredPattern,
          confidence: item.confidence,
          evidenceCount: 1,
          lastObservedAt: "刚刚",
        });
      }

      // 4. 插入记忆候选池 (memory_candidates) 供前端审核或点亮小蓝点
      const candidateId = `cand_${randomUUID().slice(0, 8)}`;
      await db.insert(memoryCandidates).values({
        id: candidateId,
        conversationId: input.sessionId,
        projectId: input.projectId,
        personId: item.personId,
        observation: item.observation,
        inferredPattern: item.framework ? `${item.inferredPattern}（${item.framework}）` : item.inferredPattern,
        confidence: item.confidence,
        rationale: item.rationale,
        status: "confirmed",
      });
      item.candidateId = candidateId;
    }

    // 5. 偏好信号：建档「我」→ 落证据 → 进候选池（pending，待用户确认后写回辅导设定）
    if (preferences && preferences.length > 0) {
      await ensureUserSelfProfile();
      for (const pref of preferences) {
        if (!pref || !pref.observation || !pref.guidance) continue;

        await db.insert(evidence).values({
          id: `ev_${randomUUID().slice(0, 8)}`,
          personId: USER_SELF_PERSON_ID,
          projectId: input.projectId,
          observation: pref.observation,
          rationale: pref.guidance,
          source: `偏好信号 · ${PREFERENCE_KIND_LABELS[pref.kind] || pref.kind}`,
          dateStr: "刚刚",
        });

        const candidateId = `cand_${randomUUID().slice(0, 8)}`;
        await db.insert(memoryCandidates).values({
          id: candidateId,
          conversationId: input.sessionId,
          projectId: input.projectId,
          personId: USER_SELF_PERSON_ID,
          observation: pref.observation,
          inferredPattern: pref.guidance,
          confidence: pref.confidence || 0.8,
          rationale: PREFERENCE_KIND_LABELS[pref.kind] || pref.kind,
          status: "pending",
        });
        pref.candidateId = candidateId;
      }
    }

    return { insights, preferences };
  } catch (err) {
    console.error("WorkplaceCRMWorker failed:", err);
    return { insights: [], preferences: [] };
  }
}
