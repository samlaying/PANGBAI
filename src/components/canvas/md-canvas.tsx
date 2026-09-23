"use client";

import { useCallback, useRef, useState } from "react";
import {
  Check,
  Copy,
  FileText,
  Maximize2,
  Minimize2,
  Quote,
  Sparkles,
  X,
} from "lucide-react";

export interface CanvasDoc {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
}

export function MdCanvas({
  doc,
  onChange,
  onClose,
  onAskAI,
}: {
  doc: CanvasDoc;
  onChange: (content: string) => void;
  onClose: () => void;
  onAskAI?: (prompt: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [fullWidth, setFullWidth] = useState(false);
  const [selectedSnippet, setSelectedSnippet] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const copyContent = () => {
    navigator.clipboard?.writeText(doc.content).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  /* 选中文本检测：只保留前 10 个字，剩余加省略号 */
  const checkSelection = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    if (typeof start === "number" && typeof end === "number" && end > start) {
      const raw = el.value.slice(start, end).trim();
      if (raw.length > 0) {
        const snippet = raw.length > 10 ? raw.slice(0, 10) + "…" : raw;
        setSelectedSnippet(snippet);
        return;
      }
    }
    setSelectedSnippet(null);
  }, []);

  /* 快速将选中内容加入对话框进行改变 */
  const quoteToChat = useCallback(() => {
    if (!selectedSnippet || !onAskAI) return;
    onAskAI(`针对「${selectedSnippet}」改一下：`);
  }, [selectedSnippet, onAskAI]);

  /* 键盘快捷键监听：⌘L / Ctrl+L 快速加入对话框 */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "l") {
      if (selectedSnippet) {
        e.preventDefault();
        quoteToChat();
      }
    }
  };

  const wordCount = doc.content.length;

  return (
    <section
      aria-label="Markdown Canvas 工作区"
      className={`flex flex-col border-l border-rule bg-paper transition-all ${
        fullWidth ? "w-full" : "w-full lg:w-[50%]"
      }`}
    >
      {/* 顶部工具条 */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-rule bg-paper-warm/50 px-4">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="size-4 shrink-0 text-accent" strokeWidth={1.5} />
          <span className="truncate font-serif text-[13.5px] font-bold text-ink">
            {doc.title}
          </span>
          <span className="shrink-0 font-mono text-[10px] text-ink-mute">
            · {wordCount} 字
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {onAskAI && (
            <button
              type="button"
              onClick={() =>
                onAskAI("请帮我审查当前这份文档，指出可能存在沟通摩擦或冲突的风险点：")
              }
              className="flex items-center gap-1 border border-ink/20 bg-paper px-2.5 py-1 font-serif text-[11.5px] text-ink transition-colors hover:border-accent hover:text-accent"
              title="让旁白 AI 审查当前文档并提出冲突最小化建议"
            >
              <Sparkles className="size-3 text-gold" strokeWidth={1.5} />
              AI 审查
            </button>
          )}

          <button
            type="button"
            onClick={copyContent}
            aria-label="复制全文"
            title="复制全文"
            className="grid size-7 place-items-center text-ink-mute transition-colors hover:bg-paper-deep hover:text-ink"
          >
            {copied ? (
              <Check className="size-3.5 text-accent" />
            ) : (
              <Copy className="size-3.5" strokeWidth={1.5} />
            )}
          </button>

          <button
            type="button"
            onClick={() => setFullWidth((v) => !v)}
            aria-label={fullWidth ? "恢复分屏" : "最大化"}
            title={fullWidth ? "恢复分屏" : "最大化"}
            className="grid size-7 place-items-center text-ink-mute transition-colors hover:bg-paper-deep hover:text-ink"
          >
            {fullWidth ? (
              <Minimize2 className="size-3.5" strokeWidth={1.5} />
            ) : (
              <Maximize2 className="size-3.5" strokeWidth={1.5} />
            )}
          </button>

          <button
            type="button"
            onClick={onClose}
            aria-label="关闭 Canvas"
            title="关闭 Canvas"
            className="grid size-7 place-items-center text-ink-mute transition-colors hover:bg-paper-deep hover:text-vermilion"
          >
            <X className="size-4" strokeWidth={1.5} />
          </button>
        </div>
      </header>

      {/* 实时 Markdown 编辑区 */}
      <div className="relative flex-1 overflow-y-auto p-4 sm:p-6">
        {/* 极简微型悬浮按钮：清淡、小巧、仅“引用” */}
        {selectedSnippet && (
          <div className="absolute right-6 top-4 z-20">
            <button
              type="button"
              onClick={quoteToChat}
              className="group flex items-center gap-1.5 border border-rule bg-paper/95 px-2 py-1 shadow-xs backdrop-blur-xs transition-all hover:border-ink/50 hover:bg-paper-warm"
              title={`引用「${selectedSnippet}」到对话框 (⌘L)`}
            >
              <Quote className="size-3 text-ink-mute transition-colors group-hover:text-accent" strokeWidth={1.5} />
              <span className="font-serif text-[11.5px] text-ink-soft group-hover:text-ink">引用</span>
              <kbd className="font-mono text-[8.5px] text-ink-mute">⌘L</kbd>
            </button>
          </div>
        )}

        <textarea
          ref={textareaRef}
          value={doc.content}
          onChange={(e) => onChange(e.target.value)}
          onSelect={checkSelection}
          onMouseUp={checkSelection}
          onKeyUp={checkSelection}
          onKeyDown={handleKeyDown}
          placeholder="在此编写或润色 Markdown 方案与 PRD，旁白将在对话中实时感知改动……"
          className="h-full min-h-[480px] w-full resize-none bg-transparent font-mono text-[13.5px] leading-[1.8] text-ink outline-none placeholder:text-ink-mute/50"
          spellCheck={false}
        />
      </div>

      {/* 底部状态微条 */}
      <footer className="flex h-7 shrink-0 items-center justify-between border-t border-rule bg-paper px-4 font-mono text-[9.5px] text-ink-mute">
        <span>CANVAS · 双向实时同步中</span>
        <span>选中内容可按 ⌘L 引用至对话</span>
      </footer>
    </section>
  );
}
