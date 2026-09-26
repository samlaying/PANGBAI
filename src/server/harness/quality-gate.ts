/**
 * PANGBAI Agent Harness · 流式质量门禁与契约拦截器 (Quality Gate & Interceptor)
 *
 * 核心职责：
 * 1. YAML Frontmatter 格式修复与补全 (保障右侧 Canvas 必成功唤醒)
 * 2. 引用话术卡片规范校验 (杜绝在 > 中出现导师自身分析废话)
 * 3. 干系人实体链接超链回填 ([姓名](person:ID))
 */

export interface QualityGateOptions {
  activeSkill?: string;
  knownPeople?: Array<{ id: string; name: string }>;
}

export class QualityGate {
  /**
   * 对输出完成后的完整回复进行质量校验与契约修复
   */
  static processOutput(rawText: string, options: QualityGateOptions = {}): string {
    let text = rawText;

    // 1. 契约修复：若命中 PRD 或 Canvas 文档生成，但模型漏掉了 --- frontmatter ---
    const isDocSkill = options.activeSkill === "prd_generator" || options.activeSkill === "canvas_doc_writer";
    const hasFrontmatter = /^---[\s\S]*?---/m.test(text.trim());

    if (isDocSkill && !hasFrontmatter) {
      // 提取正文里的第一个一级/二级标题作为 title
      const headingMatch = text.match(/^#+\s+(.+)$/m);
      const title = headingMatch ? `${headingMatch[1].trim()}.md` : "落地需求方案.md";
      const docType = options.activeSkill === "prd_generator" ? "prd" : "tech_spec";

      const frontmatter = `---
title: "${title}"
type: "${docType}"
expected_solution: "由 PANGBAI Harness 自动规范化生成"
---

`;
      text = frontmatter + text;
    }

    // 2. 引用卡片门禁：若模型在 > 块中包含了非话术的前缀（如 "> 我认为应该..."），去除多余套话
    text = text.replace(/^>\s*(我认为|我的建议是|首先|总的来说)[，,]/gm, "> ");

    // 3. 实体超链回填：若识别到已知干系人未添加 [姓名](person:ID)，智能补全超链
    if (options.knownPeople && options.knownPeople.length > 0) {
      for (const p of options.knownPeople) {
        // 如果文本中包含姓名，但后面紧跟着的不是 (person:id)
        const regex = new RegExp(`(?<=\\s|^|[，。！？])(${p.name})(?!\\]\\(person:)`, "g");
        text = text.replace(regex, `[${p.name}](person:${p.id})`);
      }
    }

    return text;
  }
}
