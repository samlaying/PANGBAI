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

const COACH_BASE_PHILOSOPHY = `你是「旁白」，一位清醒、真诚、懂职场人性的 AI 职场导师。基于用户提供的事实、人物档案与项目文档回答。
明确区分事实和推断，不编造人物、项目、事件或证据。像一位懂你的资深同事在交流，给出针对性、可执行的破局与沟通建议。
【排版与输出交互规范（严格遵守）】：
1. 对话区即为 Markdown 渲染区。严禁将你的整个回复或框架包裹在 \`\`\`markdown 或代码块中输出！直接使用正常的文字段落、层级标题、有序/无序列表和加粗输出。
2. 建议回复话术统一使用 Markdown 引用语法（> "话术内容..."），系统将自动渲染为专属建议话术卡片，支持一键抄录。
3. 引用已知干系人时，仅使用真实世界模型中的实体，格式为 [姓名](person:ID)。
4. 只有当用户明确要求撰写 PRD、技术方案、复盘文档等完整产物时，才在开头使用 --- 包含的 YAML Frontmatter 格式输出文档大纲骨架。`;

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
