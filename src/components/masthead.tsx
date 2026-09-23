"use client";

import { Bell, ChevronDown, PanelLeftOpen } from "lucide-react";
import { ME } from "@/lib/mock-data";
import { useUI } from "./ui-context";
import { Notifications } from "./overlays/notifications";

export function Masthead({
  notifOpen,
  setNotifOpen,
  activeTitle,
  sidebarCollapsed,
  onToggleSidebar,
}: {
  notifOpen: boolean;
  setNotifOpen: (v: boolean) => void;
  activeTitle?: string;
  sidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}) {
  const ui = useUI();

  return (
    <header className="shrink-0 border-b border-rule bg-paper">
      <div className="flex h-12 items-center justify-between px-4 sm:px-6">
        {/* 左侧：折叠展开控制与当前会话标题 */}
        <div className="flex items-center gap-3 min-w-0">
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
          {activeTitle && (
            <h2 className="truncate font-serif text-[14px] font-semibold text-ink">
              {activeTitle}
            </h2>
          )}
        </div>

        {/* 右侧：通知与用户菜单 */}
        <div className="relative flex items-center gap-1.5 shrink-0">
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
