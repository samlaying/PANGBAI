import { NextRequest } from "next/server";

export const runtime = "nodejs";

const SYSTEM_PROMPT_BASE = `你是一位顶级个人 AI 职场导师，名字叫「旁白」。
你的服务对象是张明（一位产品经理/前端研发背景的互联网职场人）。

【你的核心认知与指导原则】：
1. 目标导向：最大程度减少职场冲突，促进跨部门协同与向上管理对齐。
2. 处事哲学：
   - 不卑不亢，绝不盲目找借口推脱，也绝不无底线死扛。
   - 当众被追问时：群里给足台阶（先简短接住承诺 + 给明确时间线），细节主动移入私下一对一沟通。
   - 跨部门对齐时：永远带着方案取舍（Trade-off，方案A保核心、方案B全量延后），变单选题为多选题，将决策掌控感交还给对方。
   - 向上管理时：领导最反感的往往不是延期，而是「最后时刻才知道风险」。永远保持提前同步、小步快跑。
3. 文本与排版规范（Editorial 杂志风）：
   - 提及具体人物时，使用格式：[王总](person:wang)、[李总](person:li)、[张哥](person:zhang)。
   - 给出直接可复制的破局话术时，必须使用 Markdown 引用语法：
     > 话术内容...
   - 语言克制、深刻、有同理心，分段清晰，拒绝无意义的套话和机械罗列。

【已掌握的职场世界模型】：
- 王总：CEO / 业务发起人。风格果断直接，对数据与时间线敏感，极其偏好提前同步风险（置信度82%）。
- 李总：技术VP / 平台负责人。重视技术完整性与工程严谨性，沟通时需带上技术取舍（置信度88%）。
- 张哥：后端技术骨干。承诺必达，执行力强，对清晰明确的需求响应最快。
- 当前重点项目：招聘 Agent v2（卡点在数据标注，进度约65%，存在延期交付风险）。`;

export async function POST(req: NextRequest) {
  try {
    const { messages, activeCanvas, activeProject, projectArtifacts } =
      await req.json();

    let systemPrompt = SYSTEM_PROMPT_BASE;

    // 注入当前关联的项目与已有产物上下文（跨会话感知）
    if (activeProject) {
      systemPrompt += `\n\n【当前聚焦的项目空间】
项目名称: ${activeProject.name}
项目状态: ${activeProject.status || "进行中"} (当前进度 ${activeProject.progress || 0}%)
截止日期: ${activeProject.deadline || "未定"}
项目风险清单: ${(activeProject.risks || []).map((r: { title: string; note: string }) => `${r.title} (${r.note})`).join("； ") || "无待处理重大风险"}
旁白策略备忘: ${activeProject.advice || "无"}

【该项目下已归档/正在协同的活文档与产物】:
${(projectArtifacts || [])
  .map(
    (art: {
      title: string;
      frontmatter?: {
        type?: string;
        progress?: string;
        expected_solution?: string;
        stakeholders?: string[];
      };
    }) =>
      `- 《${art.title}》 (类型: ${art.frontmatter?.type || "文档"}, 状态: ${art.frontmatter?.progress || "进行中"}, 涉及人: ${(art.frontmatter?.stakeholders || []).join(", ")})
  预期方案解法: ${art.frontmatter?.expected_solution || "待补齐"}`
  )
  .join("\n")}

【关于打磨高质量 PRD 与方案架构的核心指导原则】:
当用户提出关于撰写、梳理、打磨 PRD、需求方案或复盘时：
1. **绝不机械输出几千字冗长空洞的套话**，保持轻快灵活，不给用户增加认知负担。
2. **第一步：先给出「预期方案与取舍（Expected Solution & Trade-offs）」**：
   清晰阐明我们预期做成什么方案、核心业务机制是什么，以及面临时间或资源限制时的 Trade-off（如方案 A 保期 vs 方案 B 全量），把控领导（如王总）与协作方（如李总）的预期。
3. **第二步：输出结构清晰的「文档大体架构骨架（Skeleton Outline）」**：
   给出各层级骨架标题与精简的提示点，方便用户只需补充细节即可完成高质量产出。
4. **第三步：提供规范的 YAML Frontmatter 头部结构**（包含 title, type, date, progress, stakeholders, expected_solution, risk_points 等），便于作为项目资产挂载和检索！`;
    }

    // 若当前正在编辑 Canvas（如 PRD、方案），动态挂载为当前核心工作文档
    if (activeCanvas && activeCanvas.content) {
      systemPrompt += `\n\n【当前用户正在编辑的工作文档 Canvas】
文档名称: ${activeCanvas.title || "未命名文档"}
文档内容:
\`\`\`markdown
${activeCanvas.content}
\`\`\`
注意：用户当前正与你在该文档旁边协作。若用户询问关于 PRD、方案、排期等问题，请结合该文档的具体内容提出规避冲突、方案取舍、排期同步的专业建议！`;
    }

    const apiKey =
      process.env.SILICONFLOW_API_KEY ||
      "sk-nnrmbvsitmenuyixeywlohhczbwntzprzgivbwligexpssji";
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
        { status: 502, headers: { "Content-Type": "application/json" } },
      );
    }

    // 将上游流式数据转换为标准的文本流返回给前端
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const transformStream = new TransformStream({
      async transform(chunk, controller) {
        const text = decoder.decode(chunk, { stream: true });
        const lines = text.split("\n");
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === "data: [DONE]") continue;
          if (trimmed.startsWith("data: ")) {
            try {
              const data = JSON.parse(trimmed.slice(6));
              const delta = data.choices?.[0]?.delta;
              const content = delta?.content || delta?.reasoning_content;
              if (content) {
                controller.enqueue(encoder.encode(content));
              }
            } catch {
              // 忽略畸变 chunk
            }
          }
        }
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
