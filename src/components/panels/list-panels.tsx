"use client";

import { ChevronRight } from "lucide-react";
import { PEOPLE, PROJECTS } from "@/lib/mock-data";
import { useUI } from "../ui-context";
import { Avatar } from "../atoms";
import { PanelBody, PanelHeader } from "./side-panel";

export function PeoplePanel() {
  const ui = useUI();
  return (
    <>
      <PanelHeader kicker="人物索引 · PEOPLE INDEX">
        <h2 className="font-serif text-[26px] font-black tracking-[0.04em]">
          旁白认识的人
        </h2>
      </PanelHeader>
      <PanelBody>
        <ul>
          {PEOPLE.map((p) => (
            <li key={p.id} className="border-b border-rule last:border-0">
              <button
                type="button"
                onClick={() => ui.openPerson(p.id)}
                className="group flex w-full items-center gap-4 py-4 text-left"
              >
                <Avatar char={p.char} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2.5">
                    <span className="font-serif text-[16px] font-bold">{p.name}</span>
                    <span className="text-[12px] text-ink-mute">
                      {p.role} · {p.org}
                    </span>
                  </span>
                  <span className="mt-0.5 block truncate font-serif text-[13px] text-ink-soft">
                    {p.patterns[0].pattern} · {p.patterns[0].confidence}%
                  </span>
                </span>
                <ChevronRight
                  className="size-4 shrink-0 text-ink-mute transition-transform group-hover:translate-x-0.5 group-hover:text-ink"
                  strokeWidth={1.5}
                />
              </button>
            </li>
          ))}
        </ul>
        <p className="text-center font-mono text-[10px] tracking-[0.12em] text-ink-mute">
          人物由旁白从事件中学习 · 证据满 3 条才形成画像
        </p>
      </PanelBody>
    </>
  );
}

export function ProjectsPanel() {
  const ui = useUI();
  return (
    <>
      <PanelHeader kicker="项目索引 · PROJECT INDEX">
        <h2 className="font-serif text-[26px] font-black tracking-[0.04em]">
          手头的项目
        </h2>
      </PanelHeader>
      <PanelBody>
        <ul className="space-y-4">
          {PROJECTS.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => ui.openProject(p.id)}
                className="group w-full border border-rule px-5 py-4 text-left transition-colors hover:border-ink/40 hover:bg-paper-warm"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-serif text-[16px] font-bold">{p.name}</span>
                  <span className="font-mono text-[10px] tracking-[0.08em] text-ink-mute">
                    {p.status}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <div className="h-[3px] flex-1 bg-rule">
                    <div
                      className="h-full bg-ink transition-all"
                      style={{ width: `${p.progress}%` }}
                    />
                  </div>
                  <span className="font-display text-[15px] font-semibold">
                    {p.progress}%
                  </span>
                </div>
                {p.riskCount > 0 && (
                  <div className="mt-2 font-mono text-[10.5px] tracking-[0.06em] text-vermilion">
                    ⚠ {p.riskCount} 个风险待处理
                  </div>
                )}
              </button>
            </li>
          ))}
        </ul>
      </PanelBody>
    </>
  );
}
