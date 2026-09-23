"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Calendar,
  FolderOpen,
  MessageCircle,
  Search,
  User,
} from "lucide-react";
import { SEARCH_ASKS, SEARCH_SOURCE } from "@/lib/mock-data";
import { useUI } from "../ui-context";

interface FlatItem {
  group: string;
  title: string;
  sub: string;
  meta: string;
  key: string;
}

export function CommandMenu({ onClose }: { onClose: () => void }) {
  const ui = useUI();
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const items = useMemo<FlatItem[]>(() => {
    const flat: FlatItem[] = SEARCH_SOURCE.flatMap((g) =>
      g.items.map((it) => ({ group: g.group, ...it })),
    );
    const ask: FlatItem[] = SEARCH_ASKS.map((q) => ({
      group: "问旁白",
      title: q,
      sub: "直接在对话里问",
      meta: "ASK",
      key: `ask:${q}`,
    }));
    const all = [...flat, ...ask];
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (it) =>
        it.title.toLowerCase().includes(q) ||
        it.sub.toLowerCase().includes(q) ||
        it.group.includes(q),
    );
  }, [query]);

  useEffect(() => setIndex(0), [query]);

  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-idx="${index}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [index]);

  const open = (it: FlatItem, ask: boolean) => {
    onClose();
    if (ask || it.key.startsWith("ask:")) {
      ui.ask(it.key.slice(4) || it.title);
      return;
    }
    const [kind, id] = it.key.split(":");
    if (kind === "person") ui.openPerson(id);
    else if (kind === "project") ui.openProject(id);
    else if (kind === "meeting") ui.openMeeting();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndex((i) => (i + 1) % Math.max(items.length, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndex((i) => (i - 1 + items.length) % Math.max(items.length, 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const it = items[index];
      if (it) open(it, e.metaKey || e.ctrlKey);
    }
  };

  let lastGroup = "";

  return (
    <div
      className="anim-fade fixed inset-0 z-[70] flex items-start justify-center pt-[12vh]"
      role="dialog"
      aria-modal="true"
      aria-label="全局检索"
    >
      <button
        type="button"
        aria-label="关闭检索"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-ink/20 backdrop-blur-[2px]"
      />
      <div className="anim-fade-up relative w-[620px] max-w-[92vw] border border-rule bg-paper shadow-[0_32px_80px_rgba(28,25,23,0.16)]">
        {/* 输入 */}
        <div className="flex items-center gap-4 border-b border-rule px-6 py-5">
          <Search className="size-[18px] shrink-0 text-ink-mute" strokeWidth={1.5} />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="检索人物、项目、会议、记忆…"
            className="flex-1 bg-transparent font-serif text-[17px] outline-none placeholder:text-ink-mute/70"
          />
          <kbd>ESC</kbd>
        </div>

        {/* 结果 */}
        <div ref={listRef} className="max-h-[50vh] overflow-y-auto py-2">
          {items.length === 0 && (
            <p className="px-6 py-8 text-center font-serif text-[14px] text-ink-mute">
              本期没有找到「{query}」——要不要直接问旁白？
            </p>
          )}
          {items.map((it, i) => {
            const newGroup = it.group !== lastGroup;
            lastGroup = it.group;
            const selected = i === index;
            const Icon =
              it.group === "人物"
                ? User
                : it.group === "项目"
                  ? FolderOpen
                  : it.group === "会议"
                    ? Calendar
                    : MessageCircle;
            return (
              <div key={it.key + i}>
                {newGroup && (
                  <div className="kicker px-6 pb-1.5 pt-4">
                    {it.group === "问旁白" ? "问旁白 · ASK PANGBAI" : `${it.group}`}
                  </div>
                )}
                <button
                  type="button"
                  data-idx={i}
                  onMouseEnter={() => setIndex(i)}
                  onClick={(e) => open(it, e.metaKey || e.ctrlKey)}
                  className={`flex w-full items-center gap-3.5 px-6 py-2.5 text-left transition-colors ${
                    selected
                      ? "border-l-2 border-accent bg-paper-deep/60 pl-[22px]"
                      : "border-l-2 border-transparent pl-[22px]"
                  }`}
                >
                  <Icon className="size-4 shrink-0 text-ink-mute" strokeWidth={1.5} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-serif text-[14.5px]">
                      {it.title}
                    </span>
                    <span className="block truncate text-[11.5px] text-ink-mute">
                      {it.sub}
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-[10px] tracking-[0.08em] text-ink-mute">
                    {it.meta}
                  </span>
                </button>
              </div>
            );
          })}
        </div>

        {/* 底栏 */}
        <div className="flex gap-5 border-t border-rule px-6 py-3 font-mono text-[10px] tracking-[0.1em] text-ink-mute">
          <span>↑↓ 选择</span>
          <span>↵ 打开</span>
          <span>⌘↵ 问旁白</span>
          <span className="ml-auto">旁白检索 · 搜到即达</span>
        </div>
      </div>
    </div>
  );
}
