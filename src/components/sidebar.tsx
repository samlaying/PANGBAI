"use client";

import {
  FolderOpen,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
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
}) {
  if (collapsed) {
    return (
      <aside className="flex w-[52px] shrink-0 flex-col items-center gap-1.5 border-r border-rule py-3">
        <button
          type="button"
          onClick={onToggle}
          aria-label="展开目录栏"
          title="展开目录栏"
          className="grid size-9 place-items-center text-ink-mute transition-colors hover:bg-paper-deep hover:text-ink"
        >
          <PanelLeftOpen className="size-4" strokeWidth={1.5} />
        </button>
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
      {/* 顶部：目录 + 折叠 */}
      <div className="flex items-center justify-between px-4 pb-3 pt-4">
        <span className="kicker">目录 · CONTENTS</span>
        <button
          type="button"
          onClick={onToggle}
          aria-label="收起目录栏"
          className="grid size-7 place-items-center text-ink-mute transition-colors hover:bg-paper-deep hover:text-ink"
        >
          <PanelLeftClose className="size-4" strokeWidth={1.5} />
        </button>
      </div>

      {/* 新对话 */}
      <div className="px-4">
        <button
          type="button"
          onClick={onNew}
          className="flex w-full items-center justify-center gap-2 bg-ink py-2.5 font-serif text-[13.5px] text-paper transition-colors hover:bg-accent"
        >
          <SquarePen className="size-4" strokeWidth={1.5} />
          新对话
        </button>
      </div>

      {/* 对话列表 */}
      <div className="mt-4 flex-1 overflow-y-auto px-2 pb-4">
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
