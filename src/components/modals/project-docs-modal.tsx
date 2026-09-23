"use client";

import { useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Code2,
  FileCheck,
  FileText,
  Plus,
  Sparkles,
  Users,
} from "lucide-react";
import type { ArtifactType, Project, ProjectArtifact } from "@/lib/types";
import { useUI } from "../ui-context";
import { Modal, ModalHeader } from "./modal";

const TYPE_CONFIG: Record<
  ArtifactType,
  { label: string; icon: typeof FileText; tagBg: string; textCol: string }
> = {
  prd: {
    label: "需求与 PRD",
    icon: FileText,
    tagBg: "bg-ink/5 border-ink/20",
    textCol: "text-ink",
  },
  solution_brief: {
    label: "方案简报",
    icon: BookOpen,
    tagBg: "bg-accent/10 border-accent/30",
    textCol: "text-accent",
  },
  competitive_analysis: {
    label: "竞品对标",
    icon: FileCheck,
    tagBg: "bg-paper-deep border-rule",
    textCol: "text-ink-soft",
  },
  review_retrospective: {
    label: "复盘报告",
    icon: Sparkles,
    tagBg: "bg-gold/10 border-gold/30",
    textCol: "text-gold",
  },
  meeting_notes: {
    label: "会议备忘",
    icon: BookOpen,
    tagBg: "bg-paper-deep border-rule",
    textCol: "text-ink-soft",
  },
};

const PROGRESS_LABELS: Record<string, { label: string; style: string }> = {
  draft: { label: "草稿拟定", style: "border-rule text-ink-mute bg-paper-deep" },
  in_review: { label: "评审对齐中", style: "border-accent/40 text-accent bg-accent/5" },
  aligned: { label: "多方已对齐", style: "border-ink text-ink bg-ink/5" },
  completed: { label: "已归档", style: "border-rule text-ink-mute" },
};

