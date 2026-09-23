"use client";

import { useUI } from "./ui-context";

export type NavKey = "chat" | "people" | "projects" | "growth" | "settings";

const ITEMS: { key: NavKey; num: string; label: string }[] = [
  { key: "chat", num: "01", label: "对话" },
  { key: "people", num: "02", label: "人物" },
  { key: "projects", num: "03", label: "项目" },
  { key: "growth", num: "04", label: "成长" },
  { key: "settings", num: "05", label: "设置" },
];

export function BottomNav({ active }: { active: NavKey }) {
  const ui = useUI();
  const handlers: Record<NavKey, () => void> = {
    chat: ui.closePanel,
    people: ui.openPeople,
    projects: ui.openProjects,
    growth: ui.openGrowth,
    settings: ui.openSettings,
  };

  return (
    <nav className="border-t border-rule">
      <div className="mx-auto flex max-w-[680px] items-center justify-between px-6 py-3">
        {ITEMS.map(({ key, num, label }) => {
          const on = active === key;
          return (
            <button
              key={key}
              type="button"
              onClick={handlers[key]}
              className={`group flex items-baseline gap-1.5 py-0.5 transition-colors ${
                on ? "text-ink" : "text-ink-mute hover:text-ink-soft"
              }`}
            >
              <span className="font-mono text-[9.5px] tracking-[0.08em]">
                {num}
              </span>
              <span
                className={`font-serif text-[14px] tracking-[0.3em] ${
                  on ? "border-b border-accent pb-0.5" : "pb-0.5"
                }`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
