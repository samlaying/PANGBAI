"use client";

import { useCallback, useRef, useState } from "react";
import {
  Check,
  Copy,
  FileText,
  Maximize2,
  Minimize2,
  Plus,
  Quote,
  Sparkles,
  X,
} from "lucide-react";
import type { ProjectArtifact } from "@/lib/types";

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
  artifacts,
  onSelectArtifact,
  onNewArtifact,
}: {
  doc: CanvasDoc;
  onChange: (content: string) => void;
  onClose: () => void;
  onAskAI?: (prompt: string) => void;
  artifacts?: ProjectArtifact[];
  onSelectArtifact?: (art: ProjectArtifact) => void;
  onNewArtifact?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [fullWidth, setFullWidth] = useState(false);
  const [selectedSnippet, setSelectedSnippet] = useState<string | null>(null);
  const [popupPos, setPopupPos] = useState<{
    x: number;
    y: number;
    placeBelow: boolean;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const copyContent = () => {
    navigator.clipboard?.writeText(doc.content).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  /* 计算光标在 textarea 内的精确像素位置 */
  const getCaretCoordinates = (element: HTMLTextAreaElement, position: number) => {
    if (typeof window === "undefined") return { top: 0, left: 0 };
    const div = document.createElement("div");
    const style = window.getComputedStyle(element);

    const props = [
      "direction",
      "boxSizing",
      "width",
      "overflowX",
      "overflowY",
      "borderTopWidth",
      "borderRightWidth",
      "borderBottomWidth",
      "borderLeftWidth",
      "borderStyle",
      "paddingTop",
      "paddingRight",
      "paddingBottom",
      "paddingLeft",
      "fontStyle",
      "fontVariant",
      "fontWeight",
      "fontStretch",
      "fontSize",
      "fontSizeAdjust",
      "lineHeight",
      "fontFamily",
      "textAlign",
      "textTransform",
      "textIndent",
      "textDecoration",
      "letterSpacing",
      "wordSpacing",
      "tabSize",
      "whiteSpace",
      "wordBreak",
      "overflowWrap",
    ] as const;

    div.style.position = "absolute";
    div.style.visibility = "hidden";
    div.style.whiteSpace = "pre-wrap";
    div.style.wordBreak = "break-word";
    div.style.top = "0px";
    div.style.left = "-9999px";
    div.style.width = `${element.clientWidth}px`;

    for (const prop of props) {
      (div.style as unknown as Record<string, string>)[prop] = (
        style as unknown as Record<string, string>
      )[prop];
    }

    div.textContent = element.value.substring(0, position);
    const span = document.createElement("span");
    span.textContent = element.value.substring(position, position + 1) || ".";
    div.appendChild(span);

    document.body.appendChild(div);
    const top = span.offsetTop + parseInt(style.borderTopWidth || "0", 10);
    const left = span.offsetLeft + parseInt(style.borderLeftWidth || "0", 10);
    document.body.removeChild(div);

    return { top, left };
  };

  /* 选中文本检测与贴近跟随定位 */
  const updateSelection = useCallback(
    (e?: React.MouseEvent<HTMLTextAreaElement> | React.KeyboardEvent<HTMLTextAreaElement>) => {
      const el = textareaRef.current;
      const container = containerRef.current;
      if (!el || !container) return;

      const start = el.selectionStart;
      const end = el.selectionEnd;
      if (typeof start !== "number" || typeof end !== "number" || end <= start) {
        setSelectedSnippet(null);
        setPopupPos(null);
        return;
      }

      const raw = el.value.slice(start, end).trim();
      if (!raw) {
        setSelectedSnippet(null);
        setPopupPos(null);
        return;
      }

      // 只保留前 10 个字，剩余加省略号
      const snippet = raw.length > 10 ? raw.slice(0, 10) + "…" : raw;
      setSelectedSnippet(snippet);

      const containerRect = container.getBoundingClientRect();

      // 如果来自鼠标划选，直接紧贴鼠标抬起位置（物理精准）
      if (e && "clientX" in e && e.clientX > 0 && e.clientY > 0) {
        const rawX = e.clientX - containerRect.left + container.scrollLeft;
        const rawY = e.clientY - containerRect.top + container.scrollTop;
        const placeBelow = rawY < 44;
        const clampedX = Math.max(45, Math.min(rawX, container.clientWidth - 45));
        setPopupPos({
          x: clampedX,
          y: placeBelow ? rawY + 12 : rawY - 8,
          placeBelow,
        });
        return;
      }

      // 键盘划选或默认情况：计算光标像素坐标
      const caret = getCaretCoordinates(el, end);
      const elRect = el.getBoundingClientRect();
      const rawX =
        elRect.left - containerRect.left + caret.left - el.scrollLeft + container.scrollLeft;
      const rawY =
        elRect.top - containerRect.top + caret.top - el.scrollTop + container.scrollTop;
      const placeBelow = rawY < 44;
      const clampedX = Math.max(45, Math.min(rawX, container.clientWidth - 45));
      setPopupPos({
        x: clampedX,
        y: placeBelow ? rawY + 22 : rawY - 8,
        placeBelow,
      });
    },
    []
  );

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
        {artifacts && artifacts.length > 0 ? (
          <div className="flex items-center gap-1 min-w-0 overflow-x-auto py-1">
            {artifacts.map((art) => {
              const isCurrent = doc.id === art.id;
              return (
                <button
                  key={art.id}
                  type="button"
                  onClick={() => onSelectArtifact?.(art)}
                  className={`flex shrink-0 items-center gap-1.5 border px-2.5 py-1 font-serif text-[12px] transition-colors ${
                    isCurrent
                      ? "border-accent bg-paper font-semibold text-accent shadow-xs"
                      : "border-transparent bg-transparent text-ink-soft hover:border-rule hover:bg-paper-deep/60 hover:text-ink"
                  }`}
                  title={art.title}
                >
                  <FileText
                    className={`size-3 ${isCurrent ? "text-accent" : "text-ink-mute"}`}
                    strokeWidth={1.5}
                  />
                  <span className="truncate max-w-[120px] sm:max-w-[140px]">{art.title}</span>
                </button>
              );
            })}
            {onNewArtifact && (
              <button
                type="button"
                onClick={onNewArtifact}
                className="flex shrink-0 items-center gap-1 border border-dashed border-rule px-2 py-0.5 font-serif text-[11px] text-ink-mute transition-colors hover:border-accent hover:text-accent"
                title="让 AI 围绕当前项目生成新方案大纲骨架"
              >
                <Plus className="size-3" strokeWidth={1.5} />
                <span>新方案骨架</span>
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="size-4 shrink-0 text-accent" strokeWidth={1.5} />
            <span className="truncate font-serif text-[13.5px] font-bold text-ink">
              {doc.title}
            </span>
            <span className="shrink-0 font-mono text-[10px] text-ink-mute">
              · {wordCount} 字
            </span>
          </div>
        )}

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
      <div ref={containerRef} className="relative flex-1 overflow-y-auto p-4 sm:p-6">
        {/* 紧贴选中文本的极简微型“引用”浮动按钮 */}
        {selectedSnippet && popupPos && (
          <div
            style={{
              position: "absolute",
              left: `${popupPos.x}px`,
              top: `${popupPos.y}px`,
              transform: popupPos.placeBelow
                ? "translate(-50%, 0)"
                : "translate(-50%, -100%)",
            }}
            className="pointer-events-auto z-30 transition-all duration-75"
          >
            <button
              type="button"
              onMouseDown={(e) => {
                // 阻止默认事件防止 textarea 失焦失去划选
                e.preventDefault();
              }}
              onClick={quoteToChat}
              className="group flex items-center gap-1.5 rounded-sm border border-rule bg-paper/95 px-2 py-1 shadow-md backdrop-blur-xs transition-all hover:border-ink/50 hover:bg-paper-warm"
              title={`引用「${selectedSnippet}」到对话框 (⌘L)`}
            >
              <Quote
                className="size-3 text-ink-mute transition-colors group-hover:text-accent"
                strokeWidth={1.5}
              />
              <span className="font-serif text-[11.5px] text-ink-soft group-hover:text-ink">
                引用
              </span>
              <kbd className="font-mono text-[8.5px] text-ink-mute">⌘L</kbd>
            </button>
          </div>
        )}

        <textarea
          ref={textareaRef}
          value={doc.content}
          onChange={(e) => {
            onChange(e.target.value);
            setSelectedSnippet(null);
            setPopupPos(null);
          }}
          onMouseUp={updateSelection}
          onKeyUp={updateSelection}
          onKeyDown={handleKeyDown}
          onScroll={() => {
            setPopupPos(null);
          }}
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
