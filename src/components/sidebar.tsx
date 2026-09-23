"use client";

import {
  FolderOpen,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  SquarePen,
  Trash2,
} from "lucide-react";
import type { Conversation, Project } from "@/lib/types";

const GROUP_ORDER: Conversation["group"][] = ["今天", "本周", "更早"];

export function Sidebar({
  conversations,
  activeId,
  projects,
  collapsed,
  onSelect,
  onNew,
  onDelete,
  onOpenProject,
  onNewProject,
  onToggle,
  onSearch,
}: {
  conversations: Conversation[];
  activeId: string;
  projects: Project[];
  collapsed: boolean;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onOpenProject: (id: string) => void;
  onNewProject: () => void;
  onToggle: () => void;
  onSearch: () => void;
}) {
  if (collapsed) {
    return (
      <aside className="flex w-[52px] shrink-0 flex-col items-center gap-1.5 border-r border-rule py-3">
        <button
          type="button"
          onClick={onToggle}
          aria-label="展开侧边栏"
          title="展开侧边栏"
          className="grid size-9 place-items-center font-serif text-[16px] font-black text-ink transition-colors hover:bg-paper-deep"
        >
          旁<span className="text-vermilion">。</span>
        </button>
        <div className="my-0.5 h-px w-6 bg-rule" />
        <button
          type="button"
          onClick={onNew}
          aria-label="新对话"
          title="新对话"
          className="grid size-9 place-items-center text-ink-mute transition-colors hover:bg-paper-deep hover:text-ink"
        >
          <SquarePen className="size-4" strokeWidth={1.5} />
        </button>
        <button
          type="button"
          onClick={onSearch}
          aria-label="检索 (⌘K)"
          title="检索 (⌘K)"
          className="grid size-9 place-items-center text-ink-mute transition-colors hover:bg-paper-deep hover:text-ink"
        >
          <Search className="size-4" strokeWidth={1.5} />
        </button>
        <button
          type="button"
          onClick={onNewProject}
          aria-label="新建项目"
          title="新建项目"
          className="grid size-9 place-items-center text-ink-mute transition-colors hover:bg-paper-deep hover:text-ink"
        >
          <Plus className="size-4" strokeWidth={1.5} />
        </button>
      </aside>
    );
  }

  return (
    <aside className="flex w-[264px] shrink-0 flex-col border-r border-rule">
      {/* 顶部：品牌 Logo + 折叠 */}
      <div className="flex h-12 items-center justify-between border-b border-rule px-4">
        <div className="flex items-baseline gap-2">
          <span className="font-serif text-[18px] font-black leading-none tracking-[0.06em]">
            旁白
            <span className="text-vermilion">。</span>
          </span>
          <span className="font-display text-[9.5px] font-medium uppercase tracking-[0.2em] text-ink-mute">
            AI 职场导师
          </span>
        </div>
        <button
          type="button"
          onClick={onToggle}
          aria-label="收起侧边栏"
          className="grid size-7 place-items-center text-ink-mute transition-colors hover:bg-paper-deep hover:text-ink"
        >
          <PanelLeftClose className="size-4" strokeWidth={1.5} />
        </button>
      </div>

      {/* 新对话与快速搜索 */}
      <div className="space-y-2 px-4 pt-3">
        <button
          type="button"
          onClick={onNew}
          className="flex w-full items-center justify-center gap-2 bg-ink py-2 font-serif text-[13.5px] text-paper transition-colors hover:bg-accent"
        >
          <SquarePen className="size-4" strokeWidth={1.5} />
          新对话
        </button>

        <button
          type="button"
          onClick={onSearch}
          className="flex w-full items-center justify-between border border-rule bg-paper-warm px-3 py-1.5 text-left transition-colors hover:border-ink-mute"
        >
          <span className="flex items-center gap-2 truncate font-serif text-[12.5px] text-ink-mute">
            <Search className="size-3.5 shrink-0" strokeWidth={1.5} />
            检索记录、人物…
          </span>
          <kbd className="font-mono text-[9.5px] text-ink-mute">⌘K</kbd>
        </button>
      </div>

      {/* 对话列表 */}
      <div className="mt-3 flex-1 overflow-y-auto px-2 pb-4">
        {GROUP_ORDER.map((group) => {
          const items = conversations.filter((c) => c.group === group);
          if (items.length === 0) return null;
          return (
            <section key={group} className="mb-4">
              <div className="px-2 pb-1.5 font-mono text-[9.5px] tracking-[0.18em] text-ink-mute">
                {group}
              </div>
              <ul>
                {items.map((c) => {
                  const active = c.id === activeId;
                  return (
                    <li key={c.id} className="group/item relative">
                      <button
                        type="button"
                        onClick={() => onSelect(c.id)}
                        className={`w-full border-l-2 py-2 pl-3 pr-7 text-left transition-colors ${
                          active
                            ? "border-accent bg-paper-deep"
                            : "border-transparent hover:bg-paper-deep/60"
                        }`}
                      >
                        <span
                          className={`block truncate font-serif text-[13.5px] leading-6 ${
                            active ? "font-semibold text-ink" : "text-ink-soft"
                          }`}
                        >
                          {c.title}
                        </span>
                        <span className="block font-mono text-[9.5px] tracking-[0.06em] text-ink-mute">
                          {c.time} · {c.messages.length} 则
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(c.id);
                        }}
                        aria-label={`删除「${c.title}」`}
                        className="absolute right-1.5 top-1/2 hidden -translate-y-1/2 p-1 text-ink-mute transition-colors hover:text-vermilion group-hover/item:block"
                      >
                        <Trash2 className="size-3.5" strokeWidth={1.5} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>

      {/* 项目速览 */}
      <div className="border-t border-rule px-4 py-3.5">
        <div className="kicker mb-2">项目 · PROJECTS</div>
        <ul className="mb-2 space-y-0.5">
          {projects.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onOpenProject(p.id)}
                className="flex w-full items-center gap-2 py-1 text-left text-ink-soft transition-colors hover:text-ink"
              >
                <FolderOpen className="size-3.5 shrink-0 text-ink-mute" strokeWidth={1.5} />
                <span className="truncate font-serif text-[13px]">{p.name}</span>
                {p.riskCount > 0 && (
                  <span className="ml-auto shrink-0 font-mono text-[9.5px] text-vermilion">
                    ⚠{p.riskCount}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={onNewProject}
          className="flex w-full items-center justify-center gap-1.5 border border-dashed border-rule py-1.5 font-serif text-[12.5px] text-ink-mute transition-colors hover:border-accent hover:text-accent"
        >
          <Plus className="size-3.5" strokeWidth={1.5} />
          新建项目
        </button>
      </div>
    </aside>
  );
}
