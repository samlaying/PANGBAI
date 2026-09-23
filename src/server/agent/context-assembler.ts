import { db } from "@/db/client";
import { people, personModels, projects, projectArtifacts } from "@/db/schema";
import { eq } from "drizzle-orm";

export interface ActiveCanvasContext {
  id?: string;
  title: string;
  content: string;
  doc_type?: string;
}

export interface AssembleContextOptions {
  projectId?: string;
  activeCanvas?: ActiveCanvasContext | null;
}

const COACH_BASE_PHILOSOPHY = `你是一位顶级个人 AI 职场导师，名字叫「旁白」。
你的服务对象是张明（一位产品经理/前端研发背景的互联网职场人）。

【你的核心认知与指导原则】：
1. 目标导向：最大程度减少职场冲突，促进跨部门协同与向上管理对齐。
2. 处事哲学：
   - 不卑不亢，绝不盲目找借口推脱，也绝不无底线死扛。
   - 当众被追问时：群里给足台阶（先简短接住承诺 + 给明确时间线），细节主动移入私下一对一沟通。
   - 跨部门对齐时：永远带着方案取舍（Trade-off，方案A保核心、方案B全量延后），变单选题为多选题，将决策掌控感交还给对方。
   - 向上管理时：领导最反感的往往不是延期，而是「最后时刻才知道风险」。永远保持提前同步、小步快跑。
3. 文本与排版规范（Editorial 杂志风）：
   - 提及具体人物时，使用实体下钻格式：[王总](person:wang)、[李总](person:li)、[张哥](person:zhang)。
   - 给出直接可复制的破局话术时，必须使用 Markdown 引用语法：
     > 话术内容...
   - 语言克制、深刻、有同理心，分段清晰，拒绝无意义的套话和机械罗列。
4. 【关于打磨高质量 PRD 与方案架构的核心指导原则】：
   当用户提出关于撰写、梳理、打磨 PRD、需求方案或复盘时：
   - 绝不机械输出几千字冗长空洞的套话，保持轻快灵活，不给用户增加认知负担。
   - 第一步：先给出「预期方案与取舍（Expected Solution & Trade-offs）」：明确预期做成什么方案、面临时间或资源限制时的 Plan B 兜底策略。
   - 第二步：输出结构清晰的「文档大体架构骨架（Skeleton Outline）」，方便用户只需补充细节。
   - 第三步：附带规范的 YAML Frontmatter 头部结构，便于作为项目资产挂载和检索！`;

/**
 * 动态组装 Coach Agent 的 System Prompt，打通真实数据库世界模型与 Canvas 实时工作区
 */
export async function assembleCoachContext(options: AssembleContextOptions = {}): Promise<string> {
  const { projectId, activeCanvas } = options;

  let prompt = COACH_BASE_PHILOSOPHY;

  // 1. 从真实数据库提取核心干系人世界模型
  try {
    const allPeople = await db.select().from(people);
    if (allPeople.length > 0) {
      prompt += `\n\n【已掌握的职场世界模型】:`;
      for (const p of allPeople) {
        const models = await db
          .select()
          .from(personModels)
          .where(eq(personModels.personId, p.id));

        const patternsStr = models
          .map((m) => `${m.pattern} (置信度 ${Math.round(m.confidence * 100)}%)`)
          .join("； ");

        prompt += `\n- [${p.name}](person:${p.id})：${p.role} · ${p.department || "部门"}。关系：${p.relationshipTone || "协同"}。已归纳行为模式：${patternsStr || "正在持续观察中"}。导师备忘：${p.advice || "无"}`;
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
    prompt += `\n\n【当前用户正在编辑的工作文档 Canvas】:
文档名称: ${activeCanvas.title || "未命名文档"}
文档内容:
\`\`\`markdown
${activeCanvas.content}
\`\`\`
重要注意：用户当前正与你在该文档旁边双线协作。若用户询问关于 PRD、方案、排期、技术取舍等问题，请结合该文档的具体内容提出规避冲突、方案取舍、排期同步的专业建议！`;
  }

  return prompt;
}
