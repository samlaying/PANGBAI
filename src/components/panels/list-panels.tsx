"use client";

import { useEffect, useState } from "react";
import { ChevronRight, Plus } from "lucide-react";
import type { Person, Project } from "@/lib/types";
import { PEOPLE } from "@/lib/mock-data";
import { useUI } from "../ui-context";
import { Avatar, SolidButton, GhostButton } from "../atoms";
import { PanelBody, PanelHeader } from "./side-panel";

export function PeoplePanel({ people = PEOPLE }: { people?: Person[] } = {}) {
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
          {people.map((p) => (
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

export function ProjectsPanel({
  projects,
  createSignal,
  onCreated,
}: {
  projects: Project[];
  createSignal: number;
  onCreated: (p: Project) => void;
}) {
  const ui = useUI();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [deadline, setDeadline] = useState("");

  useEffect(() => {
    if (createSignal > 0) setCreating(true);
  }, [createSignal]);

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onCreated({
      id: `p-${trimmed}-${projects.length + 1}`,
      name: trimmed,
      status: "进行中",
      deadline: deadline.trim() || "未定",
      progress: 0,
      riskCount: 0,
      risks: [],
      milestones: [],
      members: ["me"],
      advice:
        "新建的项目，旁白还没有观察。多在对话里聊到它，我会开始记录风险、人物和节点。",
    });
    setCreating(false);
    setName("");
    setDeadline("");
  };

  return (
    <>
      <PanelHeader kicker="项目索引 · PROJECT INDEX">
        <h2 className="font-serif text-[26px] font-black tracking-[0.04em]">
          手头的项目
        </h2>
      </PanelHeader>
      <PanelBody>
        {creating ? (
          <div className="space-y-5">
            <div className="kicker">新建项目档案 · NEW PROJECT</div>
            <div>
              <label className="kicker mb-1.5 block" htmlFor="np-name">
                项目名
              </label>
              <input
                id="np-name"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder="比如：客服知识库 v1"
                className="w-full border border-rule bg-paper-warm px-4 py-2.5 font-serif text-[15px] outline-none transition-colors placeholder:text-ink-mute/70 focus:border-ink/60"
              />
            </div>
            <div>
              <label className="kicker mb-1.5 block" htmlFor="np-deadline">
                截止日期（可选）
              </label>
              <input
                id="np-deadline"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder="比如：12月15日"
                className="w-full border border-rule bg-paper-warm px-4 py-2.5 font-serif text-[15px] outline-none transition-colors placeholder:text-ink-mute/70 focus:border-ink/60"
              />
            </div>
            <p className="text-[12px] leading-relaxed text-ink-mute">
              创建后，旁白会在对话中自动留意与它相关的人和事。
            </p>
            <div className="flex gap-2.5">
              <SolidButton className="flex-1 py-2.5" onClick={submit}>
                创建档案
              </SolidButton>
              <GhostButton className="flex-1 py-2.5" onClick={() => setCreating(false)}>
                取消
              </GhostButton>
            </div>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="flex w-full items-center justify-center gap-2 border border-dashed border-rule py-3 font-serif text-[13.5px] text-ink-mute transition-colors hover:border-accent hover:text-accent"
            >
              <Plus className="size-4" strokeWidth={1.5} />
              新建项目
            </button>
            <ul className="space-y-4">
              {projects.map((p) => (
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
          </>
        )}
      </PanelBody>
    </>
  );
}
