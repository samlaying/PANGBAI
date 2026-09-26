/**
 * PANGBAI Harness · Token 估算器
 *
 * 旧的 chars/3 估算对中文输入低估 2-3 倍（中文约 1-1.5 字/token），
 * 导致 12K 裁剪与 20K Offload 阈值形同虚设。此处改为 CJK 感知启发式：
 * - CJK 字符（含全角标点）≈ 1 token/字
 * - 其余字符 ≈ 4 字符/token
 *
 * 仍是启发式而非精确分词；llmCallTraces 侧优先记录 provider 返回的真实 usage，
 * 本函数仅在 provider 未返回时兜底。
 */

const CJK_CHAR_RE = /[一-鿿㐀-䶿　-〿＀-￯]/g;

export function estimateTokens(text: string): number {
  if (!text) return 0;
  const cjkMatches = text.match(CJK_CHAR_RE);
  const cjk = cjkMatches ? cjkMatches.length : 0;
  const rest = text.length - cjk;
  return cjk + Math.ceil(rest / 4);
}
