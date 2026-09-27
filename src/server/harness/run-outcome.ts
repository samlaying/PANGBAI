/**
 * PANGBAI Harness · 运行终态分类器
 *
 * 铁律：流结束（idle）≠ 回合成功。终态必须由独立分类器依据真实信号
 * （客户端断连、上游异常、空回复）裁决，而不是无条件按 success 结算。
 */

export type RunStatus = "success" | "aborted" | "failed";

export type FinishReason =
  | "stop"
  | "empty_reply"
  | "client_disconnect"
  | "upstream_error"
  | "gate_retry_exhausted";

export interface RunOutcome {
  status: RunStatus;
  finishReason: FinishReason;
  errorMessage?: string;
  errorCode?: string;
}

export interface RunOutcomeInput {
  /** req.signal.aborted 或 emitter 检测到流已关闭 */
  clientDisconnected: boolean;
  /** 读流过程中抛出的异常（未定义表示读流正常结束） */
  streamError?: unknown;
  /** 实际累积的回复字符数 */
  replyChars: number;
  /** 流头门禁重试后仍违约（用户已收到合成修复版输出） */
  gateRetryExhausted?: boolean;
}

export function classifyRunOutcome(input: RunOutcomeInput): RunOutcome {
  const { clientDisconnected, streamError, replyChars, gateRetryExhausted } = input;

  if (clientDisconnected) {
    return {
      status: "aborted",
      finishReason: "client_disconnect",
      errorMessage: "客户端已断开连接",
      errorCode: "CLIENT_DISCONNECT",
    };
  }

  if (streamError !== undefined) {
    const message = streamError instanceof Error ? streamError.message : String(streamError);
    return {
      status: "failed",
      finishReason: "upstream_error",
      errorMessage: message,
      errorCode: "UPSTREAM_READ",
    };
  }

  if (replyChars === 0) {
    return {
      status: "failed",
      finishReason: "empty_reply",
      errorMessage: "上游模型返回了空回复",
      errorCode: "EMPTY_REPLY",
    };
  }

  if (gateRetryExhausted) {
    // 降级成功：两次违约后用户仍收到了合成 frontmatter 修复版输出
    return { status: "success", finishReason: "gate_retry_exhausted" };
  }

  return { status: "success", finishReason: "stop" };
}

/**
 * 面向客户端的错误文案：只输出按 finishReason 归类的固定话术，
 * 绝不透传底层异常字符串（可能含内部端点、堆栈或网关响应片段）。
 * 原始 errorMessage 仅供服务端日志与 trace metadataJson 使用。
 */
export function clientVisibleErrorMessage(outcome: RunOutcome): string {
  switch (outcome.finishReason) {
    case "client_disconnect":
      return "客户端已断开连接";
    case "empty_reply":
      return "上游模型返回了空回复，请重试";
    case "upstream_error":
      return "上游模型服务连接异常，本轮回复中断";
    default:
      return "流式生成中断";
  }
}
