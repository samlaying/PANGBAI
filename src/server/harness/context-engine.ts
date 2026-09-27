/**
 * PANGBAI Agent Harness · 上下文工程引擎 (Context Engineering Engine)
 *
 * 遵循 Harness Engineering 标准工程流程：
 * 1. Load: 按 Token 预算动态拼装各抽屉 (Drawer) 与渐进式 Skill
 * 2. Compress:
 *    - Truncate: 单个大文档估算超 20K Tokens 时头尾保留 + 中段省略标注
 *      （诚实截断：不做摘要归纳，也不假装模型能读回被省略的内容）
 *    - Prune: 历史消息估算超预算时，中间轮以逐轮中性存根替换
 *      （机械存根：不宣称任何共识或结论）
 * 3. Storage: 偏好与世界模型跨会话持久化（经用户确认后生效）
 */

import { db } from "@/db/client";
import { people, personModels, projects, events } from "@/db/schema";
import { eq, inArray, desc } from "drizzle-orm";
import { INDUSTRY_OPTIONS, COACHING_STYLE_OPTIONS, type WorkspaceProfile } from "@/config/workspace-profile";
import { getSkillsSummaryForContext, getActiveSkillAddendum } from "./skill-registry";
import { JevDecision } from "./jev-decision";
import { matchPlaybooks, formatPlaybooksForContext } from "@/server/knowledge/playbook-matcher";
import { estimateTokens } from "./tokens";

export interface ContextAssembleParams {
  sessionId: string;
  projectId?: string;
  focusedPersonId?: string;
  activeCanvas?: { title: string; content: string; doc_type?: string } | null;
  profile?: Partial<WorkspaceProfile>;
  jevDecision?: JevDecision;
  userQuery?: string;
}

/**
 * 上下文预算截断：估算超 20K Tokens 的文档保留头尾并显式标注省略段。
 * 不写临时文件——模型没有任何工具能把落盘内容读回来，那种"自主调阅"不会发生。
 */
export function truncateForContext(text: string, headLines = 40, tailLines = 20): string {
  if (estimateTokens(text) < 20000) {
    return text;
  }

  const lines = text.split("\n");
  if (lines.length > headLines + tailLines) {
    const omitted = lines.length - headLines - tailLines;
    return `${lines.slice(0, headLines).join("\n")}

【Harness 上下文预算保护：中段约 ${omitted} 行已省略，未做任何摘要归纳；完整内容以右侧 Canvas 活文档为准】

${lines.slice(-tailLines).join("\n")}`;
  }

  // 行数不多但单行超长：按字符头尾保留
  const head = text.slice(0, 30000);
  const tail = text.slice(-10000);
  return `${head}

【Harness 上下文预算保护：中段约 ${Math.max(text.length - 40000, 0)} 字符已省略，未做任何摘要归纳；完整内容以右侧 Canvas 活文档为准】

${tail}`;
}

const BASE_PHILOSOPHY = `你是「旁白」，一位清醒、真诚、懂职场人性的 AI 职场导师。
你既精通产品经理从 0 到 1 的需求梳理、PRD 与 Canvas 文档架构，又深谙大厂跨部门博弈、利益格局推演、向上汇报与高情商体面沟通。
明确区分事实与推断，不编造人物、事件与证据。像一位经验丰富的资深业务架构师在并肩作战。

【核心回答形态与格式契约规范（必须严格遵守）】：
1. 【建议话术卡片规范】：
   - 引用语法（> "话术内容..."）只能且必须用于向用户提供“可直接复制发出给领导或同事”的具体沟通建议。
   - 严禁将导师自己的寒暄、说明、分析或开场白塞入引用块（>）中！
2. 【右侧 Canvas 方案与文档大纲生成契约】：
   - 当用户要求“梳理项目大纲骨架”、“在右侧 Canvas 生成方案/PRD/复盘文档”时，严禁在正文输出“（系统自动在右侧Canvas生成...）”等口头伪动作！
   - 你必须直接且规范地以标准 YAML Frontmatter 格式输出文档骨架，系统前端将自动捕获该格式并实时在右侧 Canvas 展开加载：
   ---
   title: "项目名称-核心大纲与落地方案.md"
   type: "prd"
   expected_solution: "此处提炼预期方案目标与底线"
   ---
   # 文档正式标题
   ## 1. 项目背景与交付目标
   ## 2. 核心干系人与协作矩阵
   ## 3. 关键里程碑排期
   ## 4. 风险排查与 Plan B 兜底策略
3. 【实体引用与因果溯源（关键！）】：
   - 引用真实世界模型中的人物时，必须使用标准超链语法 [姓名](person:ID)，如 [李雷](person:user_id)。
   - 当分析某人言行并发现历史上有过类似事件时，你必须主动引用真实历史证据：
     * [具体事件或时间描述](evidence:ID)，例如 [7月8日也发生过一次](evidence:ev_004)
   - 这样用户点击超链接即可穿透查看你做出该推断的前因后果与事实证据。`;

