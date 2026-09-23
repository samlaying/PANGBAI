"use client";

import { useEffect } from "react";
import { Calendar, MessageCircle, TriangleAlert } from "lucide-react";
import { NOTICES } from "@/lib/mock-data";
import { useUI } from "../ui-context";

const ICONS = {
  risk: TriangleAlert,
  message: MessageCircle,
  calendar: Calendar,
};

export function Notifications({ onClose }: { onClose: () => void }) {
  const ui = useUI();

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest("[data-notif-root]")) onClose();
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [onClose]);

  return (
    <div
      data-notif-root
      className="anim-fade-up absolute right-0 top-[calc(100%+10px)] w-[380px] border border-rule bg-paper shadow-[0_20px_56px_rgba(28,25,23,0.14)]"
    >
      <div className="flex items-center justify-between border-b border-rule px-5 py-3.5">
        <span className="kicker">通知 · NOTICES</span>
        <button
          type="button"
          onClick={onClose}
          className="font-mono text-[10px] tracking-[0.1em] text-accent hover:underline"
        >
          全部已读
        </button>
      </div>

      <ul>
        {NOTICES.map((n) => {
          const Icon = ICONS[n.icon];
          return (
            <li key={n.id} className="border-b border-rule px-5 py-4 last:border-0">
              <div className="flex items-baseline justify-between gap-3">
                <span className="flex items-center gap-2 font-serif text-[13.5px] font-bold">
                  <Icon
                    className={`size-[15px] ${n.icon === "risk" ? "text-vermilion" : "text-ink-mute"}`}
                    strokeWidth={1.5}
                  />
                  {n.title}
                </span>
                <span className="shrink-0 font-mono text-[9.5px] text-ink-mute">
                  {n.time}
                </span>
              </div>
              <p className="mt-1.5 pl-[23px] text-[12.5px] leading-[1.7] text-ink-soft">
                {n.body}
              </p>
              <div className="mt-2.5 flex justify-end gap-4 pl-[23px]">
                <button
                  type="button"
                  onClick={onClose}
                  className="font-mono text-[10px] tracking-[0.08em] text-ink-mute hover:text-ink"
                >
                  {n.secondary}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (n.icon === "risk") ui.openProject("recruiting");
                    else if (n.icon === "calendar") ui.openMeeting();
                    else ui.ask("李总问「客户那边怎么说」，我该怎么回？");
                  }}
                  className="font-mono text-[10px] tracking-[0.08em] text-accent hover:underline"
                >
                  {n.primary}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
