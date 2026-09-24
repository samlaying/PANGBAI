"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Block, ChatMessage, Conversation, Person, Project } from "@/lib/types";
import { mapArtifact, mapPerson, mapProject } from "@/lib/records";
import { Masthead } from "./masthead";
import { Sidebar } from "./sidebar";
import { BottomNav, type NavKey } from "./bottom-nav";
import { Composer } from "./composer";
import { ChatFlow } from "./chat/chat-flow";
import { EmptyState } from "./chat/empty-state";
import { MdCanvas, type CanvasDoc } from "./canvas/md-canvas";
import { SidePanelShell } from "./panels/side-panel";
import { PersonPanel } from "./panels/person-panel";
import { PeoplePanel, ProjectsPanel } from "./panels/list-panels";
import { ProjectPanel } from "./panels/project-panel";
import { MeetingPanel } from "./panels/meeting-panel";
import { SettingsPanel } from "./panels/settings-panel";
import { EvidenceModal } from "./modals/evidence-modal";
import { GrowthModal } from "./modals/growth-modal";
import { CommandMenu } from "./overlays/command-menu";
import { UIContext, type UIActions } from "./ui-context";



function parseMarkdownToBlocks(
  content: string,
  onArtifactDetected?: (title: string, docContent: string) => void,
): Block[] {
  const blocks: Block[] = [];

  // 识别结构化 PRD / 方案骨架（含 YAML Frontmatter）
  const yamlMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (yamlMatch) {
    const rawYaml = yamlMatch[1];
    const titleMatch = rawYaml.match(/title:\s*["']?([^"'\n]+)["']?/);
    const typeMatch = rawYaml.match(/type:\s*["']?([^"'\n]+)["']?/);
    const solutionMatch = rawYaml.match(/expected_solution:\s*["']?([^"'\n]+)["']?/);

    const docTitle = titleMatch ? titleMatch[1].trim() : "项目需求方案与架构骨架.md";
    const docType = (typeMatch ? typeMatch[1].trim() : "prd") as import("@/lib/types").ArtifactType;

    blocks.push({
      kind: "para",
      dropcap: true,
      text: "根据你的要求，我已经为你梳理了预期业务解法并生成了挂载 YAML 规范的大体架构骨架：",
    });

    blocks.push({
      kind: "artifact_suggestion",
      title: docTitle,
      artifactType: docType,
      description: solutionMatch
        ? `预期方案：${solutionMatch[1].trim()}`
        : "包含完整的项目元数据与各模块骨架，便于直接补充细节",
      docContent: content,
    });

    onArtifactDetected?.(docTitle, content);
    blocks.push({ kind: "actions" });
    return blocks;
  }

  const lines = content.split("\n");
  let currentQuote: string[] = [];
  let currentPara: string[] = [];

  const flushPara = () => {
    if (currentPara.length > 0) {
      const text = currentPara.join("\n").trim();
      if (text) {
        blocks.push({
          kind: "para",
          dropcap: blocks.length === 0,
          text,
        });
      }
      currentPara = [];
    }
  };

  const flushQuote = () => {
    if (currentQuote.length > 0) {
      const text = currentQuote.join("\n").trim();
      if (text) {
        blocks.push({
          kind: "quote",
          label: "建议回复话术 · SUGGESTED REPLY",
          text,
        });
      }
      currentQuote = [];
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.startsWith(">")) {
      flushPara();
      currentQuote.push(line.replace(/^>\s?/, ""));
    } else if (!line) {
      flushQuote();
      flushPara();
    } else {
      flushQuote();
      currentPara.push(rawLine);
    }
  }

  flushQuote();
  flushPara();

  if (blocks.length > 0) {
    blocks.push({ kind: "actions" });
  }

  return blocks;
}

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

const newConversation = (projectId?: string): Conversation => ({
  id: nextId(),
  title: "新的对话",
  time: "刚刚",
  group: "今天",
  messages: [],
  projectId,
});

