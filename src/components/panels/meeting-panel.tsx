"use client";

import { useState } from "react";
import { useWorkspace } from "@/hooks/use-workspace";
import { PanelBody, PanelHeader } from "./side-panel";
import { SolidButton, GhostButton } from "../atoms";
import type { EventRecordType } from "@/lib/types";
import {
  CalendarCheck,
  MessagesSquare,
  GitPullRequest,
  AlertTriangle,
  Plus,
  Trash2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Loader2,
} from "lucide-react";

const EVENT_TYPE_MAP: Record<
  EventRecordType,
  { label: string; icon: typeof CalendarCheck; desc: string }
> = {
  meeting: {
    label: "MT+1 会议纪要",
    icon: CalendarCheck,
    desc: "记录产研对齐、周会结论与后续 Action Items 待办",
  },
  chat: {
    label: "群聊 / 私聊记录",
    icon: MessagesSquare,
    desc: "粘贴飞书/企微/钉钉真实对话，自动提取干系人与沟通模式",
  },
  review: {
    label: "对接研发 / 技术评审",
    icon: GitPullRequest,
    desc: "记录技术评审反馈、排期确认、需求砍减与技术卡点",
  },
  incident: {
    label: "职场突发事件",
    icon: AlertTriangle,
    desc: "记录甩锅、突发冲突或紧急插单，作为关键因果证据",
  },
};

