"use client";

import { useEffect, useRef, useState } from "react";
import { CornerDownLeft } from "lucide-react";

export function Composer({
  prefill,
  onSend,
}: {
  prefill: { text: string; n: number };
  onSend: (text: string) => void;
}) {
  const [text, setText] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (prefill.text) {
      setText(prefill.text);
      ref.current?.focus();
    }
  }, [prefill]);

  const submit = () => {
    const t = text.trim();
    if (!t) return;
    onSend(t);
    setText("");
  };

  return (
    <div className="mx-auto w-full max-w-[680px] px-6">
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="kicker">写给旁白 · TO THE COACH</span>
        <span className="hidden font-mono text-[10px] tracking-[0.1em] text-ink-mute sm:inline">
          ⏎ 发送 · ⇧⏎ 换行
        </span>
      </div>
      <div className="flex items-end gap-3 border border-rule bg-paper-warm px-5 py-4 transition-colors focus-within:border-ink/60">
        <textarea
          ref={ref}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          rows={1}
          placeholder="跟旁白说点什么，像写日记一样……"
          className="max-h-40 min-h-[28px] flex-1 resize-none bg-transparent font-serif text-[16px] leading-[1.8] outline-none placeholder:text-ink-mute/70"
        />
        <button
          type="button"
          onClick={submit}
          disabled={!text.trim()}
          className="flex shrink-0 items-center gap-2 bg-ink px-4 py-2 font-serif text-[13.5px] text-paper transition-all hover:bg-accent disabled:cursor-not-allowed disabled:opacity-30"
        >
          发送
          <CornerDownLeft className="size-3.5" strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}
