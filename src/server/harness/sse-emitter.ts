/**
 * PANGBAI Harness · SSE 安全发射器
 *
 * 客户端断开后 controller.enqueue 会抛错并使异常穿透 start()，
 * 导致无终态事件、无落库。本模块把 enqueue 包进 try/catch：
 * 一旦抛错即标记 closed，调用方据此停止推送并按 aborted 结算。
 */

export function sseChunk(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export interface SafeSseEmitter {
  /** 返回 false 表示流已关闭（客户端断开），调用方应停止后续推送 */
  emit(event: string, data: unknown): boolean;
  readonly closed: boolean;
}

export function createSseEmitter(
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
): SafeSseEmitter {
  let closed = false;
  return {
    get closed() {
      return closed;
    },
    emit(event: string, data: unknown) {
      if (closed) return false;
      try {
        controller.enqueue(encoder.encode(sseChunk(event, data)));
        return true;
      } catch {
        closed = true;
        return false;
      }
    },
  };
}
