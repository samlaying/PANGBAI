"use client";

import { Bell, ChevronDown, Search } from "lucide-react";
import { ME } from "@/lib/mock-data";
import { useUI } from "./ui-context";
import { Notifications } from "./overlays/notifications";

export function Masthead({
  notifOpen,
  setNotifOpen,
  onSearch,
}: {
  notifOpen: boolean;
  setNotifOpen: (v: boolean) => void;
  onSearch: () => void;
}) {
  const ui = useUI();

  return (
    <header className="shrink-0 border-b border-rule bg-paper">
      <div className="mx-auto flex h-[60px] max-w-[1200px] items-center gap-8 px-6 lg:px-10">
        {/* 刊名 */}
        <button
          type="button"
          onClick={ui.closePanel}
          className="group flex items-baseline gap-2.5 text-left"
          aria-label="回到对话"
        >
          <span className="font-serif text-[26px] font-black leading-none tracking-[0.08em]">
            旁白
            <span className="text-vermilion">。</span>
          </span>
          <span className="hidden font-display text-[11px] font-medium uppercase tracking-[0.32em] text-ink-mute sm:inline">
            Pangbai Review
          </span>
        </button>

        {/* 检索 */}
        <button
          type="button"
          onClick={onSearch}
          className="group mx-auto hidden h-9 w-[380px] items-center gap-3 border border-rule bg-paper-warm px-4 text-left transition-colors hover:border-ink-mute md:flex"
          aria-label="打开全局检索"
        >
          <Search className="size-[15px] text-ink-mute" strokeWidth={1.5} />
          <span className="flex-1 truncate font-serif text-[13.5px] text-ink-mute group-hover:text-ink-soft">
            检索人物、项目、会议、记忆…
          </span>
          <kbd>⌘K</kbd>
        </button>

        {/* 右侧 */}
        <div className="relative ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => setNotifOpen(!notifOpen)}
            aria-label="通知"
            className={`relative grid size-9 place-items-center transition-colors hover:bg-paper-deep ${
              notifOpen ? "bg-paper-deep" : ""
            }`}
          >
            <Bell className="size-[17px]" strokeWidth={1.5} />
            <span className="absolute right-1 top-1 grid size-4 place-items-center rounded-full bg-vermilion font-mono text-[9px] font-medium text-paper">
              3
            </span>
          </button>

          <button
            type="button"
            onClick={ui.openSettings}
            className="flex items-center gap-1.5 px-2 py-1.5 transition-colors hover:bg-paper-deep"
          >
            <span className="font-serif text-[14px] font-semibold">{ME.name}</span>
            <ChevronDown className="size-3.5 text-ink-mute" strokeWidth={1.5} />
          </button>

          {notifOpen && <Notifications onClose={() => setNotifOpen(false)} />}
        </div>
      </div>

      {/* 期刊信息条 */}
      <div className="border-t border-rule">
        <div className="mx-auto hidden h-[26px] max-w-[1200px] items-center justify-between px-6 font-mono text-[10px] tracking-[0.14em] text-ink-mute md:flex lg:px-10">
          <span>第 09 期 · 2026年9月23日 星期三 · 对话实录</span>
          <span>本期编辑：旁白 AI · 记录你身边正在发生的工作</span>
        </div>
      </div>
      <div className="rule-double" />
    </header>
  );
}
