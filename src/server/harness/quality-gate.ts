/**
 * PANGBAI Agent Harness · 流式质量门禁与契约拦截器 (Quality Gate & Interceptor)
 *
 * 核心职责：
 * 1. YAML Frontmatter 契约校验与修复 (保障右侧 Canvas 必成功唤醒)
 * 2. 引用话术卡片规范校验 (杜绝在 > 中出现导师自身分析废话)
 * 3. 干系人实体链接超链回填 ([姓名](person:ID))
 *
 * 契约对齐：frontmatter 检测与服务端 parseFrontmatter / 客户端 block-parser
 * 使用同一首锚定正则（hasFrontmatterBlock），消灭"开场白 + frontmatter"
 * 通过旧宽松检测却在两端都提取不到 artifact 的漏网路径。
 */

import { hasFrontmatterBlock } from "@/server/artifacts/frontmatter";

export interface QualityGateOptions {
  activeSkill?: string;
  knownPeople?: Array<{ id: string; name: string }>;
}

export type GateViolationKind =
  | "frontmatter_missing"
  | "frontmatter_not_at_start"
  | "quote_prefix"
  | "person_link_unlinked";

export interface GateViolation {
  kind: GateViolationKind;
  detail: string;
}

export type GateRepairKind =
  | "frontmatter_injected"
  | "quote_stripped"
  | "person_link_backfilled";

export interface GateRepair {
  kind: GateRepairKind;
  detail: string;
}

export interface GateReport {
  violations: GateViolation[];
  repairs: GateRepair[];
  retried: boolean;
}

export interface QualityGateResult {
  text: string;
  report: GateReport;
}

/** 输出受 frontmatter 契约约束的文档技能 */
const DOC_SKILLS = new Set(["prd_generator", "canvas_doc_writer"]);

export function isDocSkill(skill?: string): boolean {
  return !!skill && DOC_SKILLS.has(skill);
}

export type HeadGateDecision =
  | { decision: "buffer" }
  | { decision: "pass" }
  | { decision: "violation"; reason: string };

/**
 * 流头门禁：在流式输出的最初几个 delta 内判定 frontmatter 契约是否可能被满足。
 * 纯函数，可单测。
 *
 * - "pass"      去空白后以 --- 分隔行开头，放行缓冲并正常流转
 * - "buffer"    仍可能补全为 --- 分隔行（如 ""、"-"、"---"），继续缓冲
 * - "violation" 首个非空白内容已不可能构成 frontmatter，立即违约
 */
export function headGateCheck(buffered: string): HeadGateDecision {
  const trimmed = buffered.trimStart();

  if (/^---[ \t]*\n/.test(trimmed)) {
    return { decision: "pass" };
  }
  if (/^-{0,3}[ \t\r]*$/.test(trimmed)) {
    // 尚未出现换行/其它字符，仍可能补全为 "---\n"
    return { decision: "buffer" };
  }
  return {
    decision: "violation",
    reason: trimmed.startsWith("-")
      ? "输出以破折号开头但无法构成 --- frontmatter 分隔行"
      : "输出未以 --- frontmatter 分隔行开头",
  };
}

export class QualityGate {
  /**
   * 对输出完成后的完整回复进行质量校验与契约修复，并返回结构化报告。
   */
  static processOutput(rawText: string, options: QualityGateOptions = {}): QualityGateResult {
    let text = rawText;
    const violations: GateViolation[] = [];
    const repairs: GateRepair[] = [];

    // 1. 契约校验：文档技能输出必须携带首锚定 frontmatter（与两端解析器同一判定）
    if (isDocSkill(options.activeSkill) && !hasFrontmatterBlock(text)) {
      const notAtStart = /^---[\s\S]*?---/m.test(text.trim());
      violations.push({
        kind: notAtStart ? "frontmatter_not_at_start" : "frontmatter_missing",
        detail: notAtStart
          ? "frontmatter 存在但未锚定在全文开头，两端解析器均无法提取"
          : "文档技能输出缺少 frontmatter",
      });

      if (notAtStart) {
        // 模型已产出 frontmatter 只是放错位置：原块迁移至文首，保留真实元数据
        const existing = text.trim().match(/^---[\s\S]*?---/m);
        if (existing) {
          const block = existing[0];
          const body = text.trim().replace(block, "").trimStart();
          text = `${block}\n\n${body}`;
          repairs.push({ kind: "frontmatter_injected", detail: "已有 frontmatter 迁移至文首" });
        }
      } else {
        // 完全缺失：从正文标题合成最小合规 frontmatter
        const headingMatch = text.match(/^#+\s+(.+)$/m);
        const title = headingMatch ? `${headingMatch[1].trim()}.md` : "落地需求方案.md";
        const docType = options.activeSkill === "prd_generator" ? "prd" : "tech_spec";

        const frontmatter = `---
title: "${title}"
type: "${docType}"
expected_solution: "由 PANGBAI Harness 自动规范化生成"
---

`;
        text = frontmatter + text.trimStart();
        repairs.push({ kind: "frontmatter_injected", detail: `注入合成 frontmatter (title: ${title})` });
      }
    }

    // 2. 引用卡片门禁：若模型在 > 块中包含了非话术的前缀（如 "> 我认为应该..."），去除多余套话
    const quotePrefixRe = /^>\s*(我认为|我的建议是|首先|总的来说)[，,]/gm;
    const quoteMatches = text.match(quotePrefixRe);
    if (quoteMatches && quoteMatches.length > 0) {
      violations.push({
        kind: "quote_prefix",
        detail: `${quoteMatches.length} 处引用卡片含导师分析前缀`,
      });
      text = text.replace(quotePrefixRe, "> ");
      repairs.push({ kind: "quote_stripped", detail: `剥离 ${quoteMatches.length} 处前缀` });
    }

    // 3. 实体超链回填：若识别到已知干系人未添加 [姓名](person:ID)，智能补全超链
    if (options.knownPeople && options.knownPeople.length > 0) {
      for (const p of options.knownPeople) {
        // 如果文本中包含姓名，但后面紧跟着的不是 (person:id)
        const regex = new RegExp(`(?<=\\s|^|[，。！？])(${p.name})(?!\\]\\(person:)`, "g");
        const matches = text.match(regex);
        if (matches && matches.length > 0) {
          violations.push({
            kind: "person_link_unlinked",
            detail: `${p.name} 出现 ${matches.length} 次未链接`,
          });
          text = text.replace(regex, `[${p.name}](person:${p.id})`);
          repairs.push({ kind: "person_link_backfilled", detail: `${p.name} ×${matches.length}` });
        }
      }
    }

    return { text, report: { violations, repairs, retried: false } };
  }
}
