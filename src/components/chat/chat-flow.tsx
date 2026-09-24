"use client";

import { useRef, useState, type ReactNode } from "react";
import {
  BookOpen,
  Check,
  Copy,
  Drama,
  FileText,
  Lightbulb,
} from "lucide-react";
import type { Block, ChatMessage, ConversationOpener } from "@/lib/types";
import { useUI } from "../ui-context";
import { FlowerDivider } from "../atoms";

/* ── 行内实体链接：解析 [文本](person:wang) ── */
const ENTITY_RE = /\[([^\]]+)\]\((person|project|meeting|evidence):([^)]+)\)/g;

function EntityText({ text }: { text: string }) {
  const ui = useUI();
  const nodes: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(ENTITY_RE)) {
    const matchIndex = m.index ?? 0;
    if (matchIndex > last) nodes.push(text.slice(last, matchIndex));
    const [, label, kind, id] = m;
    nodes.push(
      <button
        key={`${matchIndex}-${label}`}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (kind === "person") ui.openPerson(id);
          else if (kind === "project") ui.openProject(id);
          else if (kind === "meeting") ui.openMeeting();
          else if (kind === "evidence") ui.openEvidence(id);
        }}
        className="underline decoration-dotted decoration-[1.5px] underline-offset-[5px] transition-colors hover:text-accent hover:decoration-accent"
      >
        {label}
      </button>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return <>{nodes}</>;
}

/* ── 引文（建议话术） ── */
function PullQuote({ label, text }: { label?: string; text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <figure className="relative my-1 pl-7">
      <span
        aria-hidden
        className="absolute -left-1 -top-3 select-none font-display text-[52px] leading-none text-accent/30"
      >
        &ldquo;
      </span>
      {label && <div className="kicker mb-2">{label}</div>}
      <blockquote className="whitespace-pre-line border-l-2 border-accent pl-5 font-serif text-[16.5px] leading-[1.9] text-ink">
        {text}
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
        {copied ? "已抄录" : "抄录"}
      </button>
    </figure>
  );
}

/* ── 快捷动作 ── */
function ActionButtons() {
  const ui = useUI();
  const items = [
    { icon: Lightbulb, label: "建议", onClick: () => ui.ask("再给我一版更简短的建议。") },
    { icon: BookOpen, label: "类似案例", onClick: () => ui.ask("之前有类似的案例吗？") },
    { icon: Drama, label: "来演练一下", onClick: ui.startRehearsal },
  ];
  return (
    <div className="flex flex-wrap gap-2.5">
      {items.map(({ icon: Icon, label, onClick }) => (
        <button
          key={label}
          type="button"
          onClick={onClick}
          className="inline-flex items-center gap-2 border border-ink/25 px-4 py-[7px] font-serif text-[13.5px] transition-all hover:border-ink hover:bg-ink hover:text-paper"
        >
          <Icon className="size-[15px]" strokeWidth={1.5} />
          {label}
        </button>
      ))}
    </div>
  );
}

