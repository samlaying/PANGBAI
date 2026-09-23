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
            const top = p.patterns?.[0];
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
                  {top && <span className="text-ink-mute"> · {top.pattern}</span>}
                </span>
                {top && (
                  <>
                    <DotMeter value={top.confidence} />
                    <span className="font-mono text-[10px] text-ink-mute">
                      {top.confidence}%
                    </span>
                  </>
                )}
              </button>
            );

          })}
          <p className="text-center font-mono text-[9.5px] tracking-[0.12em] text-ink-mute">
            点击头像可查看详细画像 ↗
          </p>
        </section>

        {/* 多方连环追问模拟 */}
        <section className="space-y-3.5">
          <div className="flex items-center justify-between">
            <SectionTitle>多方连环追问模拟 · Q&A DRILL</SectionTitle>
            <span className="font-mono text-[10px] text-accent">提前推演 · 临场不慌</span>
          </div>

          <p className="font-serif text-[13px] leading-relaxed text-ink-soft">
            评审会上领导与产研关注维度截然不同。旁白基于各方世界模型与行为模式，提前推演最尖锐的连环质询：
          </p>

          <div className="space-y-3">
            {/* 王总追问 */}
            <div className="border border-rule bg-paper-warm/80 p-4 shadow-2xs">
              <div className="flex items-center justify-between border-b border-rule/60 pb-2">
                <div className="flex items-center gap-2">
                  <Avatar char="王" size="sm" />
                  <span className="font-serif text-[14px] font-bold text-ink">王总 · 考察确定性与兜底预案</span>
                </div>
                <span className="border border-vermilion/30 bg-vermilion/10 px-2 py-0.5 font-mono text-[9.5px] text-vermilion">
                  高频卡点
                </span>
              </div>
              <blockquote className="my-2.5 border-l-2 border-vermilion/70 pl-3 font-serif text-[13.5px] font-medium leading-relaxed text-ink">
                「周五前要是联调出问题，你打算怎么向客户交代？有没有最坏打算的保底版本？」
              </blockquote>
              <div className="mt-2 text-[12.5px] leading-relaxed text-ink-soft">
                <span className="font-semibold text-accent">旁白解法：</span>
                切忌泛泛保证或推脱。先接住客户压力，给出明确的保底版本「方案 A 保核心链路打通演示，规则兜底边缘指标；方案 B 下周完整交付」。
              </div>
              <button
                type="button"
                onClick={() => {
                  ui.closePanel();
                  ui.startRehearsalWithScenario?.({
                    title: "应对王总关于客户交付底线的质询",
                    personName: "王总",
                    initialQuestion: "周五前要是联调出问题，你打算怎么向客户交代？有没有最坏打算的保底版本？",
                    turns: [
                      "（紧盯你的眼神）方案 A 保底……客户最在意的核心打分链路能确保稳妥吗？",
                      "好。今天下班前把方案 A 的保底演练录屏发我看一下。下次有风险早点同步。",
                    ],
                    coachingHint: "提示：先认领交付责任，直接给出方案 A 保核心链路与时间点，绝不找客观借口。",
                  });
                }}
                className="mt-3 inline-flex items-center gap-1.5 border border-ink/30 bg-paper px-3 py-1.5 font-serif text-[12px] font-semibold text-ink transition-colors hover:border-accent hover:text-accent hover:bg-paper-deep"
              >
                <span>🎭 模拟演练向王总汇报兜底预案</span>
              </button>
            </div>

            {/* 李总追问 */}
            <div className="border border-rule bg-paper-warm/80 p-4 shadow-2xs">
              <div className="flex items-center justify-between border-b border-rule/60 pb-2">
                <div className="flex items-center gap-2">
                  <Avatar char="李" size="sm" />
                  <span className="font-serif text-[14px] font-bold text-ink">李总 · 考察技术架构与工期取舍</span>
                </div>
                <span className="border border-accent/40 bg-accent/10 px-2 py-0.5 font-mono text-[9.5px] text-accent">
                  技术对齐
                </span>
              </div>
              <blockquote className="my-2.5 border-l-2 border-accent pl-3 font-serif text-[13.5px] font-medium leading-relaxed text-ink">
                「你提的这个实时状态同步，会不会拖垮主库性能？如果研发评估要增加两周工期，你怎么砍功能？」
              </blockquote>
              <div className="mt-2 text-[12.5px] leading-relaxed text-ink-soft">
                <span className="font-semibold text-accent">旁白解法：</span>
                李总重视技术完整性与严谨。沟通时必须带上技术取舍（Trade-off），主动提出「首期采用异步轻量轮询，暂缓复杂多人协作态，保障工期不超」。
              </div>
              <button
                type="button"
                onClick={() => {
                  ui.closePanel();
                  ui.startRehearsalWithScenario?.({
                    title: "应对李总关于技术架构与工期取舍的对齐",
                    personName: "李总",
                    initialQuestion: "你提的这个实时状态同步，会不会拖垮主库性能？如果研发评估要增加两周工期，你怎么砍功能？",
                    turns: [
                      "异步轮询可以减少主库压力。那跨端状态一致性你怎么兜底？",
                      "行，这个技术取舍合理。会后你出一版精简架构方案备忘，我们在群里敲定。",
                    ],
                    coachingHint: "提示：用方案取舍（Trade-off）说话，主动提出砍掉非核心协作态，保住核心性能。",
                  });
                }}
                className="mt-3 inline-flex items-center gap-1.5 border border-ink/30 bg-paper px-3 py-1.5 font-serif text-[12px] font-semibold text-ink transition-colors hover:border-accent hover:text-accent hover:bg-paper-deep"
              >
                <span>🎭 模拟演练与李总对齐架构取舍</span>
              </button>
            </div>
          </div>
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
