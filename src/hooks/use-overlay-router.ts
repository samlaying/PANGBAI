"use client";

import { useEffect, useState, useCallback } from "react";
import { agentBus } from "@/business/bus/agent-bus";

export type PanelState =
  | { type: "person"; id: string }
  | { type: "people" }
  | { type: "project"; id: string }
  | { type: "projects" }
  | { type: "meeting" }
  | { type: "settings" }
  | null;

export type ModalState =
  | { type: "evidence"; id: string }
  | { type: "growth" }
  | { type: "onboarding" }
  | null;

/**
 * useOverlayRouter
 * 专职管理浮层、侧滑面板、全局搜索与系统级键盘快捷键调度。
 */
export function useOverlayRouter() {
  const [panel, setPanel] = useState<PanelState>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [commandOpen, setCommandOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // 监听来自 AgentBus 的跨层浮层请求
  useEffect(() => {
    const unsub = agentBus.on("overlay_requested", (req) => {
      if (req.type === "person" && req.id) {
        setPanel({ type: "person", id: req.id });
      } else if (req.type === "project" && req.id) {
        setPanel({ type: "project", id: req.id });
      } else if (req.type === "evidence" && req.id) {
        setModal({ type: "evidence", id: req.id });
      } else if (req.type === "meeting") {
        setPanel({ type: "meeting" });
      } else if (req.type === "settings") {
        setPanel({ type: "settings" });
      }
    });
    return unsub;
  }, []);

  // 全局键盘：⌘K 与 Esc 分层关闭
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setNotifOpen(false);
        setCommandOpen((v) => !v);
        return;
      }
      if (e.key === "Escape") {
        if (commandOpen) setCommandOpen(false);
        else if (modal) setModal(null);
        else if (notifOpen) setNotifOpen(false);
        else if (panel) setPanel(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [commandOpen, modal, notifOpen, panel]);

  const closeAll = useCallback(() => {
    setPanel(null);
    setModal(null);
    setCommandOpen(false);
    setNotifOpen(false);
  }, []);

  return {
    panel,
    setPanel,
    modal,
    setModal,
    commandOpen,
    setCommandOpen,
    notifOpen,
    setNotifOpen,
    sidebarCollapsed,
    setSidebarCollapsed,
    toggleSidebar: () => setSidebarCollapsed((v) => !v),
    closeAll,
  };
}
