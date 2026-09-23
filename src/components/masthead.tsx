"use client";

import { Bell, ChevronDown } from "lucide-react";
import { ME } from "@/lib/mock-data";
import { useUI } from "./ui-context";
import { Notifications } from "./overlays/notifications";

export function Masthead({
  notifOpen,
  setNotifOpen,
}: {
  notifOpen: boolean;
  setNotifOpen: (v: boolean) => void;
}) {
  const ui = useUI();

  return (
    <header className="shrink-0 border-b border-rule bg-paper">
      <div className="mx-auto flex h-12 max-w-[1400px] items-center justify-between px-4 lg:px-8">
        {/* 刊名 */}
        <button
          type="button"
          onClick={ui.closePanel}
          className="group flex items-baseline gap-2 text-left"
          aria-label="回到对话"
        >
          <span className="font-serif text-[20px] font-black leading-none tracking-[0.08em]">
            旁白
            <span className="text-vermilion">。</span>
          </span>
          <span className="hidden font-display text-[10px] font-medium uppercase tracking-[0.24em] text-ink-mute sm:inline">
            AI 职场导师
          </span>
        </button>

        {/* 右侧 */}
        <div className="relative flex items-center gap-1">
          <button
            type="button"
            onClick={() => setNotifOpen(!notifOpen)}
            aria-label="通知"
            className={`relative grid size-8 place-items-center transition-colors hover:bg-paper-deep ${
              notifOpen ? "bg-paper-deep" : ""
            }`}
          >
            <Bell className="size-[16px]" strokeWidth={1.5} />
            <span className="absolute right-1 top-1 grid size-3.5 place-items-center rounded-full bg-vermilion font-mono text-[8.5px] font-medium text-paper">
              3
            </span>
          </button>

          <button
            type="button"
            onClick={ui.openSettings}
            className="flex items-center gap-1.5 px-2 py-1 transition-colors hover:bg-paper-deep"
          >
            <span className="font-serif text-[13px] font-semibold">{ME.name}</span>
            <ChevronDown className="size-3 text-ink-mute" strokeWidth={1.5} />
          </button>

          {notifOpen && <Notifications onClose={() => setNotifOpen(false)} />}
        </div>
      </div>
    </header>
  );
}