export function ProjectDocsModal({
  project,
  onClose,
  onOpenInCanvas,
}: {
  project: Project;
  onClose: () => void;
  onOpenInCanvas: (art: ProjectArtifact) => void;
}) {
  const ui = useUI();
  const [filterType, setFilterType] = useState<ArtifactType | "all">("all");
  const [expandedYamlId, setExpandedYamlId] = useState<string | null>(null);

  const artifacts = project.artifacts ?? [];
  const filtered =
    filterType === "all"
      ? artifacts
      : artifacts.filter((a) => a.frontmatter.type === filterType);

  return (
    <Modal onClose={onClose} label="项目文档库">
      <ModalHeader kicker="项目产物与文档档案 · ARTIFACTS DOSSIER" onClose={onClose} />

      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-serif text-[24px] font-black leading-snug tracking-[0.02em] text-ink">
          {project.name} · 活文档库
        </h2>
        <span className="font-mono text-[11px] text-ink-mute">
          共 {artifacts.length} 篇挂载产物
        </span>
      </div>

      <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">
        每个项目下的产物统一挂载结构化 YAML 元数据（时间、进度、涉及人与预期方案），可直接在 Canvas 协作编辑或让旁白进行冲突把控。
      </p>

      {/* 分类过滤器 */}
      <div className="mt-5 flex flex-wrap gap-1.5 border-b border-rule pb-3">
        <button
          type="button"
          onClick={() => setFilterType("all")}
          className={`px-2.5 py-1 font-serif text-[12px] transition-colors ${
            filterType === "all"
              ? "bg-ink font-semibold text-paper"
              : "border border-rule text-ink-soft hover:border-ink hover:text-ink"
          }`}
        >
          全部 ({artifacts.length})
        </button>
        {(["prd", "competitive_analysis", "review_retrospective"] as ArtifactType[]).map(
          (t) => {
            const count = artifacts.filter((a) => a.frontmatter.type === t).length;
            if (count === 0 && filterType !== t) return null;
            const cfg = TYPE_CONFIG[t];
            return (
              <button
                key={t}
                type="button"
                onClick={() => setFilterType(t)}
                className={`px-2.5 py-1 font-serif text-[12px] transition-colors ${
                  filterType === t
                    ? "bg-ink font-semibold text-paper"
                    : "border border-rule text-ink-soft hover:border-ink hover:text-ink"
                }`}
              >
                {cfg?.label ?? t} ({count})
              </button>
            );
          }
        )}
      </div>

      {/* 文档卡片流 */}
      <div className="mt-4 space-y-3.5">
        {filtered.length === 0 ? (
          <div className="py-10 text-center font-serif text-[13.5px] text-ink-mute">
            当前分类下暂无产物文档
          </div>
        ) : (
          filtered.map((art) => {
            const cfg = TYPE_CONFIG[art.frontmatter.type] || TYPE_CONFIG.prd;
            const Icon = cfg.icon;
            const isYamlOpen = expandedYamlId === art.id;
            const prog =
              PROGRESS_LABELS[art.frontmatter.progress] ?? PROGRESS_LABELS.draft;

            return (
              <article
                key={art.id}
                className="group border border-rule bg-paper transition-all hover:border-ink/40 hover:shadow-xs"
              >
                <div className="p-4">
                  {/* 顶栏信息：类型 + 进度 + 更新时间 */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`flex items-center gap-1 border px-2 py-0.5 font-serif text-[11px] font-medium ${cfg.tagBg} ${cfg.textCol}`}
                      >
                        <Icon className="size-3" strokeWidth={1.5} />
                        {cfg.label}
                      </span>
                      <span
                        className={`border px-2 py-0.5 font-serif text-[10.5px] ${prog.style}`}
                      >
                        {prog.label}
                      </span>
                      {art.frontmatter.version && (
                        <span className="font-mono text-[10.5px] text-ink-mute">
                          {art.frontmatter.version}
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-[11px] text-ink-mute">
                      {art.updatedAt}
                    </span>
                  </div>

                  {/* 标题 */}
                  <h3 className="mt-2.5 font-serif text-[16px] font-bold leading-snug text-ink">
                    {art.title}
                  </h3>

                  {/* 预期做成什么方案（核心业务解法） */}
                  {art.frontmatter.expected_solution && (
                    <div className="mt-2 border-l-2 border-accent/60 bg-paper-warm/50 px-3 py-1.5 font-serif text-[12.5px] leading-relaxed text-ink-soft">
                      <span className="font-semibold text-ink">预期方案：</span>
                      {art.frontmatter.expected_solution}
                    </div>
                  )}

                  {/* 涉及干系人 */}
                  {art.frontmatter.stakeholders && art.frontmatter.stakeholders.length > 0 && (
                    <div className="mt-2.5 flex items-center gap-1.5 text-[11.5px] text-ink-mute">
                      <Users className="size-3 text-ink-mute" strokeWidth={1.5} />
                      <span>干系人：</span>
                      <div className="flex flex-wrap gap-1">
                        {art.frontmatter.stakeholders.map((person) => (
                          <span
                            key={person}
                            className="bg-paper-deep px-1.5 py-0.2 font-serif text-[11px] text-ink-soft"
                          >
                            {person}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 展开查看 YAML Frontmatter 结构化代码 */}
                  <div className="mt-3 border-t border-rule/50 pt-2.5">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedYamlId((curr) => (curr === art.id ? null : art.id))
                      }
                      className="flex items-center gap-1 font-mono text-[11px] text-ink-mute transition-colors hover:text-ink"
                    >
                      <Code2 className="size-3" strokeWidth={1.5} />
                      <span>{isYamlOpen ? "收起 YAML 元数据" : "查看 YAML Frontmatter"}</span>
                      {isYamlOpen ? (
                        <ChevronDown className="size-3" />
                      ) : (
                        <ChevronRight className="size-3" />
                      )}
                    </button>

                    {isYamlOpen && (
                      <pre className="mt-2 overflow-x-auto border border-rule bg-paper-warm p-3 font-mono text-[11px] leading-relaxed text-ink-soft">
                        <code>
                          {art.content.match(/^---\n([\s\S]*?)\n---/)?.[1] ||
                            JSON.stringify(art.frontmatter, null, 2)}
                        </code>
                      </pre>
                    )}
                  </div>

                  {/* 操作按钮区 */}
                  <div className="mt-3 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        ui.ask(`请审查「${art.title}」，指出王总和李总可能关注的风险：`);
                      }}
                      className="flex items-center gap-1 border border-rule bg-paper px-2.5 py-1 font-serif text-[12px] text-ink-soft transition-colors hover:border-accent hover:text-accent"
                    >
                      <Sparkles className="size-3 text-gold" strokeWidth={1.5} />
                      AI 审查风险
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenInCanvas(art);
                      }}
                      className="flex items-center gap-1 border border-ink bg-ink px-3 py-1 font-serif text-[12px] text-paper transition-colors hover:bg-accent"
                    >
                      <FileText className="size-3" strokeWidth={1.5} />
                      在 Canvas 中打开
                    </button>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>

      {/* 底部：一键生成新 PRD 架构 */}
      <div className="mt-6 border-t border-rule pt-4">
        <button
          type="button"
          onClick={() => {
            onClose();
            ui.ask(
              `请为当前项目「${project.name}」打磨一份高质量 PRD 方案。请先给出预期方案思路（Trade-off）和大体架构骨架（Skeleton），方便我填充细节。`
            );
          }}
          className="flex w-full items-center justify-center gap-2 border border-dashed border-rule bg-paper-warm py-2.5 font-serif text-[13px] text-ink transition-colors hover:border-accent hover:text-accent"
        >
          <Plus className="size-3.5" strokeWidth={1.5} />
          让 AI 生成新方案大纲骨架（PRD Skeleton）
        </button>
      </div>
    </Modal>
  );
}
