"use client";

import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { Masthead } from "./masthead";
import { Sidebar } from "./sidebar";
import { BottomNav, type NavKey } from "./bottom-nav";
import { Composer } from "./composer";
import { ChatFlow } from "./chat/chat-flow";
import { EmptyState } from "./chat/empty-state";
import { MdCanvas } from "./canvas/md-canvas";
import { OverlayHost } from "./overlays/overlay-host";
import { UIContext, type UIActions } from "./ui-context";
import { useAgentSession } from "@/hooks/use-agent-session";
import { useWorkspace } from "@/hooks/use-workspace";
import { useCanvas } from "@/hooks/use-canvas";
import { useOverlayRouter } from "@/hooks/use-overlay-router";

export function AppShell() {
  const router = useOverlayRouter();
  const workspace = useWorkspace();
  const chat = useAgentSession();

  const activeProject = useMemo(() => {
    return chat.activeSession.projectId
      ? workspace.projects.find((p) => p.id === chat.activeSession.projectId) || null
      : null;
  }, [chat.activeSession.projectId, workspace.projects]);

  const canvas = useCanvas(activeProject?.id);

  const [prefill, setPrefill] = useState({ text: "", n: 0 });
  const scrollRef = useRef<HTMLDivElement>(null);

  const ask = useCallback((text: string) => {
    router.closeAll();
    setPrefill((p) => ({ text, n: p.n + 1 }));
  }, [router]);

  // 自动滚动对话到底部
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [chat.messages.length, chat.isRunning, chat.activeConvId]);

  const uiActions: UIActions = useMemo(
    () => ({
      openPerson: (id) => router.setPanel({ type: "person", id }),
      openProject: (id) => router.setPanel({ type: "project", id }),
      openProjectDocs: (projectId) => {
        const p = workspace.projects.find((x) => x.id === projectId);
        if (p?.artifacts?.[0]) {
          canvas.openDoc(p.artifacts[0], projectId);
        } else {
          canvas.createDraft("项目活文档.md", projectId);
        }
      },
      openMeeting: () => router.setPanel({ type: "meeting" }),
      openEvidence: (id) => router.setModal({ type: "evidence", id }),
      openGrowth: () => router.setModal({ type: "growth" }),
      openPeople: () => router.setPanel({ type: "people" }),
      openProjects: () => router.setPanel({ type: "projects" }),
      openSettings: () => router.setPanel({ type: "settings" }),
      closePanel: () => router.closeAll(),
      ask,
      startRehearsal: () =>
        ask("请根据当前对话扮演沟通对象，与我进行一轮真实的职场沟通演练。先提出一个具体问题，等我回答后再追问，并在结束时给出针对性的反馈。"),
      createProject: () => router.setPanel({ type: "projects" }),
      loadCanvasDoc: async (title, content) => {
        canvas.openDoc({
          id: crypto.randomUUID(),
          title,
          content,
          updatedAt: "刚刚",
        });
      },
      confirmMemory: async (data) => {
        await workspace.confirmMemory(data);
      },
    }),
    [router, workspace, canvas, ask],
  );

  const navActive: NavKey = router.panel
    ? router.panel.type === "person" || router.panel.type === "people"
      ? "people"
      : router.panel.type === "project" || router.panel.type === "projects"
      ? "projects"
      : router.panel.type === "settings"
      ? "settings"
      : "chat"
    : router.modal?.type === "growth"
    ? "growth"
    : "chat";

  return (
    <UIContext.Provider value={uiActions}>
      <div className="flex h-screen w-screen overflow-hidden bg-paper text-ink">
        <Sidebar
          conversations={chat.sessions.map((s) => ({
            id: s.id,
            title: s.title,
            time: s.time,
            group: s.group,
            messages: s.toChatMessages(),
            projectId: s.projectId,
          }))}
          activeId={chat.activeConvId}
          projects={workspace.projects}
          collapsed={router.sidebarCollapsed}
          onSelect={chat.selectSession}
          onNew={() => chat.createSession(activeProject?.id)}
          onDelete={chat.deleteSession}
          onOpenProject={(id) => router.setPanel({ type: "project", id })}
          onNewProject={() => router.setPanel({ type: "projects" })}
          onToggle={router.toggleSidebar}
          onSearch={() => router.setCommandOpen(true)}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <Masthead
            notifOpen={router.notifOpen}
            setNotifOpen={router.setNotifOpen}
            activeTitle={chat.activeSession.title}
            sidebarCollapsed={router.sidebarCollapsed}
            onToggleSidebar={router.toggleSidebar}
            canvasOpen={Boolean(canvas.activeCanvas)}
            onToggleCanvas={() => {
              if (canvas.activeCanvas) canvas.closeDoc();
              else canvas.createDraft();
            }}
            project={activeProject}
            activeCanvasId={canvas.activeCanvas?.id}
            onSelectArtifact={(art) => canvas.openDoc(art)}
          />

          <main className="flex min-h-0 flex-1 overflow-hidden">
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-8">
              {chat.messages.length === 0 ? (
                <EmptyState />
              ) : (
                <ChatFlow
                  messages={chat.messages}
                  typing={chat.isRunning}
                />
              )}
            </div>

            {/* 按需唤出的 Markdown Canvas 画布 */}
            {canvas.activeCanvas && (
              <MdCanvas
                key={canvas.activeCanvas.id}
                doc={canvas.activeCanvas}
                onChange={canvas.updateContent}
                onSave={canvas.save}
                onClose={canvas.closeDoc}
                onAskAI={ask}
                artifacts={activeProject?.artifacts}
                onSelectArtifact={(art) => canvas.openDoc(art)}
                onNewArtifact={() => canvas.createDraft(`产物草稿-${Date.now().toString().slice(-4)}.md`)}
              />
            )}
          </main>

          <footer className="shrink-0 space-y-2 border-t border-rule bg-paper pb-1 pt-2.5">
            <Composer
              key={prefill.n}
              prefill={prefill}
              onSend={(text) =>
                chat.send(text, {
                  projectId: activeProject?.id,
                  activeCanvas: canvas.activeCanvas
                    ? { title: canvas.activeCanvas.title, content: canvas.activeCanvas.content }
                    : undefined,
                  activeProject: activeProject || undefined,
                  projectArtifacts: activeProject?.artifacts || [],
                })
              }
              busy={chat.isRunning}
            />
            <BottomNav active={navActive} />
          </footer>
        </div>
      </div>

      {/* 统一浮层与模态框宿主 */}
      <OverlayHost router={router} workspace={workspace} />
    </UIContext.Provider>
  );
}
