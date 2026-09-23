"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatMessage, Conversation, Project } from "@/lib/types";
import {
  CANNED_REPLIES,
  INITIAL_CONVERSATIONS,
  PROJECTS,
  personById,
  projectById,
} from "@/lib/mock-data";
import { Masthead } from "./masthead";
import { Sidebar } from "./sidebar";
import { BottomNav, type NavKey } from "./bottom-nav";
import { Composer } from "./composer";
import { ChatFlow } from "./chat/chat-flow";
import { EmptyState } from "./chat/empty-state";
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

const newConversation = (): Conversation => ({
  id: nextId(),
  title: "新的对话",
  time: "刚刚",
  group: "今天",
  messages: [],
});

export function AppShell() {
  const [panel, setPanel] = useState<PanelState>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [commandOpen, setCommandOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [rehearsal, setRehearsal] = useState(false);
  const [proactive, setProactive] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [conversations, setConversations] =
    useState<Conversation[]>(INITIAL_CONVERSATIONS);
  const [activeConvId, setActiveConvId] = useState(INITIAL_CONVERSATIONS[0].id);
  const [projects, setProjects] = useState<Project[]>(PROJECTS);
  const [projectCreateSignal, setProjectCreateSignal] = useState(0);

  const [typing, setTyping] = useState(false);
  const [prefill, setPrefill] = useState({ text: "", n: 0 });
  const scrollRef = useRef<HTMLDivElement>(null);
  const cannedIdx = useRef(0);

  const activeConv =
    conversations.find((c) => c.id === activeConvId) ?? conversations[0];

  /* 主动提醒：6 秒后安静浮出 */
  useEffect(() => {
    const t = setTimeout(() => setProactive(true), 6000);
    return () => clearTimeout(t);
  }, []);

  /* 对话自动滚到底 */
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [activeConv?.messages.length, typing, rehearsal, activeConvId]);

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

  const patchConversation = useCallback(
    (id: string, patch: (c: Conversation) => Conversation) => {
      setConversations((cs) => cs.map((c) => (c.id === id ? patch(c) : c)));
    },
    [],
  );

  const send = useCallback(
    (text: string) => {
      const convId = activeConvId;
      patchConversation(convId, (c) => ({
        ...c,
        title:
          c.messages.length === 0
            ? text.slice(0, 16) + (text.length > 16 ? "…" : "")
            : c.title,
        time: "刚刚",
        messages: [
          ...c.messages,
          { id: nextId(), role: "user", time: "刚刚", text } as ChatMessage,
        ],
      }));
      setTyping(true);
      const reply = CANNED_REPLIES[cannedIdx.current % CANNED_REPLIES.length];
      cannedIdx.current += 1;
      setTimeout(() => {
        setTyping(false);
        patchConversation(convId, (c) => ({
          ...c,
          messages: [
            ...c.messages,
            {
              id: nextId(),
              role: "assistant",
              time: "刚刚",
              blocks: reply.paras.map((text) => ({
                kind: "para" as const,
                text,
              })),
            } as ChatMessage,
          ],
        }));
      }, 1200);
    },
    [activeConvId, patchConversation],
  );

  const selectConversation = useCallback((id: string) => {
    setActiveConvId(id);
    setRehearsal(false);
  }, []);

  const startNewConversation = useCallback(() => {
    const conv = newConversation();
    setConversations((cs) => [conv, ...cs]);
    setActiveConvId(conv.id);
    setRehearsal(false);
  }, []);

  const deleteConversation = useCallback(
    (id: string) => {
      setConversations((cs) => {
        const rest = cs.filter((c) => c.id !== id);
        if (rest.length === 0) rest.push(newConversation());
        if (id === activeConvId) setActiveConvId(rest[0].id);
        return rest;
      });
    },
    [activeConvId],
  );

  const createProject = useCallback(() => {
    setPanel({ type: "projects" });
    setProjectCreateSignal((s) => s + 1);
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
    createProject,
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

  const isEmptyConversation = activeConv.messages.length === 0 && !typing;
  const messages = activeConv?.messages ?? [];

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

        <div className="flex min-h-0 flex-1">
          <Sidebar
            conversations={conversations}
            activeId={activeConv.id}
            projects={projects}
            collapsed={sidebarCollapsed}
            onSelect={selectConversation}
            onNew={startNewConversation}
            onDelete={deleteConversation}
            onOpenProject={(id) => setPanel({ type: "project", id })}
            onNewProject={createProject}
            onToggle={() => setSidebarCollapsed((v) => !v)}
          />

          <div className="flex min-w-0 flex-1 flex-col">
            <main ref={scrollRef} className="flex-1 overflow-y-auto">
              {isEmptyConversation ? (
                <EmptyState />
              ) : (
                <ChatFlow
                  opener={activeConv.opener}
                  messages={messages}
                  typing={typing}
                  rehearsal={rehearsal}
                  onExitRehearsal={() => setRehearsal(false)}
                />
              )}
            </main>

            <footer className="shrink-0 space-y-2.5 border-t border-rule bg-paper pb-1 pt-4">
              <Composer prefill={prefill} onSend={send} />
              <BottomNav active={navActive} />
            </footer>
          </div>
        </div>
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
            {panel.type === "project" && projectById(panel.id, projects) && (
              <ProjectPanel project={projectById(panel.id, projects)!} />
            )}
            {panel.type === "projects" && (
              <ProjectsPanel
                projects={projects}
                createSignal={projectCreateSignal}
                onCreated={(p) => {
                  setProjects((ps) => [p, ...ps]);
                  setPanel({ type: "project", id: p.id });
                }}
              />
            )}
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
