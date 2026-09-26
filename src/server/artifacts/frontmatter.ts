import { load, dump } from "js-yaml";

export interface ParsedFrontmatter {
  title?: string;
  doc_type?: string;
  type?: string;
  progress?: string;
  version?: string;
  date?: string;
  stakeholders?: string[];
  expected_solution?: string;
  note?: string;
  retrospective?: {
    successes?: string;
    improvements?: string;
  };
  [key: string]: unknown;
}

export interface DocumentWithFrontmatter {
  frontmatter: ParsedFrontmatter;
  content: string; // 正文 Markdown (不含 YAML 头)
  raw: string;     // 原始全文
}

/**
 * Frontmatter 契约的单一事实源：
 * 服务端 parseFrontmatter、客户端 block-parser、质量门禁三处必须使用同一语义 ——
 * `---` 分隔行锚定在（去除首尾空白后的）全文开头。
 */
export const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;

/**
 * 判断文本是否携带满足契约的 frontmatter 块（与两端解析器同构）
 */
export function hasFrontmatterBlock(markdown: string): boolean {
  return FRONTMATTER_RE.test(markdown.replace(/\r\n/g, "\n").trim());
}

/**
 * 解析带有 --- YAML --- 头部的 Markdown 内容
 */
export function parseFrontmatter(markdown: string): DocumentWithFrontmatter {
  // trim 对齐客户端 block-parser 的预处理（客户端在匹配前 trim 全文）
  const normalized = markdown.replace(/\r\n/g, "\n").trim();
  const match = normalized.match(FRONTMATTER_RE);

  if (!match) {
    return {
      frontmatter: {},
      content: markdown,
      raw: markdown,
    };
  }

  const yamlContent = match[1];
  const bodyContent = match[2];

  try {
    const parsed = (load(yamlContent) as ParsedFrontmatter) || {};
    return {
      frontmatter: parsed,
      content: bodyContent.trim(),
      raw: markdown,
    };
  } catch (err) {
    console.warn("Frontmatter parsing error:", err);
    return {
      frontmatter: {},
      content: bodyContent.trim(),
      raw: markdown,
    };
  }
}

/**
 * 将 Frontmatter 与正文组装为标准 Markdown 文本
 */
export function stringifyFrontmatter(
  frontmatter: ParsedFrontmatter,
  content: string
): string {
  const yamlStr = dump(frontmatter, { indent: 2 }).trim();
  return `---\n${yamlStr}\n---\n\n${content.trim()}\n`;
}
