"use client";

import { useState, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";
import { agentBus } from "@/business/bus/agent-bus";

const ENTITY_RE = /\[([^\]]+)\]\((person|project|meeting|evidence):([^)]+)\)/g;

function EntityText({ text }: { text: string }) {
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
          agentBus.dispatch("overlay_requested", {
            type: kind as "person" | "project" | "meeting" | "evidence",
            id,
          });
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
          <EntityText text={text} />
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

  return (
    <p
      className={`font-serif text-[16.5px] leading-[1.95] text-ink ${dropcap ? "dropcap" : ""}`}
    >
      <EntityText text={text} />
    </p>
  );
}
