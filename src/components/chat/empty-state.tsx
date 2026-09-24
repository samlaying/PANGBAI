"use client";

import { useUI } from "../ui-context";
import { PROMPT_TEMPLATES } from "@/config/prompt-templates";

export function EmptyState() {
  const ui = useUI();

  return (
    <div className="mx-auto flex h-full max-w-[620px] flex-col justify-center px-6 py-4">
      {/* 紧凑开篇引言 */}
      <div className="text-center">
        <div className="kicker">新的一篇 · NEW ENTRY</div>
        <h1 className="mt-2 font-serif text-[24px] font-black leading-snug tracking-[0.02em] text-ink sm:text-[26px]">
          今天，工作里发生了什么？
        </h1>
        <p className="mt-2 font-serif text-[13.5px] leading-relaxed text-ink-soft">
          像给编辑写信一样——想到什么说什么，线索交给旁白来整理。
        </p>
      </div>

      {/* 场景快捷卡片 (由代码级配置文件 PROMPT_TEMPLATES 驱动) */}
      <div className="mt-5 grid w-full grid-cols-1 gap-2.5 sm:grid-cols-2">
        {PROMPT_TEMPLATES.map(({ id, icon: Icon, title, sub, templateText }) => (
          <button
            key={id}
            type="button"
            onClick={() => ui.ask(templateText)}
            className="group flex items-start gap-3 border border-rule bg-paper px-4 py-3 text-left transition-all hover:border-ink/40 hover:bg-paper-warm"
          >
            <Icon
              className="mt-0.5 size-4 shrink-0 text-ink-mute transition-colors group-hover:text-accent"
              strokeWidth={1.5}
            />
            <div className="min-w-0 flex-1">
              <span className="block truncate font-serif text-[13.5px] font-semibold text-ink">
                {title}
              </span>
              <span className="mt-0.5 block truncate text-[11.5px] text-ink-mute">
                {sub}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
