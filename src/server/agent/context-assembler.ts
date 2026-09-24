import { db } from "@/db/client";
import { people, personModels, projects, projectArtifacts, evidence } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { INDUSTRY_OPTIONS, COACHING_STYLE_OPTIONS, type WorkspaceProfile } from "@/config/workspace-profile";

export interface ActiveCanvasContext {
  id?: string;
  title: string;
  content: string;
  doc_type?: string;
}

export interface AssembleContextOptions {
  projectId?: string;
  focusedPersonId?: string;
  activeCanvas?: ActiveCanvasContext | null;
  profile?: Partial<WorkspaceProfile>;
}

const COACH_BASE_PHILOSOPHY = `你是「旁白」，一位清醒、真诚、懂职场人性的 AI 职场导师。基于用户提供的事实、人物档案与项目文档回答。
明确区分事实和推断，不编造人物、项目、事件或证据。像一位懂你的资深同事在交流，给出针对性、可执行的破局与沟通建议。

【核心回答形态与契约规范（必须严格遵守）】：
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
3. 【常规排版】：
   - 对话区就是 Markdown 渲染区。严禁将整个回复或框架包裹在 \`\`\`markdown 代码块中输出！直接使用自然段落、有序列表（1. 2.）、圆点列表（•）与加粗。
4. 【实体引用与因果溯源（关键！）】：
   - 引用真实世界模型中的人物时，必须使用标准超链接语法 [姓名](person:ID)，如 [李雷](person:user_id)。
   - 当分析某人言行并发现历史上有过类似事件时，你必须主动引用真实历史证据：
     * [具体事件或时间描述](evidence:ID)，例如 [7月8日也发生过一次](evidence:ev_004)
     * 关联证据卡片行：关联证据 EVIDENCE · {序号} {人物名} · {行为模式关键词} · {置信度}%
   - 这样用户点击超链接即可穿透查看你做出该推断的前因后果与事实证据。`;

/**
 * 动态组装 Coach Agent 的 System Prompt，打通真实数据库世界模型与 Canvas 实时工作区
 */
