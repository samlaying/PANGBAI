"use client";

import { Calendar, Clock, FolderOpen, ListChecks, MessageCircle, Video } from "lucide-react";
import { MEETING } from "@/lib/mock-data";
import { personById, projectById } from "@/lib/mock-data";
import { useUI } from "../ui-context";
import { Avatar, SectionTitle, SolidButton, GhostButton, DotMeter } from "../atoms";
import { PanelBody, PanelFooter, PanelHeader } from "./side-panel";

export function MeetingPanel() {
  const ui = useUI();
  const project = projectById(MEETING.relatedProjectId);

  return (
    <>
      <PanelHeader kicker="会议 · MEETING">
        <h2 className="font-serif text-[28px] font-black tracking-[0.03em]">
          {MEETING.title}
        </h2>
        <ul className="mt-2 space-y-1 font-mono text-[11px] tracking-[0.04em] text-ink-soft">
          <li className="flex items-center gap-2">
            <Calendar className="size-3.5 text-ink-mute" strokeWidth={1.5} />
            {MEETING.when}
          </li>
          <li className="flex items-center gap-2">
            <Clock className="size-3.5 text-ink-mute" strokeWidth={1.5} />
            {MEETING.duration}
          </li>
          <li className="flex items-center gap-2">
            <Video className="size-3.5 text-ink-mute" strokeWidth={1.5} />
            {MEETING.location}
          </li>
        </ul>
      </PanelHeader>

      <PanelBody>
        {/* 参会人 */}
        <section className="space-y-3">
          <SectionTitle>参会人 · ATTENDEES</SectionTitle>
          <div className="flex flex-wrap gap-2.5">
            {MEETING.attendees.map(({ personId, host }) => {
              const p = personById(personId);
              if (!p) return null;
              return (
                <button
                  key={personId}
                  type="button"
                  onClick={() => ui.openPerson(personId)}
                  className="flex items-center gap-2 border border-rule px-2.5 py-1.5 transition-colors hover:border-ink/50 hover:bg-paper-warm"
                >
                  <Avatar char={p.char} size="sm" />
                  <span className="font-serif text-[13px]">{p.name}</span>
                  {host && (
                    <span className="border border-accent/60 px-1 py-px font-mono text-[9px] tracking-[0.1em] text-accent">
                      主持
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* 会前建议 */}
        <section className="border border-rule bg-paper-warm p-5">
          <div className="kicker mb-3">旁白会前建议 · PREP</div>
          <p className="mb-3 font-serif text-[14.5px] leading-[1.8]">
            王总主持，项目有 2 个风险未同步——他最在意这个。
          </p>
          <ol className="space-y-2.5">
            {MEETING.prep.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="font-display text-[18px] font-semibold leading-[1.3] text-accent">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="font-serif text-[14px] leading-[1.7] text-ink-soft">
                  {step}
                </span>
              </li>
            ))}
          </ol>
          <div className="mt-4 flex flex-wrap gap-2">
            <GhostButton onClick={() => ui.ask("帮我写一条发给王总的会前风险预告消息。")}>
              生成预告消息
            </GhostButton>
            <GhostButton onClick={() => ui.ask("给我一页「招聘 Agent v2」的风险应对清单。")}>
              <ListChecks className="size-4" strokeWidth={1.5} />
              打开准备清单
            </GhostButton>
          </div>
        </section>

        {/* 参会人背景 */}
        <section className="space-y-3">
          <SectionTitle>参会人背景 · WHAT I KNOW</SectionTitle>
          {MEETING.attendees.map(({ personId }) => {
            const p = personById(personId);
            if (!p) return null;
            const top = p.patterns[0];
            return (
              <button
                key={personId}
                type="button"
                onClick={() => ui.openPerson(personId)}
                className="flex w-full items-center gap-3 border-b border-rule pb-3 text-left last:border-0"
              >
                <Avatar char={p.char} size="sm" />
                <span className="flex-1 truncate font-serif text-[13.5px]">
                  {p.name}
                  <span className="text-ink-mute"> · {top.pattern}</span>
                </span>
                <DotMeter value={top.confidence} />
                <span className="font-mono text-[10px] text-ink-mute">
                  {top.confidence}%
                </span>
              </button>
            );
          })}
          <p className="text-center font-mono text-[9.5px] tracking-[0.12em] text-ink-mute">
            点击头像可查看详细画像 ↗
          </p>
        </section>

        {/* 相关项目 */}
        {project && (
          <section className="space-y-3">
            <SectionTitle>相关项目 · RELATED</SectionTitle>
            <button
              type="button"
              onClick={() => ui.openProject(project.id)}
              className="flex w-full items-center justify-between border border-rule px-4 py-3.5 transition-colors hover:border-ink/40 hover:bg-paper-warm"
            >
              <span className="flex items-center gap-3">
                <FolderOpen className="size-4 text-ink-mute" strokeWidth={1.5} />
                <span className="font-serif text-[14.5px] font-semibold">
                  {project.name}
                </span>
              </span>
              <span className="font-mono text-[10.5px] text-vermilion">
                ⚠ {project.riskCount} 风险
              </span>
            </button>
          </section>
        )}
      </PanelBody>

      <PanelFooter>
        <SolidButton className="w-full py-3" onClick={() => ui.ask("明天的项目评审，我该怎么准备？")}>
          <MessageCircle className="size-4" strokeWidth={1.5} />
          问旁白 · 准备这个会
        </SolidButton>
      </PanelFooter>
    </>
  );
}