/**
 * 组装高能 Agent Harness 上下文
 */
export async function assembleHarnessContext(params: ContextAssembleParams): Promise<string> {
  const {
    projectId,
    focusedPersonId,
    activeCanvas,
    profile,
    jevDecision,
    userQuery = "",
  } = params;

  let prompt = BASE_PHILOSOPHY;

  // 1. 注入用户工作区基调与风格偏好 (Drawer 0)
  if (profile) {
    const industryItem = INDUSTRY_OPTIONS.find((i) => i.key === profile.industry);
    const styleItem = COACHING_STYLE_OPTIONS.find((s) => s.key === profile.style);
    const coachingNotes = profile.coachingNotes || [];
    const coachingNotesBlock =
      coachingNotes.length > 0
        ? `- 已确认辅导偏好（用户逐条确认沉淀，优先级最高）:\n${coachingNotes.map((n) => `  · ${n}`).join("\n")}\n`
        : "";
    prompt += `\n\n【用户与工作区专属辅导设定】:
- 工作区/用户称谓: ${profile.name || "我的工作区"}
- 所属业务行业: ${industryItem ? `${industryItem.label}（${industryItem.contextNote}）` : "通用互联网/科技"}
- 期望辅导风格: ${styleItem ? `${styleItem.label}（${styleItem.promptGuidance}）` : "沉稳军师型"}
${coachingNotesBlock}请在后续沟通与方案产出中严格贯穿该行业特征与辅导基调。`;
  }

  // 2. 注入双轨制技能元数据 (渐进式披露 Metadata)
  prompt += `\n\n${getSkillsSummaryForContext()}`;

  // 3. Jev 决策层判定与当前激活 Skill 的完整 SOP
  if (jevDecision && jevDecision.choice !== "direct_chat") {
    prompt += `\n\n【Jev 预决策层裁决结果】:
- 命中目标技能: ${jevDecision.choice}
- 任务复杂度评分: ${jevDecision.score}/100
- 路由论据: ${jevDecision.rationale}`;

    const skillAddendum = getActiveSkillAddendum(jevDecision.choice);
    if (skillAddendum) {
      prompt += `\n\n${skillAddendum}`;
    }
  }

  // 4. 干系人与世界模型 JIT 供给 (Drawer 1)
  try {
    let targetPeopleIds: string[] = [];

    if (projectId) {
      const pList = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
      if (pList.length > 0 && pList[0].stakeholdersJson) {
        try {
          const parsed = JSON.parse(pList[0].stakeholdersJson);
          if (Array.isArray(parsed)) {
            targetPeopleIds = parsed.map((m: { id?: string }) => m.id).filter(Boolean) as string[];
          }
        } catch {
          // ignore
        }
      }
    }

    if (focusedPersonId && !targetPeopleIds.includes(focusedPersonId)) {
      targetPeopleIds.push(focusedPersonId);
    }

    const relevantPeople = targetPeopleIds.length > 0
      ? await db.select().from(people).where(inArray(people.id, targetPeopleIds))
      : await db.select().from(people).limit(5);

    if (relevantPeople.length > 0) {
      prompt += `\n\n【核心干系人与心理模式世界模型 (Workplace CRM)】:`;
      for (const p of relevantPeople) {
        const models = await db.select().from(personModels).where(eq(personModels.personId, p.id)).limit(2);
        prompt += `\n• 干系人: [${p.name}](person:${p.id}) (${p.role || "同事"}, 归属组织: ${p.department || "未知"})`;
        if (models.length > 0) {
          prompt += `\n  - 已沉淀模式: ${models.map((m) => `「${m.pattern}」(置信度 ${(m.confidence * 100).toFixed(0)}%)`).join("; ")}`;
        }
      }
    }
  } catch (err) {
    console.error("ContextEngine: Failed to fetch stakeholders:", err);
  }

  // 4b. 战法武器库 JIT 检索 (Drawer 1 增强：《职场提升》语料战法卡按需注入)
  if (userQuery) {
    const matchedPlaybooks = matchPlaybooks(userQuery, 2);
    if (matchedPlaybooks.length > 0) {
      prompt += `\n\n${formatPlaybooksForContext(matchedPlaybooks)}`;
    }
  }

  // 5. 激活的 Canvas 上下文与预算截断 (Drawer 3)
  if (activeCanvas && activeCanvas.content) {
    const processedCanvasContent = truncateForContext(activeCanvas.content);
    prompt += `\n\n【用户当前在右侧 Canvas 打开并聚焦的活文档】:
- 文档标题: ${activeCanvas.title}
- 文档类型: ${activeCanvas.doc_type || "prd/markdown"}
- 文档内容切片:
${processedCanvasContent}`;
  }

  // 6. 近期事实素材切片 (Drawer 4: 群聊/会议/评审/事件)
  try {
    const recentEvents = projectId
      ? await db.select().from(events).where(eq(events.projectId, projectId)).orderBy(desc(events.createdAt)).limit(5)
      : await db.select().from(events).orderBy(desc(events.createdAt)).limit(3);

    if (recentEvents.length > 0) {
      prompt += `\n\n【近期录入的事实素材与事件记录 (Drawer 4)】:`;
      for (const evt of recentEvents) {
        const typeLabel = evt.type === "chat" ? "聊天记录" : evt.type === "meeting" ? "会议纪要" : evt.type === "review" ? "研发对接" : "突发事件";
        const contentPreview = evt.content.length > 200 ? evt.content.slice(0, 200) + "..." : evt.content;
        prompt += `\n• [${typeLabel}] ${evt.title} (${evt.createdAt || "近期"}):\n  ${contentPreview}`;
      }
    }
  } catch (err) {
    console.error("ContextEngine: Failed to load recent events:", err);
  }

  return prompt;
}

/**
 * 历史消息预算裁剪：估算超限时保留首轮背景与最新 4 条，
 * 中间轮以逐轮中性存根替换——机械省略，不伪造任何共识或结论。
 */
export function pruneMessagesForTokenBudget(
  rawMessages: Array<{ role: string; content: string }>,
  maxAllowedTokens = 12000,
): Array<{ role: string; content: string }> {
  if (!rawMessages || rawMessages.length <= 4) {
    return rawMessages || [];
  }

  const estTokens = estimateTokens(rawMessages.map((m) => m.content || "").join(""));

  if (estTokens <= maxAllowedTokens) {
    return rawMessages;
  }

  const firstUser = rawMessages[0];
  const tailMessages = rawMessages.slice(-4);
  const middleMessages = rawMessages.slice(1, -4);

  const stubMessages = middleMessages.map((m) => ({
    role: m.role,
    content: `[历史内容已因上下文预算省略 | ${m.role === "user" ? "用户" : "导师"}原话开头: ${(m.content || "").slice(0, 40)}… | 此为机械存根，不代表双方已达成任何共识或结论]`,
  }));

  return [firstUser, ...stubMessages, ...tailMessages];
}
