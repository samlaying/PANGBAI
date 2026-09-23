"use client";

import {
  CalendarCheck,
  FolderPlus,
  MessagesSquare,
  NotebookPen,
} from "lucide-react";
import { useUI } from "../ui-context";

export function EmptyState() {
  const ui = useUI();

  const suggestions = [
    {
      icon: NotebookPen,
      title: "记录今天的一件事",
      sub: "会后、群聊、一次不愉快——都值得记",
      onClick: () => ui.ask("今天想跟你说件事："),
    },
    {
      icon: CalendarCheck,
      title: "有个会要准备",
      sub: "旁白按参会人画像帮你备会",
      onClick: () => ui.ask("明天有个会要开，帮我准备一下："),
    },
    {
      icon: MessagesSquare,
      title: "有句话不会回",
      sub: "贴出对话，旁白帮你斟酌措辞",
      onClick: () => ui.ask("有句话不知道怎么回："),
    },
    {
      icon: FolderPlus,
      title: "新建项目档案",
      sub: "开一个新项目的观察记录",
      onClick: ui.createProject,
    },
  ];

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

      {/* 4 个场景快捷卡片 */}
      <div className="mt-5 grid w-full grid-cols-1 gap-2.5 sm:grid-cols-2">
        {suggestions.map(({ icon: Icon, title, sub, onClick }) => (
          <button
            key={title}
            type="button"
            onClick={onClick}
            className="group flex items-start gap-3 border border-rule bg-paper px-4 py-3 text-left transition-all hover:border-ink/40 hover:bg-paper-warm"
          >
            <Icon
              className="mt-0.5 size-4 shrink-0 text-ink-mute transition-colors group-hover:text-accent"
              strokeWidth={1.5}
            />
            <div className="min-w-0">
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
