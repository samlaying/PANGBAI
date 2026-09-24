"use client";

import { useRef, useState } from "react";
import { CornerDownLeft } from "lucide-react";

export function Composer({
  prefill,
  onSend,
  busy = false,
}: {
  prefill: { text: string; n: number };
  onSend: (text: string) => void;
  /** 回复未落定期间锁定发送，保证用户发送幂等 */
  busy?: boolean;
}) {
  const [text, setText] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  const submit = () => {
    if (busy) return;
    const t = text.trim();
    if (!t) return;
    onSend(t);
    setText("");
  };

  return (
    <div className="mx-auto w-full max-w-[680px] px-6">
      <div className="mb-1 flex items-baseline justify-between">
        <span className="kicker">
          {busy ? "旁白回复中 · COACH IS REPLYING" : "写给旁白 · TO THE COACH"}
        </span>
        <span className="hidden font-mono text-[9.5px] tracking-[0.08em] text-ink-mute sm:inline">
          {busy ? "回复生成中 · 请稍候" : "⏎ 发送 · ⇧⏎ 换行"}
        </span>
      </div>
      <div className="flex items-end gap-3 border border-rule bg-paper-warm px-4 py-2.5 transition-colors focus-within:border-ink/60">
        <textarea
          ref={ref}
          autoFocus={Boolean(prefill.text)}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          rows={1}
          placeholder={busy ? "旁白正在回复，请稍候……" : "跟旁白说点什么，像写日记一样……"}
          className="max-h-36 min-h-[26px] flex-1 resize-none bg-transparent font-serif text-[15.5px] leading-[1.7] outline-none placeholder:text-ink-mute/70"
        />
        <button
          type="button"
          onClick={submit}
          disabled={!text.trim() || busy}
          className="flex shrink-0 items-center gap-1.5 bg-ink px-3.5 py-1.5 font-serif text-[13px] text-paper transition-all hover:bg-accent disabled:cursor-not-allowed disabled:opacity-30"
        >
          发送
          <CornerDownLeft className="size-3.5" strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}