/* ── 活文档/PRD方案大纲骨架卡片 ── */
function ArtifactSuggestionCard({
  suggestion,
}: {
  suggestion: Extract<Block, { kind: "artifact_suggestion" }>;
}) {
  const ui = useUI();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  return (
    <div className="border border-rule bg-paper-warm/80 p-4 sm:p-5 shadow-2xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rule/60 pb-2.5">
        <div className="flex items-center gap-2">
          <FileText className="size-4 text-accent" strokeWidth={1.5} />
          <span className="font-serif text-[14.5px] font-bold text-ink">
            {suggestion.title}
          </span>
          <span className="border border-ink/20 bg-paper px-2 py-0.5 font-serif text-[10.5px] font-semibold text-ink">
            {suggestion.artifactType === "prd" ? "PRD 需求骨架" : "方案架构"}
          </span>
        </div>
        <span className="font-mono text-[10px] text-ink-mute">
          已挂载 YAML Frontmatter
        </span>
      </div>

      {suggestion.description && (
        <p className="mt-2.5 font-serif text-[13.5px] leading-relaxed text-ink-soft">
          {suggestion.description}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-2">
        <span className="font-mono text-[10.5px] text-ink-mute">
          AI 已备齐大体架构，载入后可直观预览或微调细节
        </span>
        <button
          type="button"
          disabled={loading}
          onClick={async () => {
            setLoading(true);
            try { await ui.loadCanvasDoc(suggestion.title, suggestion.docContent); setError(""); }
            catch { setError("载入失败，请重试"); }
            finally { setLoading(false); }
          }}
          className="flex items-center gap-1.5 border border-accent bg-paper px-3.5 py-1.5 font-serif text-[12.5px] font-semibold text-accent shadow-2xs transition-all hover:bg-accent hover:text-paper"
        >
          <FileText className="size-3.5" strokeWidth={1.5} />
          <span>载入到 Canvas 补充细节 ↗</span>
        </button>
      </div>
      {error && <p role="alert" className="mt-2 text-vermilion">{error}</p>}
    </div>
  );
}

/* ── 待沉淀职场记忆卡片（AI提前填充，用户单键确认） ── */
function MemoryCandidateCard({
  candidate,
}: {
  candidate: Extract<Block, { kind: "memory_candidate" }>;
}) {
  const ui = useUI();
  const [status, setStatus] = useState<"pending" | "confirmed" | "ignored">("pending");
  const [error, setError] = useState("");
  const submitting = useRef(false);

  const handleConfirm = async () => {
    if (submitting.current) return;
    submitting.current = true;
    try {
    await ui.confirmMemory({
      personId: candidate.personId,
      candidateId: candidate.candidateId,
      pattern: candidate.pattern,
      observation: candidate.observation,
      confidence: candidate.confidence,
      scene: candidate.targetScene,
    });
    setStatus("confirmed");
    setError("");
    } catch { setError("保存失败，请重试"); }
    finally { submitting.current = false; }
  };

  const handleIgnore = () => {
    setStatus("ignored");
  };

  return (
    <div className="border border-accent/40 bg-paper-warm/95 p-4 sm:p-5 shadow-2xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rule/60 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10.5px] uppercase tracking-wider text-accent font-bold">
            🧠 待沉淀的职场记忆 · AI 预先提炼
          </span>
          <span className="border border-accent/30 bg-accent/10 px-2 py-0.5 font-mono text-[10px] text-accent font-medium">
            置信度 {candidate.confidence}%
          </span>
        </div>
        <button
          type="button"
          onClick={() => ui.openPerson(candidate.personId)}
          className="font-serif text-[11.5px] text-ink-mute hover:text-accent transition-colors"
        >
          查看 {candidate.personName} 档案 ↗
        </button>
      </div>

      <div className="mt-3 space-y-2 text-[13px] leading-relaxed">
        <div>
          <span className="font-semibold text-ink">现象观察：</span>
          <span className="text-ink-soft">{candidate.observation}</span>
        </div>
        <div>
          <span className="font-semibold text-accent">提炼规律：</span>
          <span className="font-serif text-[13.5px] font-bold text-ink">{candidate.pattern}</span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-rule/50">
        {error && <span role="alert" className="text-vermilion">{error}</span>}
        {status === "pending" ? (
          <>
            <span className="font-mono text-[10.5px] text-ink-mute">
              由 AI 提前分析填充，确认后存入人物画像与世界模型
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleIgnore}
                className="border border-rule bg-paper px-3 py-1 font-serif text-[12px] text-ink-mute transition-colors hover:text-ink hover:bg-paper-deep"
              >
                ✕ 忽略
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="flex items-center gap-1.5 border border-accent bg-accent px-3 py-1 font-serif text-[12px] font-semibold text-paper shadow-2xs transition-all hover:bg-accent/90"
              >
                <Check className="size-3.5" />
                <span>✓ 确认存入档案</span>
              </button>
            </div>
          </>
        ) : status === "confirmed" ? (
          <div className="flex items-center gap-2 font-serif text-[12.5px] font-semibold text-accent">
            <Check className="size-4 text-accent" />
            <span>✓ 已确认存入 {candidate.personName} 的人物档案与世界模型库</span>
          </div>
        ) : (
          <div className="font-serif text-[12px] text-ink-mute">
            ✕ 已忽略，不录入档案
          </div>
        )}
      </div>
    </div>
  );
}

/* ── 块渲染 ── */
function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <div className="mt-4 space-y-5">
      {blocks.map((b, i) => {
        switch (b.kind) {
          case "para":
            return (
              <p
                key={i}
                className={`font-serif text-[16.5px] leading-[1.95] text-ink ${b.dropcap ? "dropcap" : ""}`}
              >
                <EntityText text={b.text} />
              </p>
            );
          case "quote":
            return <PullQuote key={i} label={b.label} text={b.text} />;
          case "actions":
            return <ActionButtons key={i} />;
          case "divider":
            return <FlowerDivider key={i} />;
          case "artifact_suggestion":
            return <ArtifactSuggestionCard key={i} suggestion={b} />;
          case "memory_candidate":
            return <MemoryCandidateCard key={i} candidate={b} />;
        }
      })}
    </div>
  );
}

