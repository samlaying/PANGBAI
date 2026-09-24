import { NextRequest } from "next/server";
import { assembleCoachContext } from "@/server/agent/context-assembler";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { messages, activeCanvas, activeProject, projectId } = await req.json();

    const targetProjectId = projectId || activeProject?.id;

    // 动态从数据库和当前工作区组装权威 System Prompt
    const systemPrompt = await assembleCoachContext({
      projectId: targetProjectId,
      activeCanvas,
    });

    const apiKey = process.env.SILICONFLOW_API_KEY;
    if (!apiKey) return new Response(JSON.stringify({ error: "Chat service is not configured" }), { status: 503, headers: { "Content-Type": "application/json" } });
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
    let pending = "";

    const emitLine = (line: string, controller: TransformStreamDefaultController<Uint8Array>) => {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) return;
      const payload = trimmed.slice(5).trim();
      if (!payload || payload === "[DONE]") return;
      try {
        const data = JSON.parse(payload);
        const content = data.choices?.[0]?.delta?.content;
        if (typeof content === "string" && content) controller.enqueue(encoder.encode(content));
      } catch {
        // 跳过上游无效事件；完整事件会在换行后才进入此处
      }
    };

    const transformStream = new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        pending += decoder.decode(chunk, { stream: true });
        let newline = pending.indexOf("\n");
        while (newline !== -1) {
          emitLine(pending.slice(0, newline), controller);
          pending = pending.slice(newline + 1);
          newline = pending.indexOf("\n");
        }
      },
      flush(controller) {
        pending += decoder.decode();
        if (pending) emitLine(pending, controller);
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
