"use client";

import { useState } from "react";
import { ChevronDown, FileText, MessageCircle } from "lucide-react";
import type { Person } from "@/lib/types";
import { useUI } from "../ui-context";
import {
  Avatar,
  DotMeter,
  SectionTitle,
  SolidButton,
} from "../atoms";
import { PanelBody, PanelFooter, PanelHeader } from "./side-panel";

export function PersonPanel({ person }: { person: Person }) {
  const ui = useUI();
  const [chainOpen, setChainOpen] = useState(false);
  const [observation, setObservation] = useState("");
  const [pattern, setPattern] = useState("");
  const [memoryError, setMemoryError] = useState("");

  return (
    <>
      <PanelHeader kicker={`人物档案 · PERSON FILE`}>
        <div className="flex items-center gap-4">
          <Avatar char={person.char} size="lg" />
          <div>
            <h2 className="font-serif text-[30px] font-black leading-none tracking-[0.06em]">
              {person.name}
            </h2>
            <p className="mt-1.5 text-[12.5px] text-ink-soft">
              {person.role} · {person.org}
            </p>
          </div>
        </div>
        <div className="mt-4">
          <span className="stamp">{person.relationChip}</span>
        </div>
      </PanelHeader>

      <PanelBody>
        <form onSubmit={async (event) => {
          event.preventDefault();
          try {
            await ui.confirmMemory({ personId: person.id, observation: observation.trim(), pattern: pattern.trim(), confidence: 80 });
            setObservation(""); setPattern(""); setMemoryError("");
          } catch { setMemoryError("保存失败，请重试"); }
        }} className="space-y-2 border border-rule p-3">
          <div className="kicker">记录观察 · ADD EVIDENCE</div>
          <input required aria-label="观察到的事实" value={observation} onChange={(event) => setObservation(event.target.value)} placeholder="观察到的事实" className="w-full border border-rule bg-paper px-2 py-1" />
          <input required aria-label="行为模式" value={pattern} onChange={(event) => setPattern(event.target.value)} placeholder="可能的行为模式" className="w-full border border-rule bg-paper px-2 py-1" />
          <button type="submit" className="border border-accent px-3 py-1 text-accent">确认存入</button>
          {memoryError && <p role="alert" className="text-vermilion">{memoryError}</p>}
        </form>
        {/* AI 学到的 */}
        <section className="space-y-5">
          <SectionTitle>AI 学到的 · PATTERNS</SectionTitle>
          {person.patterns.map((p) => (
            <div key={p.pattern} className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-serif text-[15px] font-semibold">
                  {p.pattern}
                </span>
                <span className="font-display text-[22px] font-semibold leading-none text-accent">
                  {p.confidence}
                  <span className="text-[12px]">%</span>
                </span>
              </div>
              <div className="flex items-center gap-3">
                <DotMeter value={p.confidence} />
                <span className="font-mono text-[10px] tracking-[0.08em] text-ink-mute">
                  {p.evidenceCount} 条证据 · 上次观察 {p.lastObserved}
                </span>
              </div>
            </div>
          ))}
        </section>

        {/* 证据链 */}
        {person.evidence.length > 0 && (
          <section className="border border-rule">
            <button
              type="button"
              onClick={() => setChainOpen(!chainOpen)}
              aria-expanded={chainOpen}
              className="flex w-full items-center justify-between px-4 py-3.5 transition-colors hover:bg-paper-warm"
            >
              <span className="font-mono text-[10.5px] tracking-[0.12em] text-ink-mute">
                证据链 EVIDENCE · {person.evidence.length}
              </span>
              <span className="flex items-center gap-1 font-mono text-[10px] text-ink-mute">
                {chainOpen ? "收起" : "展开"}
                <ChevronDown
                  className={`size-3.5 transition-transform ${chainOpen ? "rotate-180" : ""}`}
                  strokeWidth={1.5}
                />
              </span>
            </button>
            <div className={`collapsible ${chainOpen ? "open" : ""}`}>
              <div>
                <ul className="border-t border-rule">
                  {person.evidence.map((ev) => (
                    <li key={ev.id}>
                      <button
                        type="button"
                        onClick={() => ui.openEvidence(ev.id)}
                        className="w-full px-4 py-3 text-left transition-colors hover:bg-paper-warm"
                      >
                        <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.06em] text-ink-mute">
                          <FileText className="size-3" strokeWidth={1.5} />
                          {ev.date} · {ev.source}
                        </div>
                        <div className="mt-1 font-serif text-[13.5px] leading-6 text-ink-soft">
                          {ev.record.length > 40 ? ev.record.slice(0, 40) + "…" : ev.record}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        )}

        {/* 最近互动 */}
        <section className="space-y-4">
          <SectionTitle>最近互动 · TIMELINE</SectionTitle>
          <ol className="ml-1 space-y-0">
            {person.recent.map((r, i) => (
              <li key={i} className="relative flex gap-4 pb-4 last:pb-0">
                {i < person.recent.length - 1 && (
                  <span className="absolute left-[3.5px] top-3 h-full w-px bg-rule" />
                )}
                <span
                  className={`relative z-10 mt-[7px] size-[7px] shrink-0 rounded-full border ${
                    r.today ? "border-accent bg-accent" : "border-ink-mute bg-paper"
                  }`}
                />
                <span className="flex flex-wrap items-baseline gap-x-3">
                  <span className="w-14 shrink-0 font-mono text-[10.5px] tracking-[0.04em] text-ink-mute">
                    {r.date}
                  </span>
                  <span className="font-serif text-[14px] text-ink-soft">{r.text}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        {/* 关系 */}
        <section className="space-y-3">
          <SectionTitle>关系 · RELATION</SectionTitle>
          <div>
            <div className="mb-1.5 flex items-baseline justify-between">
              <span className="font-serif text-[13.5px] text-ink-soft">紧张度</span>
              <span className="font-mono text-[11px] text-vermilion">
                {person.tension}%
              </span>
            </div>
            <div className="flex h-[7px] gap-[3px]" aria-hidden>
              {Array.from({ length: 20 }, (_, i) => (
                <span
                  key={i}
                  className={`flex-1 ${i < Math.round(person.tension / 5) ? "bg-vermilion/80" : "bg-rule"}`}
                />
              ))}
            </div>
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
            {person.advice}
          </blockquote>
        </figure>
      </PanelBody>

      <PanelFooter>
        <SolidButton className="w-full py-3" onClick={() => ui.ask(`关于${person.name}，给我一些建议。`)}>
          <MessageCircle className="size-4" strokeWidth={1.5} />
          问旁白 · 关于{person.name}
        </SolidButton>
      </PanelFooter>
    </>
  );
}
