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
 * 解析带有 --- YAML --- 头部的 Markdown 内容
 */
export function parseFrontmatter(markdown: string): DocumentWithFrontmatter {
  const normalized = markdown.replace(/\r\n/g, "\n");
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

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
