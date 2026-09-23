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
    <div className="mx-auto flex h-full max-w-[620px] flex-col items-center justify-center px-6 py-10 text-center">
      <div className="kicker">新的一篇 · NEW ENTRY</div>
      <h1 className="mt-4 font-serif text-[34px] font-black leading-[1.35] tracking-[0.02em]">
        今天，工作里
        <br />
        发生了什么？
      </h1>
      <p className="mt-4 max-w-[380px] font-serif text-[15px] leading-[1.9] text-ink-soft">
        像给编辑写信一样——想到什么说什么，
        线索交给旁白来整理。
      </p>
      <span
        aria-hidden
        className="mt-3 select-none font-display text-[44px] leading-none text-accent/30"
      >
        &rdquo;
      </span>

      <div className="mt-8 grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
        {suggestions.map(({ icon: Icon, title, sub, onClick }) => (
          <button
            key={title}
            type="button"
            onClick={onClick}
            className="group flex items-start gap-3.5 border border-rule bg-paper px-5 py-4 text-left transition-colors hover:border-ink/40 hover:bg-paper-warm"
          >
            <Icon
              className="mt-0.5 size-[18px] shrink-0 text-ink-mute transition-colors group-hover:text-accent"
              strokeWidth={1.5}
            />
            <span>
              <span className="block font-serif text-[14.5px] font-semibold">
                {title}
              </span>
              <span className="mt-0.5 block text-[12px] leading-relaxed text-ink-mute">
                {sub}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