const INITIAL_CONVERSATION = newConversation();

export function AppShell() {
  const [panel, setPanel] = useState<PanelState>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [commandOpen, setCommandOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeCanvas, setActiveCanvas] = useState<CanvasDoc | null>(null);

  const [conversations, setConversations] =
    useState<Conversation[]>([INITIAL_CONVERSATION]);
  const [activeConvId, setActiveConvId] = useState(INITIAL_CONVERSATION.id);
  const [projects, setProjects] = useState<Project[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [projectCreateSignal, setProjectCreateSignal] = useState(0);

  const [typing, setTyping] = useState(false);
  const [prefill, setPrefill] = useState({ text: "", n: 0 });
  const scrollRef = useRef<HTMLDivElement>(null);

  const activeConv =
    conversations.find((c) => c.id === activeConvId) ?? conversations[0];
  const activeProject = activeConv?.projectId
    ? projects.find((p) => p.id === activeConv.projectId) ?? null
    : null;

  /* 在右侧打开具体产物文档 (零弹窗直达) */
  const openArtifactInCanvas = useCallback(
    (art: import("@/lib/types").ProjectArtifact) => {
      setActiveCanvas({
        id: art.id,
        title: art.title,
        content: art.content,
        updatedAt: art.updatedAt,
      });
    },
    []
  );

  /* 检查并唤出 Canvas */
  const openDefaultCanvas = useCallback((title = "未命名文档.md") => {
    setActiveCanvas({ id: crypto.randomUUID(), title, content: `# ${title}\n`, updatedAt: "刚刚" });
  }, []);

  const loadCanvasDoc = useCallback(async (title: string, content: string) => {
    const projectId = activeProject?.id;
    if (!projectId) {
      setActiveCanvas({ id: crypto.randomUUID(), title, content, updatedAt: "刚刚" });
      return;
    }
    const response = await fetch("/api/artifacts", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, title, content }),
    });
    if (!response.ok) throw new Error("文档创建失败");
    const artifact = mapArtifact(await response.json());
    setProjects((prev) => prev.map((project) => project.id === projectId
      ? { ...project, artifacts: [...(project.artifacts || []), artifact] } : project));
    setActiveCanvas({ id: artifact.id, title: artifact.title, content: artifact.content, updatedAt: artifact.updatedAt });
  }, [activeProject?.id]);

  const saveCanvasDoc = useCallback(async () => {
    if (!activeCanvas || !activeProject) throw new Error("请先选择项目");
    const exists = activeProject.artifacts?.some((art) => art.id === activeCanvas.id);
    const response = await fetch(exists ? `/api/artifacts/${encodeURIComponent(activeCanvas.id)}` : "/api/artifacts", {
      method: exists ? "PUT" : "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: activeProject.id, title: activeCanvas.title, content: activeCanvas.content }),
    });
    if (!response.ok) throw new Error("文档保存失败");
    const payload = await response.json();
    const id = exists ? activeCanvas.id : payload.id;
    const artifact = mapArtifact({ ...payload, id, projectId: activeProject.id,
      title: payload.title || activeCanvas.title, content: activeCanvas.content, updatedAt: "刚刚" });
    setProjects((prev) => prev.map((project) => project.id === activeProject.id
      ? { ...project, artifacts: exists
        ? (project.artifacts || []).map((art) => art.id === id ? artifact : art)
        : [...(project.artifacts || []), artifact] } : project));
    setActiveCanvas((prev) => prev ? { ...prev, id } : prev);
  }, [activeCanvas, activeProject]);

  /* 确认把 AI 提前提炼的记忆沉淀到世界模型中 */
  const confirmMemory = useCallback(async (data: {
    personId: string; candidateId?: string; pattern: string; observation: string; confidence: number; scene?: string;
  }) => {
    const response = await fetch(`/api/people/${encodeURIComponent(data.personId)}/memory/confirm`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ candidateId: data.candidateId, observation: data.observation,
        inferredPattern: data.pattern, confidence: data.confidence, source: data.scene }),
    });
    if (!response.ok) throw new Error("记忆保存失败");
    const result = await response.json();
    const person = mapPerson(result.person);
    setPeople((prev) => prev.map((p) => p.id === person.id ? person : p));
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const [peopleResponse, projectsResponse] = await Promise.all([fetch("/api/people"), fetch("/api/projects")]);
        if (!peopleResponse.ok || !projectsResponse.ok) throw new Error("资料加载失败");
        const [peopleData, projectsData] = await Promise.all([peopleResponse.json(), projectsResponse.json()]);
        setPeople(Array.isArray(peopleData) ? peopleData.map(mapPerson) : []);
        setProjects(Array.isArray(projectsData) ? projectsData.map(mapProject) : []);
      } catch (error) { console.error("Failed to load workspace:", error); }
    };
    void load();
  }, []);


  /* 对话自动滚到底 */
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [activeConv?.messages.length, typing, activeConvId]);

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
    async (text: string) => {
      const convId = activeConvId;

      // 关键词检测：按需自动唤出 Canvas（写 PRD、撰写方案、大纲、骨架、会议纪要）
      const lower = text.toLowerCase();
      const isDocIntent =
        lower.includes("prd") ||
        lower.includes("方案") ||
        lower.includes("需求") ||
        lower.includes("会议纪要") ||
        lower.includes("备忘") ||
        lower.includes("大纲") ||
        lower.includes("骨架");

      if (isDocIntent && !activeCanvas) {
        openDefaultCanvas();
      }

      const userMsg: ChatMessage = {
        id: nextId(),
        role: "user",
        time: "刚刚",
        text,
      };

      patchConversation(convId, (c) => ({
        ...c,
        title:
          c.messages.length === 0
            ? text.slice(0, 16) + (text.length > 16 ? "…" : "")
            : c.title,
        time: "刚刚",
        messages: [...c.messages, userMsg],
      }));

      setTyping(true);

      const assistantMsgId = nextId();
      let streamAccumulator = "";

      try {
        const currentConv = conversations.find((c) => c.id === convId);
        const currentProject = currentConv?.projectId
          ? projects.find((p) => p.id === currentConv.projectId)
          : null;

        const history = (currentConv?.messages || []).map((m) => ({
          role: m.role,
          content: m.role === "user" ? m.text : "已提供建议",
        }));

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [...history, { role: "user", content: text }],
            activeCanvas: activeCanvas
              ? { title: activeCanvas.title, content: activeCanvas.content }
              : undefined,
            projectId: currentProject?.id,
            activeProject: currentProject
              ? {
                  id: currentProject.id,
                  name: currentProject.name,
                  status: currentProject.status,
                  deadline: currentProject.deadline,
                  progress: currentProject.progress,
                  riskCount: currentProject.riskCount,
                  risks: currentProject.risks,
                  milestones: currentProject.milestones,
                  advice: currentProject.advice,
                }
              : undefined,
            projectArtifacts: currentProject?.artifacts || [],
          }),
        });

        if (!res.ok || !res.body) {
          throw new Error("Chat upstream failed");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();

        // 占位初始化 assistant 消息
        patchConversation(convId, (c) => ({
          ...c,
          messages: [
            ...c.messages,
            {
              id: assistantMsgId,
              role: "assistant",
              time: "刚刚",
              blocks: [],
            } as ChatMessage,
          ],
        }));

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          streamAccumulator += chunk;
          const parsedBlocks = parseMarkdownToBlocks(streamAccumulator);

          patchConversation(convId, (c) => ({
            ...c,
            messages: c.messages.map((m) =>
              m.id === assistantMsgId ? { ...m, blocks: parsedBlocks } : m,
            ),
          }));
        }

        setTyping(false);
      } catch (err) {
        console.error("Chat request failed:", err);
        setTyping(false);
        patchConversation(convId, (c) => ({
          ...c,
          messages: [...c.messages.filter((m) => m.id !== assistantMsgId), {
            id: nextId(), role: "assistant", time: "刚刚",
            blocks: [{ kind: "para", text: "请求失败，请检查服务配置后重试。" }],
          } as ChatMessage],
        }));
      }
    },
    [
      activeConvId,
      activeCanvas,
      conversations,
      projects,
      openDefaultCanvas,
      patchConversation,
    ],
  );

  const selectConversation = useCallback((id: string) => {
    setActiveConvId(id);
    setActiveCanvas(null);
  }, []);

  const openProjectWorkspace = useCallback(
    (projectId: string) => {
      setActiveCanvas(null);
      // 查找该项目已有会话，或新建该项目专属会话
      const existing = conversations.find((c) => c.projectId === projectId);
      if (existing) {
        setActiveConvId(existing.id);
      } else {
        const proj = projects.find((p) => p.id === projectId);
        const conv = newConversation(projectId);
        if (proj) conv.title = `${proj.name} · 新会话`;
        setConversations((cs) => [conv, ...cs]);
        setActiveConvId(conv.id);
      }
      setPanel(null);
    },
    [conversations, projects]
  );

  const startNewConversation = useCallback(() => {
    // 继承当前项目（若处于某个项目会话中），并提供幂等保护
    const targetProjectId = activeConv.projectId;
    const emptyConv = conversations.find(
      (c) => c.messages.length === 0 && c.projectId === targetProjectId
    );
    if (emptyConv) {
      setActiveConvId(emptyConv.id);
      return;
    }

    const proj = targetProjectId
      ? projects.find((p) => p.id === targetProjectId)
      : null;
    const conv = newConversation(targetProjectId);
    if (proj) conv.title = `${proj.name} · 会话`;
    setConversations((cs) => [conv, ...cs]);
    setActiveConvId(conv.id);
  }, [conversations, activeConv.projectId, projects]);

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
    openProjectDocs: (projectId) => {
      openProjectWorkspace(projectId);
      const p = projects.find((x) => x.id === projectId);
      if (p?.artifacts?.[0]) {
        openArtifactInCanvas(p.artifacts[0]);
      } else {
        openDefaultCanvas();
      }
    },
    openMeeting: () => setPanel({ type: "meeting" }),
    openEvidence: (id) => setModal({ type: "evidence", id }),
    openGrowth: () => setModal({ type: "growth" }),
    openPeople: () => setPanel({ type: "people" }),
    openProjects: () => setPanel({ type: "projects" }),
    openSettings: () => setPanel({ type: "settings" }),
    closePanel: () => setPanel(null),
    ask,
    startRehearsal: () => ask("请根据当前对话扮演沟通对象，与我进行一轮真实的职场沟通演练。先提出一个具体问题，等我回答后再追问，并在结束时给出针对性的反馈。"),
    createProject,
    loadCanvasDoc,
    confirmMemory,
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
      <div className="flex h-dvh w-full overflow-hidden bg-paper">
        <Sidebar
          conversations={conversations}
          activeId={activeConv.id}
          projects={projects}
          collapsed={sidebarCollapsed}
          onSelect={selectConversation}
          onNew={startNewConversation}
          onDelete={deleteConversation}
          onOpenProject={(id) => openProjectWorkspace(id)}
          onNewProject={createProject}
          onToggle={() => setSidebarCollapsed((v) => !v)}
          onSearch={() => {
            setNotifOpen(false);
            setCommandOpen(true);
          }}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <Masthead
            notifOpen={notifOpen}
            setNotifOpen={setNotifOpen}
            activeTitle={activeConv?.title}
            sidebarCollapsed={sidebarCollapsed}
            onToggleSidebar={() => setSidebarCollapsed(false)}
            canvasOpen={Boolean(activeCanvas)}
            onToggleCanvas={() => {
              if (activeCanvas) {
                setActiveCanvas(null);
              } else {
                const firstArt = activeProject?.artifacts?.[0];
                if (firstArt) openArtifactInCanvas(firstArt);
                else openDefaultCanvas();
              }
            }}
            project={activeProject}
            activeCanvasId={activeCanvas?.id}
            onSelectArtifact={(art) => {
              if (activeCanvas?.id === art.id) {
                setActiveCanvas(null);
              } else {
                openArtifactInCanvas(art);
              }
            }}
          />

          <main className="flex min-h-0 flex-1 overflow-hidden">
            <div ref={scrollRef} className="flex-1 overflow-y-auto">
              {isEmptyConversation ? (
                <EmptyState />
              ) : (
                <ChatFlow
                  opener={activeConv.opener}
                  messages={messages}
                  typing={typing}
                />
              )}
            </div>

            {/* 按需唤出的 Markdown Canvas 画布 */}
            {activeCanvas && (
              <MdCanvas
                key={activeCanvas.id}
                doc={activeCanvas}
                onSave={saveCanvasDoc}
                artifacts={activeProject?.artifacts}
                onSelectArtifact={openArtifactInCanvas}
                onNewArtifact={() => {
                  ask(
                    `请为当前项目「${activeProject?.name || "当前项目"}」打磨一份新方案大纲骨架（PRD Skeleton）与预期业务解法，给出规范的 YAML 头部。`
                  );
                }}
                onChange={(content) => {
                  setActiveCanvas((prev) =>
                    prev ? { ...prev, content, updatedAt: "刚刚" } : null,
                  );
                }}
                onClose={() => setActiveCanvas(null)}
                onAskAI={ask}
              />
            )}
          </main>

          <footer className="shrink-0 space-y-2 border-t border-rule bg-paper pb-1 pt-2.5">
            <Composer key={prefill.n} prefill={prefill} onSend={send} />
            <BottomNav active={navActive} />
          </footer>
        </div>
      </div>

      {/* Layer 2 · 侧滑面板 */}
      {panel && (
        <SidePanelShell onClose={() => setPanel(null)}>
          <div key={JSON.stringify(panel)} className="anim-fade flex h-full flex-col">
            {panel.type === "person" && people.find((p) => p.id === panel.id) && (
              <PersonPanel
                person={people.find((p) => p.id === panel.id)!}
              />
            )}
            {panel.type === "people" && <PeoplePanel people={people} onCreated={async (name, role) => {
              const response = await fetch("/api/people", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, role }) });
              if (!response.ok) throw new Error("创建人物失败");
              const person = mapPerson(await response.json());
              setPeople((prev) => [...prev, person]);
            }} />}
            {panel.type === "project" && projects.find((p) => p.id === panel.id) && (
              <ProjectPanel project={projects.find((p) => p.id === panel.id)!} people={people} />
            )}
            {panel.type === "projects" && (
              <ProjectsPanel
                key={projectCreateSignal}
                projects={projects}
                createSignal={projectCreateSignal}
                onCreated={async (name, deadline) => {
                  const response = await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name, deadline }) });
                  if (!response.ok) throw new Error("创建失败");
                  const project = mapProject(await response.json());
                  setProjects((ps) => [project, ...ps]);
                  setPanel({ type: "project", id: project.id });
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
            people.flatMap((p) => p.evidence).find((e) => e.id === modal.id)!
          }
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === "growth" && (
        <GrowthModal onClose={() => setModal(null)} />
      )}

      {/* Layer 0 · ⌘K 检索 */}
      {commandOpen && <CommandMenu onClose={() => setCommandOpen(false)} people={people} projects={projects} />}
    </UIContext.Provider>
  );
}
