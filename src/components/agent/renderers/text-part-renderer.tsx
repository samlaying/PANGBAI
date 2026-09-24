"use client";

import { useState, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";
import { agentBus } from "@/business/bus/agent-bus";

const TOKEN_RE = /(\[[^\]]+\]\((?:person|project|meeting|evidence):[^)]+\)|\*\*[^*]+\*\*|`[^`]+`)/g;
const ENTITY_MATCH = /^\[([^\]]+)\]\((person|project|meeting|evidence):([^)]+)\)$/;

function renderInlineContent(rawText: string, keyPrefix: string): ReactNode[] {
  const parts = rawText.split(TOKEN_RE);
  return parts.map((part, i) => {
    const key = `${keyPrefix}-${i}`;
    if (!part) return null;

    // 1. 实体超链接识别 [姓名](person:ID)
    const entityMatch = part.match(ENTITY_MATCH);
    if (entityMatch) {
      const [, label, kind, id] = entityMatch;
      return (
        <button
          key={key}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            agentBus.dispatch("overlay_requested", {
              type: kind as "person" | "project" | "meeting" | "evidence",
              id,
            });
          }}
          className="underline decoration-dotted decoration-[1.5px] underline-offset-[5px] transition-colors hover:text-accent hover:decoration-accent font-medium text-accent"
        >
          {label}
        </button>
      );
    }

    // 2. 加粗语法 **加粗**
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong
          key={key}
          className="font-bold text-ink bg-amber-500/10 px-1 py-0.5 rounded-xs border border-amber-500/15"
        >
          {part.slice(2, -2)}
        </strong>
      );
    }

    // 3. 行内代码 `code`
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return (
        <code
          key={key}
          className="font-mono text-[12.5px] bg-paper-deep text-accent px-1.5 py-0.5 rounded-xs border border-rule"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    return part;
  });
}

export function TextPartRenderer({
  text,
  dropcap,
  isQuote,
  quoteLabel,
}: {
  text: string;
  dropcap?: boolean;
  isQuote?: boolean;
  quoteLabel?: string;
}) {
  const [copied, setCopied] = useState(false);

  if (isQuote) {
    return (
      <figure className="relative my-2 pl-7">
        <span
          aria-hidden
          className="absolute -left-1 -top-3 select-none font-display text-[52px] leading-none text-accent/30"
        >
          &ldquo;
        </span>
        {quoteLabel && <div className="kicker mb-2">{quoteLabel}</div>}
        <blockquote className="whitespace-pre-line border-l-2 border-accent pl-5 font-serif text-[16.5px] leading-[1.9] text-ink">
          {renderInlineContent(text, "quote")}
        </blockquote>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(text).catch(() => {});
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
          }}
          className="mt-2.5 inline-flex items-center gap-1 font-mono text-[10.5px] tracking-[0.1em] text-ink-mute transition-colors hover:text-accent"
        >
          {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
          {copied ? "已抄录" : "抄录建议话术"}
        </button>
      </figure>
    );
  }

  // 安全预处理：若整个文本块首尾被 ``` 包裹（例如模型输出了 ```markdown ... ```），先行解开包裹
  let normalized = text.trim();
  const outerBlockMatch = normalized.match(/^```(?:markdown|md)?\s*\n([\s\S]*?)\n```$/i);
  if (outerBlockMatch) {
    normalized = outerBlockMatch[1].trim();
  }

  const lines = normalized.split("\n");
  const nodes: ReactNode[] = [];
  let inCodeBlock = false;
  let codeBuffer: string[] = [];
  let isFirstParaRendered = false;

  for (let idx = 0; idx < lines.length; idx++) {
    const rawLine = lines[idx];
    const trimmed = rawLine.trim();

    // 1. 代码块处理 ```
    if (trimmed.startsWith("```")) {
      if (inCodeBlock) {
        const codeText = codeBuffer.join("\n");
        inCodeBlock = false;
        codeBuffer = [];
        nodes.push(
          <pre
            key={`code-${idx}`}
            className="my-3 overflow-x-auto border border-rule bg-paper-deep/80 p-3.5 font-mono text-[12.5px] leading-relaxed text-ink rounded-xs"
          >
            <code>{codeText}</code>
          </pre>
        );
        continue;
      } else {
        inCodeBlock = true;
        codeBuffer = [];
        continue;
      }
    }

    if (inCodeBlock) {
      codeBuffer.push(rawLine);
      continue;
    }

    // 2. 空行
    if (!trimmed) {
      nodes.push(<div key={`empty-${idx}`} className="h-2.5" />);
      continue;
    }

    // 3. 分割线 --- 或 ***
    if (/^(?:---|\*\*\*|___)$/.test(trimmed)) {
      nodes.push(<hr key={`hr-${idx}`} className="my-3.5 border-t border-ink/15" />);
      continue;
    }

    // 忽略孤立无意义的 Markdown 控制符（如模型偶尔独立成行的 ** 或 *）
    if (/^\*{1,2}$/.test(trimmed)) {
      continue;
    }

    // 4. 一级标题 #
    if (trimmed.startsWith("# ")) {
      nodes.push(
        <h1
          key={`h1-${idx}`}
          className="font-serif text-[20px] font-bold text-ink pb-1.5 mb-3 mt-4 border-b border-ink/15"
        >
          {renderInlineContent(trimmed.slice(2), `h1-${idx}`)}
        </h1>
      );
      continue;
    }

    // 5. 二级标题 ##
    if (trimmed.startsWith("## ")) {
      nodes.push(
        <h2
          key={`h2-${idx}`}
          className="font-serif text-[17px] font-bold text-ink mt-5 mb-2.5 border-l-3 border-accent pl-2.5"
        >
          {renderInlineContent(trimmed.slice(3), `h2-${idx}`)}
        </h2>
      );
      continue;
    }

    // 6. 三级标题 ###
    if (trimmed.startsWith("### ")) {
      nodes.push(
        <h3
          key={`h3-${idx}`}
          className="font-serif text-[15.5px] font-bold text-ink mt-3.5 mb-2"
        >
          {renderInlineContent(trimmed.slice(4), `h3-${idx}`)}
        </h3>
      );
      continue;
    }

    // 7. 有序列表 1. 2. 支持普通 "1. xxx" 与加粗形式 "**1. xxx**" 或 "**1. xxx**：..."
    const boldNumMatch = trimmed.match(/^\*\*(\d+)\.\s*(.*?)\*\*(.*)$/);
    const standardNumMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    const numMatch = boldNumMatch
      ? [boldNumMatch[0], boldNumMatch[1], `**${boldNumMatch[2]}**${boldNumMatch[3]}`]
      : standardNumMatch;

    if (numMatch) {
      nodes.push(
        <div
          key={`ol-${idx}`}
          className="my-1.5 flex items-start gap-2 text-[15.5px] leading-[1.8] text-ink pl-1"
        >
          <span className="font-mono text-[13px] font-bold text-accent shrink-0 w-5">
            {numMatch[1]}.
          </span>
          <span className="flex-1 font-serif text-ink">
            {renderInlineContent(numMatch[2], `ol-content-${idx}`)}
          </span>
        </div>
      );
      continue;
    }

    // 8. 无序列表 - * •
    const bulletMatch = trimmed.match(/^(?:[-*•]|\+)\s+(.*)$/);
    if (bulletMatch) {
      nodes.push(
        <div
          key={`ul-${idx}`}
          className="my-1.5 flex items-start gap-2.5 text-[15.5px] leading-[1.8] text-ink pl-1"
        >
          <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-accent/80" />
          <span className="flex-1 font-serif text-ink">
            {renderInlineContent(bulletMatch[1], `ul-content-${idx}`)}
          </span>
        </div>
      );
      continue;
    }

    // 9. 普通正文段落（保留首字下沉 dropcap 支持与换行自适应）
    const applyDropcap = dropcap && !isFirstParaRendered;
    isFirstParaRendered = true;

    nodes.push(
      <p
        key={`p-${idx}`}
        className={`font-serif text-[16px] leading-[1.95] text-ink whitespace-pre-wrap ${applyDropcap ? "dropcap" : ""}`}
      >
        {renderInlineContent(rawLine, `p-content-${idx}`)}
      </p>
    );
  }

  // 兜底：处理未闭合的代码块
  if (inCodeBlock && codeBuffer.length > 0) {
    nodes.push(
      <pre
        key="code-unclosed"
        className="my-3 overflow-x-auto border border-rule bg-paper-deep/80 p-3.5 font-mono text-[12.5px] leading-relaxed text-ink rounded-xs"
      >
        <code>{codeBuffer.join("\n")}</code>
      </pre>
    );
  }

  return <div className="space-y-1">{nodes}</div>;
}
