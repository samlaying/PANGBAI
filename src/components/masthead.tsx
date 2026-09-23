"use client";

import { Bell, BookOpen, ChevronDown, FileText, FolderOpen, PanelLeftOpen } from "lucide-react";
import type { Project } from "@/lib/types";
import { ME } from "@/lib/mock-data";
import { useUI } from "./ui-context";
import { Notifications } from "./overlays/notifications";

export function Masthead({
  notifOpen,
  setNotifOpen,
  activeTitle,
  sidebarCollapsed,
  onToggleSidebar,
  canvasOpen,
  onToggleCanvas,
  project,
  activeCanvasId,
  onSelectArtifact,
}: {
  notifOpen: boolean;
  setNotifOpen: (v: boolean) => void;
  activeTitle?: string;
  sidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  canvasOpen?: boolean;
  onToggleCanvas?: () => void;
  project?: Project | null;
  activeCanvasId?: string;
  onSelectArtifact?: (art: import("@/lib/types").ProjectArtifact) => void;
}) {
  const ui = useUI();

  return (
    <header className="shrink-0 border-b border-rule bg-paper">
      <div className="flex h-12 items-center justify-between px-4 sm:px-6">
        {/* 左侧：折叠展开控制与当前会话标题 */}
        <div className="flex items-center gap-2.5 min-w-0">
          {sidebarCollapsed && (
            <button
              type="button"
              onClick={onToggleSidebar}
              aria-label="展开侧边栏"
              className="grid size-8 place-items-center text-ink-mute transition-colors hover:bg-paper-deep hover:text-ink"
            >
              <PanelLeftOpen className="size-4" strokeWidth={1.5} />
            </button>
          )}

          {project && (
            <button
              type="button"
              onClick={() => ui.openProject(project.id)}
              className="group flex shrink-0 items-center gap-1.5 border border-rule bg-paper-warm/80 px-2 py-0.5 transition-colors hover:border-ink"
              title="点击查看项目档案与风险透视"
            >
              <FolderOpen className="size-3 text-ink-mute group-hover:text-accent" strokeWidth={1.5} />
              <span className="font-serif text-[12px] font-semibold text-ink">
                {project.name}
              </span>
              {project.riskCount > 0 && (
                <span className="font-mono text-[9px] text-vermilion">
                  ⚠{project.riskCount}
                </span>
              )}
            </button>
          )}

          {activeTitle && (
            <h2 className="truncate font-serif text-[14px] font-semibold text-ink">
              {activeTitle}
            </h2>
          )}
        </div>

        {/* 右侧：直接写出文档名字（点击即在右侧展开，绝无弹窗）、通知与用户菜单 */}
        <div className="relative flex items-center gap-2 shrink-0">
          {project?.artifacts && project.artifacts.length > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 border-r border-rule pr-2.5">
              <span className="font-mono text-[9px] uppercase tracking-wider text-ink-mute">
                文档:
              </span>
              {project.artifacts.map((art) => {
                const isActive = canvasOpen && activeCanvasId === art.id;
                return (
                  <button
                    key={art.id}
                    type="button"
                    onClick={() => onSelectArtifact?.(art)}
                    className={`group flex items-center gap-1.5 border px-2.5 py-1 font-serif text-[12px] transition-colors ${
                      isActive
                        ? "border-accent bg-paper-deep font-semibold text-accent"
                        : "border-rule bg-paper text-ink-soft hover:border-ink hover:text-ink hover:bg-paper-warm"
                    }`}
                    title={`在右侧打开「${art.title}」`}
                  >
                    <FileText
                      className={`size-3 transition-colors ${
                        isActive ? "text-accent" : "text-ink-mute group-hover:text-accent"
                      }`}
                      strokeWidth={1.5}
                    />
                    <span className="truncate max-w-[100px] md:max-w-[130px]">
                      {art.title}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          {onToggleCanvas && (
            <button
              type="button"
              onClick={onToggleCanvas}
              className={`flex items-center gap-1.5 px-2.5 py-1 font-serif text-[12px] border transition-colors ${
                canvasOpen
                  ? "border-accent bg-paper-deep text-accent"
                  : "border-rule bg-paper hover:bg-paper-deep text-ink-soft"
              }`}
              title={canvasOpen ? "收起 PRD Canvas" : "展开 PRD Canvas"}
            >
              <FileText className="size-3.5" strokeWidth={1.5} />
              <span>PRD Canvas</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setNotifOpen(!notifOpen)}
            aria-label="通知"
            className={`relative grid size-8 place-items-center transition-colors hover:bg-paper-deep ${
              notifOpen ? "bg-paper-deep" : ""
            }`}
          >
            <Bell className="size-[16px]" strokeWidth={1.5} />
            <span className="absolute right-1 top-1 grid size-3.5 place-items-center rounded-full bg-vermilion font-mono text-[8.5px] font-medium text-paper">
              3
            </span>
          </button>

          <button
            type="button"
            onClick={ui.openSettings}
            className="flex items-center gap-1.5 px-2 py-1 transition-colors hover:bg-paper-deep"
          >
            <span className="font-serif text-[13px] font-semibold">{ME.name}</span>
            <ChevronDown className="size-3 text-ink-mute" strokeWidth={1.5} />
          </button>

          {notifOpen && <Notifications onClose={() => setNotifOpen(false)} />}
        </div>
      </div>
    </header>
  );
}
