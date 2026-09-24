"use client";

import { Check, MessageCircle, TriangleAlert } from "lucide-react";
import type { Project } from "@/lib/types";
import type { Person } from "@/lib/types";
import { useUI } from "../ui-context";
import { Avatar, SectionTitle, SolidButton, GhostButton } from "../atoms";
import { PanelBody, PanelFooter, PanelHeader } from "./side-panel";

export function ProjectPanel({ project, people }: { project: Project; people: Person[] }) {
  const ui = useUI();

  return (
    <>
      <PanelHeader kicker="项目档案 · PROJECT FILE">
        <h2 className="font-serif text-[28px] font-black leading-tight tracking-[0.03em]">
          {project.name}
        </h2>
        <p className="mt-1.5 flex items-center gap-2 text-[12.5px] text-ink-soft">
          <span className="inline-block size-[6px] rounded-full bg-accent" />
          {project.status} · 截止 {project.deadline}
        </p>
      </PanelHeader>

      <PanelBody>
        {/* 进度 */}
        <section>
          <div className="flex items-baseline justify-between">
            <span className="kicker">总体进度 · PROGRESS</span>
            <span className="font-display text-[44px] font-semibold leading-none">
              {project.progress}
              <span className="text-[18px]">%</span>
            </span>
          </div>
          <div className="mt-3 h-[5px] bg-rule">
            <div className="h-full bg-ink" style={{ width: `${project.progress}%` }} />
          </div>
        </section>

        {/* 风险 */}
        {project.risks.length > 0 && (
          <section className="space-y-3">
            <SectionTitle>
              风险 {project.risks.length} 项待处理 · RISKS
            </SectionTitle>
            {project.risks.map((r) => (
              <div
                key={r.title}
                className="border-l-2 border-vermilion bg-paper-deep/50 px-4 py-3"
              >
                <div className="flex items-center gap-2 font-serif text-[14px] font-semibold">
                  <TriangleAlert className="size-[15px] shrink-0 text-vermilion" strokeWidth={1.5} />
                  {r.title}
                </div>
                <p className="mt-1 pl-[23px] text-[12.5px] text-ink-soft">{r.note}</p>
              </div>
            ))}
          </section>
        )}

        {/* 里程碑 */}
        <section className="space-y-4">
          <SectionTitle>里程碑 · MILESTONES</SectionTitle>
          <ol>
            {project.milestones.map((m, i) => (
              <li key={m.name} className="relative flex items-center gap-4 pb-4 last:pb-0">
                {i < project.milestones.length - 1 && (
                  <span className="absolute left-[5px] top-3.5 h-full w-px bg-rule" />
                )}
                <span
                  className={`relative z-10 grid size-[11px] shrink-0 place-items-center rounded-full border ${
                    m.state === "done"
                      ? "border-ink bg-ink"
                      : m.state === "warn"
                        ? "border-vermilion bg-vermilion"
                        : "border-ink-mute bg-paper"
                  }`}
                >
                  {m.state === "done" && (
                    <Check className="size-[7px] text-paper" strokeWidth={3} />
                  )}
                </span>
                <span className="flex flex-1 items-baseline justify-between gap-3">
                  <span
                    className={`font-serif text-[14.5px] ${m.state === "todo" ? "text-ink-soft" : "font-semibold"}`}
                  >
                    {m.name}
                  </span>
                  <span
                    className={`font-mono text-[10.5px] tracking-[0.04em] ${
                      m.state === "warn" ? "text-vermilion" : "text-ink-mute"
                    }`}
                  >
                    {m.state === "done" ? "✓ " : m.state === "warn" ? "⚠ " : ""}
                    {m.date}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        {/* 成员 */}
        <section className="space-y-4">
          <SectionTitle>成员 · WHO IS IN</SectionTitle>
          <div className="flex flex-wrap gap-2.5">
            {project.members.map((id) => {
              const p = id === "me" ? { id: "me", char: "我", name: "我" } : people.find((person) => person.id === id);
              if (!p) return null;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => id !== "me" && ui.openPerson(id)}
                  className={`flex items-center gap-2 border px-2.5 py-1.5 transition-colors ${
                    id === "me"
                      ? "border-rule opacity-80"
                      : "border-rule hover:border-ink/50 hover:bg-paper-warm"
                  }`}
                >
                  <Avatar char={p.char} size="sm" />
                  <span className="font-serif text-[13px]">{p.name}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* 旁白建议 */}
        <figure className="relative border border-rule bg-paper-warm px-5 py-5 pl-6">
          <span
            aria-hidden
            className="absolute -left-0.5 -top-2 select-none font-display text-[40px] leading-none text-accent/25"
          >
            &ldquo;
          </span>
          <div className="kicker mb-2">旁白建议 · ADVICE</div>
          <blockquote className="border-l-2 border-accent pl-4 font-serif text-[14.5px] leading-[1.85]">
            {project.advice}
          </blockquote>
        </figure>
      </PanelBody>

      <PanelFooter>
        <div className="flex gap-2.5">
          <GhostButton className="flex-1 py-2.5" onClick={() => ui.ask(`帮我写一条关于「${project.name}」风险同步的消息。`)}>
            生成同步话术
          </GhostButton>
          <SolidButton className="flex-1 py-2.5" onClick={() => ui.ask(`关于「${project.name}」，我该注意什么？`)}>
            <MessageCircle className="size-4" strokeWidth={1.5} />
            问旁白
          </SolidButton>
        </div>
      </PanelFooter>
    </>
  );
}
