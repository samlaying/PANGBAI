import { useState, useEffect } from "react";
import { ChevronRight, Plus } from "lucide-react";
import type { Person, Project } from "@/lib/types";
import { useUI } from "../ui-context";
import { Avatar, SolidButton, GhostButton } from "../atoms";
import { PanelBody, PanelHeader } from "./side-panel";
import { workspaceManager } from "@/business/entities/workspace-manager";

export function PeoplePanel({ people, onCreated }: { people: Person[]; onCreated: (name: string, role: string) => Promise<void> }) {
  const ui = useUI();
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void workspaceManager.refreshPeople();
  }, []);
  return (
    <>
      <PanelHeader kicker="人物索引 · PEOPLE INDEX">
        <h2 className="font-serif text-[26px] font-black tracking-[0.04em]">
          旁白认识的人
        </h2>
      </PanelHeader>
      <PanelBody>
        <form onSubmit={async (event) => {
          event.preventDefault();
          try { await onCreated(name.trim(), role.trim()); setName(""); setRole(""); setError(""); }
          catch { setError("创建人物失败，请重试"); }
        }} className="mb-5 flex flex-wrap gap-2">
          <input aria-label="姓名" required value={name} onChange={(event) => setName(event.target.value)} placeholder="姓名" className="min-w-0 flex-1 border border-rule bg-paper px-2 py-1" />
          <input aria-label="角色" required value={role} onChange={(event) => setRole(event.target.value)} placeholder="角色" className="min-w-0 flex-1 border border-rule bg-paper px-2 py-1" />
          <button type="submit" className="border border-accent px-3 py-1 text-accent">添加人物</button>
        </form>
        {error && <p role="alert" className="text-vermilion">{error}</p>}
        {people.length === 0 && <p className="py-5 text-center text-ink-mute">暂无人物档案</p>}
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
                    {p.patterns?.[0]
                      ? `${p.patterns[0].pattern} · ${p.patterns[0].confidence}%`
                      : "正在持续观察行为模式中..."}
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
  onCreated: (params: {
    name: string;
    deadline?: string;
    stakeholders?: Array<{ name: string; role?: string }>;
    milestones?: Array<{ name: string; date: string; done?: boolean }>;
    risks?: Array<{ title: string; note?: string }>;
  }) => Promise<void>;
}) {
  const ui = useUI();
  const [creating, setCreating] = useState(createSignal > 0);
  const [name, setName] = useState("");
  const [deadline, setDeadline] = useState("");
  const [stakeholdersInput, setStakeholdersInput] = useState("");
  const [milestonesInput, setMilestonesInput] = useState("");
  const [risksInput, setRisksInput] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void workspaceManager.refreshProjects();
  }, []);

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      const stakeholders = stakeholdersInput
        ? stakeholdersInput.split(/[,，\n]+/).map((s) => s.trim()).filter(Boolean).map((str) => {
            const match = str.match(/^(.+?)(?:\s*[（(](.+?)[)）]|\s+(.+))?$/);
            return {
              name: match?.[1]?.trim() || str,
              role: match?.[2]?.trim() || match?.[3]?.trim() || "业务干系人",
            };
          })
        : undefined;

      const milestones = milestonesInput
        ? milestonesInput.split(/[;；\n]+/).map((m) => m.trim()).filter(Boolean).map((str) => {
            const parts = str.split(/[\s,，]+/);
            return {
              name: parts[0] || str,
              date: parts[1] || "未定",
              done: false,
            };
          })
        : undefined;

      const risks = risksInput
        ? risksInput.split(/[;；\n]+/).map((r) => r.trim()).filter(Boolean).map((str) => {
            const parts = str.split(/[:：]/);
            return {
              title: parts[0]?.trim() || str,
              note: parts[1]?.trim() || "初始化记录的已知风险",
            };
          })
        : undefined;

      await onCreated({
        name: trimmed,
        deadline: deadline.trim() || undefined,
        stakeholders,
        milestones,
        risks,
      });

      setError("");
      setCreating(false);
      setName("");
      setDeadline("");
      setStakeholdersInput("");
      setMilestonesInput("");
      setRisksInput("");
    } catch {
      setError("创建失败，请重试");
    }
  };

  return (
    <>
      <PanelHeader kicker="项目索引 · PROJECT INDEX">
        <h2 className="font-serif text-[26px] font-black tracking-[0.04em]">
          手头的项目
        </h2>
      </PanelHeader>
      <PanelBody>
        {error && <p role="alert" className="text-sm text-vermilion">{error}</p>}
        {creating ? (
          <div className="space-y-4">
            <div className="kicker">新建项目档案 · NEW PROJECT</div>
            <div>
              <label className="kicker mb-1 block" htmlFor="np-name">
                项目名 *
              </label>
              <input
                id="np-name"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="比如：客服知识库 v1"
                className="w-full border border-rule bg-paper-warm px-3 py-2 font-serif text-[14px] outline-none transition-colors placeholder:text-ink-mute/70 focus:border-ink/60"
              />
            </div>
            <div>
              <label className="kicker mb-1 block" htmlFor="np-deadline">
                截止日期（可选）
              </label>
              <input
                id="np-deadline"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                placeholder="比如：12月15日"
                className="w-full border border-rule bg-paper-warm px-3 py-2 font-serif text-[14px] outline-none transition-colors placeholder:text-ink-mute/70 focus:border-ink/60"
              />
            </div>
            <div>
              <label className="kicker mb-1 block">
                核心干系人（可选，逗号分隔，如：老李(技术主管), 王总(CEO)）
              </label>
              <input
                value={stakeholdersInput}
                onChange={(e) => setStakeholdersInput(e.target.value)}
                placeholder="老李(技术负责人), 王总(CEO)"
                className="w-full border border-rule bg-paper-warm px-3 py-2 font-serif text-[13px] outline-none transition-colors placeholder:text-ink-mute/70 focus:border-ink/60"
              />
            </div>
            <div>
              <label className="kicker mb-1 block">
                初始里程碑（可选，分号/换行分隔，如：需求对齐 10月5日）
              </label>
              <textarea
                rows={2}
                value={milestonesInput}
                onChange={(e) => setMilestonesInput(e.target.value)}
                placeholder="需求对齐 10月5日&#10;技术评审 10月12日"
                className="w-full border border-rule bg-paper-warm px-3 py-2 font-serif text-[12.5px] outline-none transition-colors placeholder:text-ink-mute/70 focus:border-ink/60"
              />
            </div>
            <div>
              <label className="kicker mb-1 block">
                已知卡点与风险（可选，分号/换行分隔）
              </label>
              <textarea
                rows={2}
                value={risksInput}
                onChange={(e) => setRisksInput(e.target.value)}
                placeholder="前端排期紧张: 仅1名研发可用&#10;第三方接口不稳定"
                className="w-full border border-rule bg-paper-warm px-3 py-2 font-serif text-[12.5px] outline-none transition-colors placeholder:text-ink-mute/70 focus:border-ink/60"
              />
            </div>
            <p className="text-[11.5px] leading-relaxed text-ink-mute">
              创建后，旁白会将干系人自动建档并写入世界模型，在后续对话中动态辅助。
            </p>
            <div className="flex gap-2.5 pt-1">
              <SolidButton className="flex-1 py-2" onClick={submit}>
                创建档案
              </SolidButton>
              <GhostButton className="flex-1 py-2" onClick={() => setCreating(false)}>
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
