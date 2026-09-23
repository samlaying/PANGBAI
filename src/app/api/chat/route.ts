import { NextRequest } from "next/server";
import { assembleCoachContext } from "@/server/agent/context-assembler";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { messages, activeCanvas, activeProject, projectId } = await req.json();

    const targetProjectId = projectId || (activeProject ? activeProject.id : "recruitment-agent");

    // 动态从数据库和当前工作区组装权威 System Prompt
    const systemPrompt = await assembleCoachContext({
      projectId: targetProjectId,
      activeCanvas,
    });

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
        { status: 502, headers: { "Content-Type": "application/json" } }
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
