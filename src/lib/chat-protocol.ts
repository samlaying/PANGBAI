/* ── /api/chat 流式协议 ── */

const NUL = String.fromCharCode(0);

/**
 * 流末尾 meta 标记：正文流结束后，服务端追加 `标记 + JSON`（token 用量等）。
 * 以 NUL 界定，模型正文不会出现该字符；源码中用 fromCharCode 构造，
 * 避免文件里混入不可见控制字节。
 */
export const STREAM_META_MARKER = `${NUL}PB_META${NUL}`;
