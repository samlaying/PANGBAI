import type { AgentEvent } from "./agent-protocol";

export interface SSETransportOptions {
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

export type EventHandler = (event: AgentEvent) => void;

/**
 * SSETransport
 * 独立的网络通讯层：封装 ReadableStream 分包解析、TextDecoder 缓冲、心跳及错误兜底。
 * 上层无需感知网络断包或 HTTP 连接细节。
 */
export class SSETransport {
  /**
   * 建立 SSE 连接并以 Event 形式推送给回调
   */
  async stream(
    url: string,
    payload: unknown,
    onEvent: EventHandler,
    options?: SSETransportOptions,
  ): Promise<void> {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream, text/plain",
        ...options?.headers,
      },
      body: JSON.stringify(payload),
      signal: options?.signal,
    });

    if (!response.ok || !response.body) {
      throw new Error(`SSE transport failed with status ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // 处理标准 SSE 格式: "event: ...\ndata: ...\n\n" 或 "\n\n" 分隔的消息
        const parts = buffer.split("\n\n");
        // 保留未结束的碎片到 buffer 中
        buffer = parts.pop() || "";

        for (const rawBlock of parts) {
          const trimmed = rawBlock.trim();
          if (!trimmed) continue;

          this.parseAndDispatchSSEBlock(trimmed, onEvent);
        }
      }

      // 处理流结束前残余的 buffer
      if (buffer.trim()) {
        this.parseAndDispatchSSEBlock(buffer.trim(), onEvent);
      }
    } finally {
      reader.releaseLock();
    }
  }

  private parseAndDispatchSSEBlock(block: string, onEvent: EventHandler): void {
    let eventType: string | null = null;
    let dataStr = "";

    const lines = block.split("\n");
    for (const line of lines) {
      if (line.startsWith("event:")) {
        eventType = line.replace(/^event:\s*/, "").trim();
      } else if (line.startsWith("data:")) {
        const dataPart = line.replace(/^data:\s*/, "");
        dataStr = dataStr ? `${dataStr}\n${dataPart}` : dataPart;
      }
    }

    if (dataStr) {
      try {
        const parsed = JSON.parse(dataStr);
        if (eventType) {
          parsed.type = eventType;
        }
        onEvent(parsed as AgentEvent);
        return;
      } catch {
        // 非 JSON 格式，回退为文本增量事件
        onEvent({
          type: "message.delta",
          delta: dataStr,
          timestamp: Date.now(),
        });
        return;
      }
    }

    // 若无标准 data: 前缀，可能是简版纯文本流
    onEvent({
      type: "message.delta",
      delta: block,
      timestamp: Date.now(),
    });
  }
}

export const sseTransport = new SSETransport();