export async function assembleCoachContext(options: AssembleContextOptions = {}): Promise<string> {
  const { projectId, focusedPersonId, activeCanvas, profile } = options;

  let prompt = COACH_BASE_PHILOSOPHY;

  // 0. 工作区初始化基调：【名称、风格、行业】映射注入
  if (profile) {
    const industryItem = INDUSTRY_OPTIONS.find((i) => i.key === profile.industry);
    const styleItem = COACHING_STYLE_OPTIONS.find((s) => s.key === profile.style);

    prompt += `\n\n【用户与工作区专属辅导设定】:
- 工作区/用户称谓: ${profile.name || "我的工作区"}
- 所属业务行业: ${industryItem ? `${industryItem.label}（${industryItem.contextNote}）` : "通用行业"}
- 期望辅导风格: ${styleItem ? `${styleItem.label}（${styleItem.promptGuidance}）` : "沉稳军师型"}
请在后续全部沟通、分析与建议中，严格贯彻该行业的业务思维特征，并始终保持上述辅导风格的沟通基调！`;
  }

  // 1. 项目级干系人与因果历史按需 JIT 供给 (只加载与本上下文相关的干系人)
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

    // 根据靶向 ID 检索干系人；若无指定靶向，兜底加载前 6 位，绝不无节制全量倾倒
    const relevantPeople = targetPeopleIds.length > 0
      ? await db.select().from(people).where(inArray(people.id, targetPeopleIds))
      : await db.select().from(people).limit(6);

    if (relevantPeople.length > 0) {
      prompt += `\n\n【涉事核心干系人与行为心理模型】:`;
      for (const p of relevantPeople) {
        const models = await db
          .select()
          .from(personModels)
          .where(eq(personModels.personId, p.id));

        const patternsStr = models
          .map((m) => `${m.pattern} (置信度 ${Math.round(m.confidence * 100)}%)`)
          .join("； ");

        prompt += `\n- [${p.name}](person:${p.id})：${p.role} · ${p.department || "部门"}。关系：${p.relationshipTone || "协同"}。已归纳行为模式：${patternsStr || "持续观察中"}。备忘：${p.advice || "无"}`;

        // 提取该干系人最近 3 条带因果归因的证据链
        const personEvidence = await db
          .select()
          .from(evidence)
          .where(eq(evidence.personId, p.id))
          .limit(3);

        if (personEvidence.length > 0) {
          prompt += `\n  历史因果证据（可供你在回复中以 [描述](evidence:ID) 格式引用）：`;
          for (const ev of personEvidence) {
            prompt += `\n  * 证据 [${ev.id}] (${ev.dateStr || "近期"}·${ev.source})：${ev.observation}${ev.rationale ? ` [心理归因: ${ev.rationale}]` : ""}`;
          }
        }
      }
    }
  } catch (err) {
    console.warn("Error fetching people for context assembler:", err);
  }

  // 2. 注入当前聚焦的项目与已有活产物上下文（跨会话感知）
  if (projectId) {
    try {
      const pList = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
      if (pList.length > 0) {
        const proj = pList[0];
        let risks = [];
        try {
          risks = proj.risksJson ? JSON.parse(proj.risksJson) : [];
        } catch {
          // ignore
        }

        prompt += `\n\n【当前聚焦的项目空间】:
项目名称: ${proj.name}
项目状态: ${proj.status} (当前进度 ${proj.progress}%)
截止日期: ${proj.deadline || "未定"}
项目风险清单: ${risks.map((r: { title: string; note: string }) => `${r.title} (${r.note})`).join("； ") || "无待处理重大风险"}
旁白策略备忘: ${proj.advice || "无"}`;

        // 读取项目下的全部产物
        const artifacts = await db
          .select()
          .from(projectArtifacts)
          .where(eq(projectArtifacts.projectId, projectId));

        if (artifacts.length > 0) {
          prompt += `\n\n【该项目下已归档/正在协同的活文档与产物】:`;
          for (const art of artifacts) {
            let fm: Record<string, unknown> = {};
            try {
              fm = art.frontmatterJson ? JSON.parse(art.frontmatterJson) : {};
            } catch {
              // ignore
            }

            const stakeholders = Array.isArray(fm.stakeholders) ? fm.stakeholders.join(", ") : "未指定";
            const expSolution = (fm.expected_solution as string) || "待补齐";

            prompt += `\n- 《${art.title}》 (类型: ${art.docType}, 状态: ${fm.progress || "进行中"}, 涉及人: ${stakeholders})
  预期方案解法: ${expSolution}`;
          }
        }
      }
    } catch (err) {
      console.warn("Error fetching project context for assembler:", err);
    }
  }

  // 3. 动态挂载当前用户正在 Canvas 中编辑的工作文档 (Working Document Context)
  if (activeCanvas && activeCanvas.content) {
    // 提取标题大纲 (TOC) 以便极低 Token 消耗掌握全局
    const toc = activeCanvas.content
      .split("\n")
      .filter((line) => /^#{1,3}\s/.test(line))
      .slice(0, 10)
      .join("\n");

    const contentSnippet = activeCanvas.content.length > 3000
      ? activeCanvas.content.slice(0, 3000) + "\n\n... (后续章节通过大纲引用)"
      : activeCanvas.content;

    prompt += `\n\n【当前用户正在编辑的工作文档 Canvas】:
文档名称: ${activeCanvas.title || "未命名文档"}
${toc ? `文档大纲目录 (TOC):\n${toc}\n` : ""}
文档内容切片:
\`\`\`markdown
${contentSnippet}
\`\`\`
重要注意：用户正与你在该文档旁边双线协作。若涉及方案修改或排期确认，请基于该文档提出具体破局与修改建议！`;
  }

  return prompt;
}
