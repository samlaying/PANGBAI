"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/lib/types";
import {
  CANNED_REPLIES,
  CONVERSATION,
  personById,
  projectById,
} from "@/lib/mock-data";
import { Masthead } from "./masthead";
import { BottomNav, type NavKey } from "./bottom-nav";
import { Composer } from "./composer";
import { ChatFlow } from "./chat/chat-flow";
import { SidePanelShell } from "./panels/side-panel";
import { PersonPanel } from "./panels/person-panel";
import { PeoplePanel, ProjectsPanel } from "./panels/list-panels";
import { ProjectPanel } from "./panels/project-panel";
import { MeetingPanel } from "./panels/meeting-panel";
import { SettingsPanel } from "./panels/settings-panel";
import { EvidenceModal } from "./modals/evidence-modal";
import { GrowthModal } from "./modals/growth-modal";
import { CommandMenu } from "./overlays/command-menu";
import { ProactiveCard } from "./overlays/proactive-card";
import { UIContext, type UIActions } from "./ui-context";

type PanelState =
  | { type: "person"; id: string }
  | { type: "people" }
  | { type: "project"; id: string }
  | { type: "projects" }
  | { type: "meeting" }
  | { type: "settings" }
  | null;

type ModalState =
  | { type: "evidence"; id: string }
  | { type: "growth" }
  | null;

let idSeq = 0;
const nextId = () => `m${++idSeq}`;

export function AppShell() {
  const [panel, setPanel] = useState<PanelState>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [commandOpen, setCommandOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [rehearsal, setRehearsal] = useState(false);
  const [proactive, setProactive] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(CONVERSATION);
  const [typing, setTyping] = useState(false);
  const [prefill, setPrefill] = useState({ text: "", n: 0 });
  const scrollRef = useRef<HTMLDivElement>(null);
  const cannedIdx = useRef(0);

  /* 主动提醒：6 秒后安静浮出 */
  useEffect(() => {
    const t = setTimeout(() => setProactive(true), 6000);
    return () => clearTimeout(t);
  }, []);

  /* 对话自动滚到底 */
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, typing, rehearsal]);

  /* 全局键盘：⌘K 与 Esc 分层关闭 */
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

  const ask = useCallback((text: string) => {
    setCommandOpen(false);
    setModal(null);
    setNotifOpen(false);
    setPanel(null);
    setPrefill((p) => ({ text, n: p.n + 1 }));
  }, []);

  const send = useCallback((text: string) => {
    setMessages((m) => [
      ...m,
      { id: nextId(), role: "user", time: "刚刚", text },
    ]);
    setTyping(true);
    const reply = CANNED_REPLIES[cannedIdx.current % CANNED_REPLIES.length];
    cannedIdx.current += 1;
    setTimeout(() => {
      setTyping(false);
      setMessages((m) => [
        ...m,
        {
          id: nextId(),
          role: "assistant",
          time: "刚刚",
          blocks: reply.paras.map((text) => ({ kind: "para" as const, text })),
        },
      ]);
    }, 1200);
  }, []);

  const ui: UIActions = {
    openPerson: (id) => setPanel({ type: "person", id }),
    openProject: (id) => setPanel({ type: "project", id }),
    openMeeting: () => setPanel({ type: "meeting" }),
    openEvidence: (id) => setModal({ type: "evidence", id }),
    openGrowth: () => setModal({ type: "growth" }),
    openPeople: () => setPanel({ type: "people" }),
    openProjects: () => setPanel({ type: "projects" }),
    openSettings: () => setPanel({ type: "settings" }),
    closePanel: () => setPanel(null),
    ask,
    startRehearsal: () => {
      setModal(null);
      setRehearsal(true);
    },
  };

  const navActive: NavKey =
    panel?.type === "person" || panel?.type === "people"
      ? "people"
      : panel?.type === "project" || panel?.type === "projects"
        ? "projects"
        : panel?.type === "settings"
          ? "settings"
          : modal?.type === "growth"
            ? "growth"
            : "chat";

  return (
    <UIContext.Provider value={ui}>
      <div className="flex h-dvh flex-col">
        <Masthead
          notifOpen={notifOpen}
          setNotifOpen={setNotifOpen}
          onSearch={() => {
            setNotifOpen(false);
            setCommandOpen(true);
          }}
        />

        <main ref={scrollRef} className="flex-1 overflow-y-auto">
          <ChatFlow
            messages={messages}
            typing={typing}
            rehearsal={rehearsal}
            onExitRehearsal={() => setRehearsal(false)}
          />
        </main>

        <footer className="shrink-0 space-y-2.5 border-t border-rule bg-paper pb-1 pt-4">
          <Composer prefill={prefill} onSend={send} />
          <BottomNav active={navActive} />
        </footer>
      </div>

      {/* Layer 0 · 主动提醒 */}
      {proactive && <ProactiveCard onClose={() => setProactive(false)} />}

      {/* Layer 2 · 侧滑面板 */}
      {panel && (
        <SidePanelShell onClose={() => setPanel(null)}>
          <div key={JSON.stringify(panel)} className="anim-fade flex h-full flex-col">
            {panel.type === "person" && personById(panel.id) && (
              <PersonPanel person={personById(panel.id)!} />
            )}
            {panel.type === "people" && <PeoplePanel />}
            {panel.type === "project" && projectById(panel.id) && (
              <ProjectPanel project={projectById(panel.id)!} />
            )}
            {panel.type === "projects" && <ProjectsPanel />}
            {panel.type === "meeting" && <MeetingPanel />}
            {panel.type === "settings" && <SettingsPanel />}
          </div>
        </SidePanelShell>
      )}

      {/* Layer 3 · 弹窗 */}
      {modal?.type === "evidence" && (
        <EvidenceModal
          evidence={
            (personById("wang")!.evidence.find((e) => e.id === modal.id) ??
              personById("wang")!.evidence[0])
          }
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === "growth" && (
        <GrowthModal onClose={() => setModal(null)} />
      )}

      {/* Layer 0 · ⌘K 检索 */}
      {commandOpen && <CommandMenu onClose={() => setCommandOpen(false)} />}
    </UIContext.Provider>
  );
}
