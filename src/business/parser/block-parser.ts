import type { Block, ArtifactType } from "@/lib/types";
import type { MessagePart } from "../entities/message-part";

export interface MarkdownParseResult {
  blocks: Block[];
  parts: MessagePart[];
  artifactDoc?: { title: string; content: string; type: ArtifactType };
}

/**
 * parseMarkdownToBlocksAndParts
 * 纯逻辑函数：将 Agent 输出的原始 Markdown 字符串解析为结构化 Block 与 MessagePart。
 * 支持外层代码块安全解包、YAML Frontmatter 识别、引用建议话术抽取、代码围栏保护与首字下沉判断。
 */
export function parseMarkdownToBlocksAndParts(
  content: string,
  onArtifactDetected?: (title: string, docContent: string) => void,
): MarkdownParseResult {
  const blocks: Block[] = [];
  const parts: MessagePart[] = [];

  // 如果模型把整个回复外层包裹了 ```markdown ... ``` 或 ```md ... ```，先行安全解包
  let normalizedContent = content.trim();
  const outerCodeMatch = normalizedContent.match(/^```(?:markdown|md)?\s*\n([\s\S]*?)\n```$/i);
  if (outerCodeMatch) {
    normalizedContent = outerCodeMatch[1].trim();
  }

  // 1. 识别结构化 PRD / 方案骨架（含有效 YAML Frontmatter）
  const yamlMatch = normalizedContent.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (yamlMatch) {
    const rawYaml = yamlMatch[1];
    const titleMatch = rawYaml.match(/title:\s*["']?([^"'\n]+)["']?/);
    const typeMatch = rawYaml.match(/(?:doc_)?type:\s*["']?([^"'\n]+)["']?/);
    const solutionMatch = rawYaml.match(/expected_solution:\s*["']?([^"'\n]+)["']?/);

    // 必须真正具备标题、类型或预期方案特征，避免普通 --- 分割线误判为产物
    if (titleMatch || typeMatch || solutionMatch) {
      const docTitle = titleMatch ? titleMatch[1].trim() : "项目需求方案与架构骨架.md";
      const docType = (typeMatch ? typeMatch[1].trim() : "prd") as ArtifactType;

      const leadText = "根据你的要求，我已经为你梳理了预期业务解法并生成了挂载 YAML 规范的大体架构骨架：";
      const description = solutionMatch
        ? `预期方案：${solutionMatch[1].trim()}`
        : "包含完整的项目元数据与各模块骨架，便于直接补充细节";

      blocks.push({
        kind: "para",
        dropcap: true,
        text: leadText,
      });
      parts.push({
        type: "text",
        text: leadText,
        dropcap: true,
      });

      blocks.push({
        kind: "artifact_suggestion",
        title: docTitle,
        artifactType: docType,
        description,
        docContent: normalizedContent,
      });
      parts.push({
        type: "artifact",
        title: docTitle,
        artifactType: docType,
        content: normalizedContent,
        description,
      });

      onArtifactDetected?.(docTitle, normalizedContent);
      blocks.push({ kind: "actions" });

      return {
        blocks,
        parts,
        artifactDoc: { title: docTitle, content: normalizedContent, type: docType },
      };
    }
  }

  // 2. 普通 Markdown 文本行切分处理
  const lines = normalizedContent.split("\n");
  let currentQuote: string[] = [];
  let currentPara: string[] = [];
  let inCodeFence = false;
  let codeFenceBuffer: string[] = [];

  const flushPara = () => {
    if (currentPara.length > 0) {
      const text = currentPara.join("\n").trim();
      if (text) {
        const dropcap = blocks.length === 0;
        blocks.push({
          kind: "para",
          dropcap,
          text,
        });
        parts.push({
          type: "text",
          text,
          dropcap,
        });
      }
      currentPara = [];
    }
  };

  const flushQuote = () => {
    if (currentQuote.length > 0) {
      const text = currentQuote.join("\n").trim();
      if (text) {
        const label = "建议回复话术 · SUGGESTED REPLY";
        blocks.push({
          kind: "quote",
          label,
          text,
        });
        parts.push({
          type: "text",
          text,
          isQuote: true,
          quoteLabel: label,
        });
      }
      currentQuote = [];
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    // 代码块围栏保护：避免把代码块内部的空行或引用误切分成零散段落
    if (line.startsWith("```")) {
      if (inCodeFence) {
        codeFenceBuffer.push(rawLine);
        currentPara.push(...codeFenceBuffer);
        codeFenceBuffer = [];
        inCodeFence = false;
        flushQuote();
        flushPara();
        continue;
      } else {
        flushQuote();
        flushPara();
        inCodeFence = true;
        codeFenceBuffer = [rawLine];
        continue;
      }
    }

    if (inCodeFence) {
      codeFenceBuffer.push(rawLine);
      continue;
    }

    if (line.startsWith(">")) {
      flushPara();
      currentQuote.push(line.replace(/^>\s?/, ""));
    } else if (!line) {
      flushQuote();
      flushPara();
    } else {
      flushQuote();
      currentPara.push(rawLine);
    }
  }

  if (inCodeFence && codeFenceBuffer.length > 0) {
    currentPara.push(...codeFenceBuffer);
  }

  flushQuote();
  flushPara();

  if (blocks.length > 0) {
    blocks.push({ kind: "actions" });
  }

  return { blocks, parts };
}