export function MeetingPanel() {
  const { events, projects, addEvent, deleteEvent } = useWorkspace();

  const [activeTab, setActiveTab] = useState<"all" | EventRecordType>("all");
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastExtraction, setLastExtraction] = useState<{
    people?: Array<{ id: string; name: string; isNew?: boolean }>;
    patterns?: Array<{ personId: string; pattern: string; confidence: number }>;
    actionItems?: Array<{ task: string; owner?: string }>;
    riskSignals?: string[];
  } | null>(null);

  // Form State
  const [formType, setFormType] = useState<EventRecordType>("meeting");
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formProjectId, setFormProjectId] = useState<string>("");
  const [formChatType, setFormChatType] = useState<"group" | "private">("group");
  const [formAttendees, setFormAttendees] = useState("");
  const [formActionItems, setFormActionItems] = useState("");
  const [formBlockingIssues, setFormBlockingIssues] = useState("");

  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  const filteredEvents =
    activeTab === "all"
      ? events
      : events.filter((e) => e.type === activeTab);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formContent.trim()) return;

    setIsSubmitting(true);
    setLastExtraction(null);

    try {
      const metadata: Record<string, unknown> = {};

      if (formType === "chat") {
        metadata.chatType = formChatType;
      } else if (formType === "meeting") {
        if (formAttendees.trim()) {
          metadata.attendees = formAttendees
            .split(/[,，\s]+/)
            .filter(Boolean)
            .map((name) => ({ name }));
        }
        if (formActionItems.trim()) {
          metadata.actionItems = formActionItems
            .split(/[\n;；]+/)
            .filter(Boolean)
            .map((task) => ({ task: task.trim() }));
        }
      } else if (formType === "review") {
        if (formBlockingIssues.trim()) {
          metadata.blockingIssues = formBlockingIssues
            .split(/[\n;；]+/)
            .filter(Boolean)
            .map((s) => s.trim());
        }
      }

      const res = await addEvent({
        type: formType,
        title: formTitle.trim(),
        content: formContent.trim(),
        projectId: formProjectId || undefined,
        metadata,
      });

      if (res.harness) {
        setLastExtraction(res.harness);
      }

      // Reset form
      setFormTitle("");
      setFormContent("");
      setFormAttendees("");
      setFormActionItems("");
      setFormBlockingIssues("");
      setShowForm(false);
    } catch (err) {
      console.error("Failed to add event:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <PanelHeader kicker="事实与会议素材库 · FACT DOSSIER">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-[26px] font-black leading-tight tracking-[0.02em] text-ink">
            事实与对接
          </h2>
          <GhostButton
            onClick={() => setShowForm(!showForm)}
            className="!py-1 !text-[12px]"
          >
            <Plus className="size-3.5" />
            {showForm ? "收起录入" : "录入素材"}
          </GhostButton>
        </div>
        <p className="mt-1 font-serif text-[12.5px] text-ink-soft">
          群聊记录、MT+1 会议、技术评审与突发事件。录入后自动由 Harness 反思提取干系人画像。
        </p>
      </PanelHeader>

      <PanelBody>
        {/* 最新提取反馈横幅 */}
        {lastExtraction && (
          <div className="mb-4 border-l-2 border-accent bg-paper-deep/60 p-3.5 text-ink">
            <div className="flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-accent">
              <Sparkles className="size-3.5" />
              Harness 反思提炼完成
            </div>
            {lastExtraction.people && lastExtraction.people.length > 0 && (
              <div className="mt-2 text-[12.5px]">
                <span className="text-ink-mute">识别干系人: </span>
                {lastExtraction.people.map((p) => (
                  <span
                    key={p.id}
                    className="mr-1.5 inline-block border border-rule bg-paper px-1.5 py-0.5 text-[11.5px]"
                  >
                    {p.name}
                    {p.isNew && (
                      <span className="ml-1 text-[10px] text-accent">
                        [自动建档]
                      </span>
                    )}
                  </span>
                ))}
              </div>
            )}
            {lastExtraction.actionItems && lastExtraction.actionItems.length > 0 && (
              <div className="mt-1.5 text-[12px]">
                <span className="text-ink-mute">提炼待办: </span>
                {lastExtraction.actionItems.map((a, i) => (
                  <span key={i} className="mr-2 inline-block">
                    • {a.task}
                  </span>
                ))}
              </div>
            )}
            {lastExtraction.riskSignals && lastExtraction.riskSignals.length > 0 && (
              <div className="mt-1.5 text-[12px] text-vermilion">
                <span className="text-ink-mute">检测到风险: </span>
                {lastExtraction.riskSignals.join("; ")}
              </div>
            )}
          </div>
        )}

        {/* 录入表单 */}
        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="mb-6 space-y-3.5 border border-rule bg-paper-warm/40 p-4"
          >
            <div className="flex items-center justify-between">
              <span className="kicker">录入新事实素材 · INGEST FACT</span>
              <span className="text-[11px] text-ink-mute">
                自动触发 Harness 语义分析
              </span>
            </div>

            {/* 素材类型选择 */}
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              {(Object.keys(EVENT_TYPE_MAP) as EventRecordType[]).map((type) => {
                const conf = EVENT_TYPE_MAP[type];
                const selected = formType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFormType(type)}
                    className={`flex flex-col items-center gap-1 border p-2 text-center transition-colors ${
                      selected
                        ? "border-ink bg-ink text-paper"
                        : "border-rule bg-paper text-ink-soft hover:border-ink/50"
                    }`}
                  >
                    <conf.icon className="size-4" />
                    <span className="text-[11px] font-medium leading-tight">
                      {conf.label.split(" ")[0]}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* 标题 */}
            <div>
              <label className="block text-[11px] font-mono text-ink-mute">
                素材标题 / 主题
              </label>
              <input
                type="text"
                required
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="例如：周二产研排期对齐会 / 与前端老李沟通聊天"
                className="mt-1 w-full border border-rule bg-paper px-2.5 py-1.5 font-serif text-[13px] text-ink outline-none focus:border-ink"
              />
            </div>

            {/* 关联项目 */}
            {projects.length > 0 && (
              <div>
                <label className="block text-[11px] font-mono text-ink-mute">
                  关联项目 (可选)
                </label>
                <select
                  value={formProjectId}
                  onChange={(e) => setFormProjectId(e.target.value)}
                  className="mt-1 w-full border border-rule bg-paper px-2 py-1.5 font-serif text-[12.5px] text-ink outline-none focus:border-ink"
                >
                  <option value="">-- 不关联特定项目 --</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 聊天类型专属字段 */}
            {formType === "chat" && (
              <div>
                <label className="block text-[11px] font-mono text-ink-mute">
                  聊天场景
                </label>
                <div className="mt-1 flex gap-3 text-[12px] text-ink">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="chatType"
                      checked={formChatType === "group"}
                      onChange={() => setFormChatType("group")}
                    />
                    群聊沟通 (飞书/企微产研群)
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="chatType"
                      checked={formChatType === "private"}
                      onChange={() => setFormChatType("private")}
                    />
                    1:1 私聊对齐
                  </label>
                </div>
              </div>
            )}

            {/* 会议专属字段 */}
            {formType === "meeting" && (
              <>
                <div>
                  <label className="block text-[11px] font-mono text-ink-mute">
                    参会人 (姓名，逗号分隔)
                  </label>
                  <input
                    type="text"
                    value={formAttendees}
                    onChange={(e) => setFormAttendees(e.target.value)}
                    placeholder="老李, 王总, 张三"
                    className="mt-1 w-full border border-rule bg-paper px-2.5 py-1.5 font-serif text-[12.5px] text-ink outline-none focus:border-ink"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-ink-mute">
                    Action Items / 会议待办 (换行分隔)
                  </label>
                  <textarea
                    rows={2}
                    value={formActionItems}
                    onChange={(e) => setFormActionItems(e.target.value)}
                    placeholder="老李确认前端接口规范&#10;我周四前更新 PRD 补齐埋点"
                    className="mt-1 w-full border border-rule bg-paper px-2.5 py-1.5 font-serif text-[12px] text-ink outline-none focus:border-ink"
                  />
                </div>
              </>
            )}

            {/* 研发评审专属字段 */}
            {formType === "review" && (
              <div>
                <label className="block text-[11px] font-mono text-ink-mute">
                  已暴露的技术卡点 / 砍需求顾虑 (换行分隔)
                </label>
                <textarea
                  rows={2}
                  value={formBlockingIssues}
                  onChange={(e) => setFormBlockingIssues(e.target.value)}
                  placeholder="前端人力不足难以支撑动效&#10;老架构历史负债重需要重构"
                  className="mt-1 w-full border border-rule bg-paper px-2.5 py-1.5 font-serif text-[12px] text-ink outline-none focus:border-ink"
                />
              </div>
            )}

            {/* 原始文本内容 */}
            <div>
              <label className="block text-[11px] font-mono text-ink-mute">
                原始内容 / 对话文本 (支持多行直接粘贴)
              </label>
              <textarea
                required
                rows={5}
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                placeholder="直接粘贴群聊记录、会议纪要正文或研发对话..."
                className="mt-1 w-full border border-rule bg-paper px-2.5 py-1.5 font-serif text-[12.5px] leading-relaxed text-ink outline-none focus:border-ink"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <GhostButton
                onClick={() => setShowForm(false)}
                className="!text-[12px]"
              >
                取消
              </GhostButton>
              <SolidButton
                onClick={() => {}}
                className="!text-[12px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Harness 分析中...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="size-3.5" />
                    录入并触发反思
                  </>
                )}
              </SolidButton>
            </div>
          </form>
        )}

        {/* 分类标签切换 */}
        <div className="mb-4 flex flex-wrap gap-1 border-b border-rule pb-2 text-[12px]">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`border px-2 py-0.5 transition-colors ${
              activeTab === "all"
                ? "border-ink bg-ink text-paper"
                : "border-rule text-ink-soft hover:border-ink"
            }`}
          >
            全部 ({events.length})
          </button>
          {(Object.keys(EVENT_TYPE_MAP) as EventRecordType[]).map((type) => {
            const count = events.filter((e) => e.type === type).length;
            const conf = EVENT_TYPE_MAP[type];
            return (
              <button
                key={type}
                type="button"
                onClick={() => setActiveTab(type)}
                className={`border px-2 py-0.5 transition-colors ${
                  activeTab === type
                    ? "border-ink bg-ink text-paper"
                    : "border-rule text-ink-soft hover:border-ink"
                }`}
              >
                {conf.label.split(" ")[0]} ({count})
              </button>
            );
          })}
        </div>

        {/* 事实列表 */}
        {filteredEvents.length === 0 ? (
          <div className="py-12 text-center">
            <p className="font-serif text-[13px] text-ink-mute">
              暂无事实素材记录。
            </p>
            <p className="mt-1 text-[11.5px] text-ink-mute">
              点击上方「录入素材」录入群聊、会议或技术评审记录，Harness 将自动提炼因果证据。
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredEvents.map((evt) => {
              const conf = EVENT_TYPE_MAP[evt.type] || EVENT_TYPE_MAP.meeting;
              const Icon = conf.icon;
              const isExpanded = expandedEventId === evt.id;
              const proj = projects.find((p) => p.id === evt.projectId);
              const extraction = evt.metadata?.harness_extraction;

              return (
                <div
                  key={evt.id}
                  className="border border-rule bg-paper p-3 transition-colors hover:border-ink/60"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon className="size-4 shrink-0 text-accent" />
                      <span className="truncate font-serif text-[14px] font-bold text-ink">
                        {evt.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="font-mono text-[10px] text-ink-mute">
                        {conf.label.split(" ")[0]}
                      </span>
                      <button
                        type="button"
                        onClick={() => deleteEvent(evt.id, evt.projectId || undefined)}
                        className="text-ink-mute hover:text-vermilion p-0.5"
                        title="删除记录"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>

                  {proj && (
                    <div className="mt-1 text-[11.5px] text-accent">
                      所属项目: {proj.name}
                    </div>
                  )}

                  {/* 提取结果微章 */}
                  {extraction && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {extraction.summary && (
                        <span className="border border-rule bg-paper-deep px-1.5 py-0.5 text-[10.5px] text-ink-soft">
                          {extraction.summary}
                        </span>
                      )}
                      {(extraction.extractedPeopleCount ?? 0) > 0 && (
                        <span className="border border-rule bg-paper-warm px-1.5 py-0.5 text-[10.5px] text-ink">
                          识别干系人 {extraction.extractedPeopleCount} 位
                        </span>
                      )}
                      {(extraction.actionItemsCount ?? 0) > 0 && (
                        <span className="border border-rule bg-paper-warm px-1.5 py-0.5 text-[10.5px] text-ink">
                          待办 {extraction.actionItemsCount} 项
                        </span>
                      )}
                    </div>
                  )}

                  {/* 预览与展开 */}
                  <div className="mt-2 font-serif text-[12px] leading-relaxed text-ink-soft">
                    {isExpanded ? (
                      <div className="whitespace-pre-wrap">{evt.content}</div>
                    ) : (
                      <div className="line-clamp-2">{evt.content}</div>
                    )}
                  </div>

                  {evt.content.length > 80 && (
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedEventId(isExpanded ? null : evt.id)
                      }
                      className="mt-1.5 flex items-center gap-0.5 text-[11px] text-ink-mute hover:text-ink"
                    >
                      {isExpanded ? (
                        <>
                          收起 <ChevronUp className="size-3" />
                        </>
                      ) : (
                        <>
                          展开全文 <ChevronDown className="size-3" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </PanelBody>
    </>
  );
}