/* ── 来信（用户） ── */
function UserLetter({ msg }: { msg: Extract<ChatMessage, { role: "user" }> }) {
  return (
    <article className="ml-auto w-full max-w-[540px] border-l-2 border-ink bg-paper-deep/50 px-6 py-4 md:ml-[120px]">
      <div className="kicker mb-1.5">
        我 · 来信 · {msg.time}
      </div>
      <p className="text-[14.5px] leading-[1.85] text-ink-soft">{msg.text}</p>
    </article>
  );
}

/* ── 旁白回复 ── */
function CoachArticle({
  msg,
  typing,
}: {
  msg: Extract<ChatMessage, { role: "assistant" }>;
  typing?: boolean;
}) {
  return (
    <article>
      <div className="flex items-center gap-3">
        <span className="grid size-8 place-items-center border border-ink font-serif text-[15px] font-bold">
          旁
        </span>
        <span className="font-serif text-[15px] font-bold">旁白</span>
        <span className="font-mono text-[10px] tracking-[0.1em] text-ink-mute">
          {msg.time}
        </span>
      </div>
      {typing ? (
        <div className="mt-5 flex items-center gap-2 font-serif text-[14px] text-ink-mute">
          正在翻看记录
          <span className="anim-blink">·</span>
          <span className="anim-blink [animation-delay:0.3s]">·</span>
          <span className="anim-blink [animation-delay:0.6s]">·</span>
        </div>
      ) : (
        <Blocks blocks={msg.blocks} />
      )}
    </article>
  );
}

/* ── 主对话流 ── */
export function ChatFlow({
  opener,
  messages,
  typing,
}: {
  opener?: ConversationOpener;
  messages: ChatMessage[];
  typing: boolean;
}) {
  return (
    <div className="mx-auto max-w-[720px] px-6 pb-16 pt-5">
      {/* 紧凑会话情境条 */}
      {opener && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-2 border-b border-rule pb-2.5">
          <div className="flex items-center gap-2.5">
            <span className="font-serif text-[14.5px] font-bold text-ink">
              {opener.title}
            </span>
            {opener.metas[0] && (
              <span className="font-mono text-[10px] tracking-[0.06em] text-ink-mute">
                {opener.metas[0]}
              </span>
            )}
          </div>
          {opener.metas[1] && (
            <span className="font-mono text-[10px] tracking-[0.06em] text-ink-soft bg-paper-deep px-2 py-0.5">
              {opener.metas[1]}
            </span>
          )}
        </div>
      )}

      <div className="space-y-10">
        {messages.map((msg) =>
          msg.role === "user" ? (
            <UserLetter key={msg.id} msg={msg} />
          ) : (
            <CoachArticle key={msg.id} msg={msg} />
          ),
        )}
        {typing && (
          <CoachArticle
            msg={{ id: "typing", role: "assistant", time: "刚刚", blocks: [] }}
            typing
          />
        )}
      </div>
    </div>
  );
}
