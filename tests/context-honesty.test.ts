import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { truncateForContext, pruneMessagesForTokenBudget } from "../src/server/harness/context-engine";
import { estimateTokens } from "../src/server/harness/tokens";

function bigChineseDoc(lineCount: number, charsPerLine: number): string {
  const lines: string[] = [];
  for (let i = 0; i < lineCount; i++) {
    lines.push(`第${i}行：` + "架构与博弈".repeat(Math.ceil(charsPerLine / 5)));
  }
  return lines.join("\n");
}

test("truncateForContext keeps head and tail with an explicit elision marker and writes no scratch file", () => {
  // 200 行 × ~200 CJK 字 ≈ 40K tokens，超 20K 阈值
  const doc = bigChineseDoc(200, 200);
  assert.ok(estimateTokens(doc) >= 20000, "fixture must exceed the 20K budget");

  // 清理历史遗留的 offload 目录，证明不再有任何落盘行为
  const offloadDir = path.join(os.tmpdir(), "pangbai_harness_offload");
  fs.rmSync(offloadDir, { recursive: true, force: true });

  const result = truncateForContext(doc);

  assert.match(result, /已省略/);
  assert.match(result, /未做任何摘要归纳/);
  assert.match(result, /第0行/);
  assert.match(result, /第199行/);
  assert.doesNotMatch(result, /第100行/);
  // 诚实性核心：不再出现"请指明章节"式的伪自主调阅话术
  assert.doesNotMatch(result, /指明.*章节/);
  // 不落盘
  assert.equal(fs.existsSync(offloadDir), false);
});

test("truncateForContext returns short documents unchanged", () => {
  const doc = bigChineseDoc(20, 100);
  assert.equal(truncateForContext(doc), doc);
});

test("pruneMessagesForTokenBudget stubs middle turns without claiming consensus", () => {
  // 10 条消息 × ~2200 CJK 字 ≈ 22K tokens，超 12K 预算
  const messages = Array.from({ length: 10 }, (_, i) => ({
    role: i % 2 === 0 ? "user" : "assistant",
    content: `话题${i}的完整陈述：` + "细节展开".repeat(550),
  }));

  const pruned = pruneMessagesForTokenBudget(messages, 12000);

  // 首轮背景与最新 4 条原样保留
  assert.equal(pruned[0], messages[0]);
  const tail = pruned.slice(-4);
  for (let i = 0; i < 4; i++) {
    assert.equal(tail[i], messages[6 + i]);
  }

  // 中间轮替换为逐轮中性存根
  const stubs = pruned.slice(1, -4);
  assert.equal(stubs.length, 5);
  for (const stub of stubs) {
    assert.match(stub.content, /已因上下文预算省略/);
    assert.match(stub.content, /不代表.*共识/);
    assert.match(stub.content, /原话开头/);
  }

  // 诚实性核心：旧实现的固定文案"已妥善达成共识并推动至当前状态"绝不允许再出现
  const allText = pruned.map((m) => m.content).join("\n");
  assert.doesNotMatch(allText, /已妥善达成共识/);
});

test("pruneMessagesForTokenBudget leaves short histories untouched", () => {
  const messages = [
    { role: "user", content: "你好" },
    { role: "assistant", content: "你好，我是旁白。" },
    { role: "user", content: "继续" },
    { role: "assistant", content: "请讲。" },
  ];
  assert.equal(pruneMessagesForTokenBudget(messages, 12000), messages);
});
