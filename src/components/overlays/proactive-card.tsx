"use client";

import { Sparkles, X } from "lucide-react";
import { useUI } from "../ui-context";

export function ProactiveCard({ onClose }: { onClose: () => void }) {
  const ui = useUI();

  return (
    <div className="anim-fade-up fixed bottom-[168px] right-6 z-30 w-[340px] border border-rule bg-paper shadow-[0_12px_40px_rgba(28,25,23,0.1)]">
      <div className="flex items-center justify-between border-b border-rule px-5 pt-3.5 pb-3">
        <span className="flex items-center gap-2 font-serif text-[13.5px] font-bold">
          <Sparkles className="size-[15px] text-accent" strokeWidth={1.5} />
          旁白 · 此刻
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="关闭"
          className="text-ink-mute transition-colors hover:text-ink"
        >
          <X className="size-3.5" strokeWidth={1.5} />
        </button>
      </div>
      <div className="px-5 py-4">
        <p className="font-serif text-[14px] leading-[1.9] text-ink-soft">
          明天 10:00 要和王总开项目评审。
          <br />
          招聘 Agent v2 有 2 个风险还没同步——考虑到他偏好提前同步，这次别等他问。
        </p>
        <div className="mt-3.5 flex gap-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              ui.ask("明天的项目评审，我该怎么准备？");
            }}
            className="flex-1 bg-ink py-2 font-serif text-[13px] text-paper transition-colors hover:bg-accent"
          >
            问旁白
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 border border-rule py-2 font-serif text-[13px] text-ink-soft transition-colors hover:border-ink hover:text-ink"
          >
            稍后再说
          </button>
        </div>
      </div>
    </div>
  );
}
