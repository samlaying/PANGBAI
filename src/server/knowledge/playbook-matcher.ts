/**
 * PANGBAI · 职场战法匹配器 (Playbook Matcher)
 *
 * 核心特性：
 * 1. 毫秒级内存检索 126 篇实战战法库
 * 2. 深度契合 use_when 员工人话场景与实战情况表
 * 3. 产出高度提炼的 Drawer 1 战法上下文，让导师给出精准的博弈与对齐话术
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { ParsedPlaybook } from "../../../scripts/sync-workplace-playbooks";

const CACHE_FILE = path.join(process.cwd(), "src", "server", "knowledge", "playbooks-cache.json");

let cachedPlaybooks: ParsedPlaybook[] | null = null;

export function loadPlaybooks(): ParsedPlaybook[] {
  if (cachedPlaybooks) return cachedPlaybooks;
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const raw = fs.readFileSync(CACHE_FILE, "utf-8");
      cachedPlaybooks = JSON.parse(raw);
      return cachedPlaybooks || [];
    }
  } catch (err) {
    console.warn("Failed to load playbooks cache:", err);
  }
  return [];
}

export interface MatchedPlaybookResult {
  playbook: ParsedPlaybook;
  score: number;
  matchedReason: string;
}

/**
 * 针对用户提问与当前情境，检索最适配的 1~2 张职场战法卡
 */
export function matchPlaybooks(query: string, limit = 2): MatchedPlaybookResult[] {
  const playbooks = loadPlaybooks();
  if (!playbooks || playbooks.length === 0 || !query) return [];

  const lowerQuery = query.toLowerCase();
  const scored: MatchedPlaybookResult[] = [];

  for (const pb of playbooks) {
    let score = 0;
    const reasons: string[] = [];

    // 1. use_when 人话场景匹配 (权重最高)
    const useWhenTriggers = pb.useWhen.split(/[;；,，\n]/).map((t) => t.trim()).filter(Boolean);
    for (const trigger of useWhenTriggers) {
      if (lowerQuery.includes(trigger.toLowerCase())) {
        score += 25;
        reasons.push(`命中人话场景「${trigger}」`);
      } else {
        // 词级细颗粒度匹配
        const subWords = trigger.split(/[\s/]/).filter((w) => w.length >= 2);
        for (const w of subWords) {
          if (lowerQuery.includes(w.toLowerCase())) {
            score += 8;
          }
        }
      }
    }

    // 2. 实体模型匹配 (如 ART、PREP、SCQA、RACI、复盘、画饼、加薪)
    for (const ent of pb.entities) {
      if (lowerQuery.includes(ent.toLowerCase())) {
        score += 20;
        reasons.push(`命中方法论实体「${ent}」`);
      }
    }

    // 3. 标题匹配
    if (lowerQuery.includes(pb.title.toLowerCase()) || pb.title.toLowerCase().includes(lowerQuery)) {
      score += 15;
      reasons.push(`命中战法标题「${pb.title}」`);
    }

    // 4. 关键主题与高频职场意图词
    const highFrequencyKeywords: Record<string, string[]> = {
      排期: ["EP033", "EP029", "EP043", "EP082"],
      催进度: ["EP033", "EP114", "EP128"],
      砍需求: ["EP033", "EP053", "EP090"],
      汇报: ["EP096", "EP033", "EP080", "EP114"],
      向上管理: ["EP033", "EP046", "EP088", "EP128"],
      推延期: ["EP033", "EP053", "EP128"],
      跨部门: ["EP063", "EP029", "EP090"],
      领导: ["EP033", "EP088", "EP046", "EP116"],
      提需求: ["EP128", "EP063", "EP033"],
      谈薪: ["EP031", "EP098", "EP108"],
      加薪: ["EP108", "EP125", "EP031"],
      复盘: ["EP061", "EP097", "EP082"],
    };

    for (const [kw, eps] of Object.entries(highFrequencyKeywords)) {
      if (lowerQuery.includes(kw) && eps.includes(pb.id)) {
        score += 18;
        reasons.push(`命中职场意图「${kw}」`);
      }
    }

    if (score > 10) {
      scored.push({
        playbook: pb,
        score,
        matchedReason: reasons.join("; ") || "综合语义相关",
      });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

/**
 * 格式化为注入 Drawer 1 的精简上下文块
 */
export function formatPlaybooksForContext(matched: MatchedPlaybookResult[]): string {
  if (!matched || matched.length === 0) return "";

  const sections = matched.map(({ playbook, matchedReason }) => {
    let text = `### 战法卡片：${playbook.id} · ${playbook.title} (命中: ${matchedReason})\n`;
    if (playbook.oneLiner) {
      text += `> **核心法则**：${playbook.oneLiner}\n\n`;
    }

    if (playbook.situations && playbook.situations.length > 0) {
      text += `**实战对齐与拆招话术参考**：\n`;
      // 取前 3~5 条最典型的话术
      for (const s of playbook.situations.slice(0, 5)) {
        text += `- **情境**：${s.situation} → **说/做**：${s.action} *(目标: ${s.outcome})*\n`;
      }
      text += `\n`;
    }

    if (playbook.rules && playbook.rules.length > 0) {
      text += `**底层原则**：\n`;
      for (const r of playbook.rules.slice(0, 3)) {
        text += `- ${r}\n`;
      }
    }

    return text;
  });

  return `
========================================
【Drawer 1 增强 · 导师战术武器库 (TACTICAL PLAYBOOKS)】
以下为你自动检索到的顶级职场博弈模型。请将这些战法作为底层认知策略，与你对具体干系人（如领导、导师、研发）的性格画像融合。
**【严格执行规范】**：
1. 绝对不要生硬地向用户背诵“我是按 EPxxx/某某模型来分析”的死板课文！
2. 必须将模型里的沟通逻辑（如出选择题、锁目标时间、以退为进）直接转化为“用户可直接复制发出的、贴合对方性格的高情商原声话术”！
========================================
${sections.join("\n---\n")}
========================================
`;
}
