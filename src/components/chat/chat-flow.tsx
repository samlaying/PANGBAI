"use client";

import { BookOpen, Drama, Lightbulb } from "lucide-react";
import type { AgentMessage } from "@/business/entities/message-part";
import { useUI } from "../ui-context";
import { FlowerDivider } from "../atoms";
import { AgentRenderer } from "../agent/agent-renderer";

function ActionButtons() {
  const ui = useUI();
  const items = [
    { icon: Lightbulb, label: "建议", onClick: () => ui.ask("再给我一版更简短的建议。") },
    { icon: BookOpen, label: "类似案例", onClick: () => ui.ask("之前有类似的案例吗？") },
    { icon: Drama, label: "来演练一下", onClick: ui.startRehearsal },
  ];

  return (
    <div className="mt-5 flex flex-wrap gap-2.5">
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

function UserLetter({ msg }: { msg: AgentMessage }) {
  const text = msg.parts
    .filter((part): part is Extract<typeof part, { type: "text" }> => part.type === "text")
    .map((part) => part.text)
    .join("\n");

  return (
    <article className="ml-auto w-full max-w-[540px] border-l-2 border-ink bg-paper-deep/50 px-6 py-4 md:ml-[120px]">
      <div className="kicker mb-1.5">我 · 来信 · {msg.timestamp}</div>
      <p className="whitespace-pre-wrap text-[14.5px] leading-[1.85] text-ink-soft">{text}</p>
    </article>
  );
}

function CoachArticle({
  msg,
  isLatest,
  isTyping,
}: {
  msg: AgentMessage;
  isLatest: boolean;
  isTyping: boolean;
}) {
  const hasParts = msg.parts.length > 0;

  return (
    <article>
      <div className="flex items-center gap-3">
        <span className="grid size-8 place-items-center border border-ink font-serif text-[15px] font-bold">旁</span>
        <span className="font-serif text-[15px] font-bold">旁白</span>
        <span className="font-mono text-[10px] tracking-[0.1em] text-ink-mute">{msg.timestamp}</span>
      </div>
      <div className="mt-4">
        {hasParts ? (
          <AgentRenderer parts={msg.parts} />
        ) : isTyping ? (
          <div className="mt-5 flex items-center gap-2 font-serif text-[14px] text-ink-mute">
            正在翻看记录
            <span className="anim-blink">·</span>
            <span className="anim-blink [animation-delay:0.3s]">·</span>
            <span className="anim-blink [animation-delay:0.6s]">·</span>
          </div>
        ) : null}
      </div>
      {/* 仅在最新一条回复且完全生成完毕（!isTyping）后，展示快捷追问动作栏 */}
      {hasParts && isLatest && !isTyping && <ActionButtons />}
    </article>
  );
}

export function ChatFlow({
  messages,
  typing,
}: {
  messages: AgentMessage[];
  typing: boolean;
}) {
  let lastAssistantIndex = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "assistant") {
      lastAssistantIndex = i;
      break;
    }
  }

  // 兜底：如果正在 typing 但列表中尚无 assistant 消息
  const hasPendingUnplacedAssistant = typing && lastAssistantIndex === -1;

  return (
    <div className="mx-auto max-w-[720px] px-6 pb-16 pt-5">
      <div className="space-y-10">
        {messages.map((msg, index) => {
          if (msg.role === "user") return <UserLetter key={msg.id} msg={msg} />;
          if (msg.role === "assistant") {
            return (
              <CoachArticle
                key={msg.id}
                msg={msg}
                isLatest={index === lastAssistantIndex}
                isTyping={typing && index === lastAssistantIndex}
              />
            );
          }
          return null;
        })}
        {hasPendingUnplacedAssistant && (
          <article>
            <div className="flex items-center gap-3">
              <span className="grid size-8 place-items-center border border-ink font-serif text-[15px] font-bold">旁</span>
              <span className="font-serif text-[15px] font-bold">旁白</span>
            </div>
            <div className="mt-5 flex items-center gap-2 font-serif text-[14px] text-ink-mute">
              正在翻看记录
              <span className="anim-blink">·</span>
              <span className="anim-blink [animation-delay:0.3s]">·</span>
              <span className="anim-blink [animation-delay:0.6s]">·</span>
            </div>
          </article>
        )}
        <FlowerDivider />
      </div>
    </div>
  );
}
