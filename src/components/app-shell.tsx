"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Block, ChatMessage, Conversation, Person, Project } from "@/lib/types";
import {
  CANNED_REPLIES,
  INITIAL_CONVERSATIONS,
  PEOPLE,
  PROJECTS,
  personById,
  projectById,
} from "@/lib/mock-data";
import { Masthead } from "./masthead";
import { Sidebar } from "./sidebar";
import { BottomNav, type NavKey } from "./bottom-nav";
import { Composer } from "./composer";
import { ChatFlow, type RehearsalScenario } from "./chat/chat-flow";
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
import { ProactiveCard } from "./overlays/proactive-card";
import { UIContext, type UIActions } from "./ui-context";

const DEFAULT_PRD_CONTENT = `---
title: "招聘 Agent v2 核心方案与排期备忘"
type: "prd"
date: "2026-09-23"
progress: "draft"
stakeholders: ["王总", "李总", "张明"]
version: "v2.0-draft"
expected_solution: "落地「简历结构化解析 + 关键胜任力打分」，次要字段规则兜底，确保周四向王总与客户顺利演示"
risk_points: ["数据标注延期3天", "跨部门接口联调环境不稳定"]
notes: "本周四向王总与客户演示初版，重点把控交付确定性"
---

# 招聘 Agent v2 核心方案与排期备忘

## 1. 业务背景与预期做成什么方案
- **目标**：将初筛效率提升 40%，周四需向王总与客户演示初版。
- **现状卡点**：数据标注由于样本复杂性延期 3 天，当前综合进度 65%。

## 2. 方案与取舍（Trade-off）
- **方案 A（保期交付核心链路 · 推荐）**：
  优先打通「简历解析 + 核心能力打分」，次要字段暂用规则兜底。可保证周四如期向客户演示。
- **方案 B（全量精准交付）**：
  等待全部标注完毕再行评估，交付整体延后至下周二。

## 3. 向上沟通与跨部门协同
- 需在今晚下班前向王总主动同步，避免评审会上被动质询。
- 与李总对齐接口技术取舍，争取后端去重中间件支持。
`;

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

export function AppShell() {
  const [panel, setPanel] = useState<PanelState>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [commandOpen, setCommandOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [rehearsal, setRehearsal] = useState(false);
  const [rehearsalScenario, setRehearsalScenario] =
    useState<RehearsalScenario | null>(null);
  const [proactive, setProactive] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeCanvas, setActiveCanvas] = useState<CanvasDoc | null>(null);

  const [conversations, setConversations] =
    useState<Conversation[]>(INITIAL_CONVERSATIONS);
  const [activeConvId, setActiveConvId] = useState(INITIAL_CONVERSATIONS[0].id);
  const [projects, setProjects] = useState<Project[]>(PROJECTS);
  const [people, setPeople] = useState<Person[]>(PEOPLE);
  const [projectCreateSignal, setProjectCreateSignal] = useState(0);

  const [typing, setTyping] = useState(false);
  const [prefill, setPrefill] = useState({ text: "", n: 0 });
  const scrollRef = useRef<HTMLDivElement>(null);
  const cannedIdx = useRef(0);

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
  const openDefaultCanvas = useCallback((title = "招聘 Agent v2 PRD 核心方案.md") => {
    setActiveCanvas({
      id: "prd-recruiting",
      title,
      content: DEFAULT_PRD_CONTENT,
      updatedAt: "刚刚",
    });
  }, []);

  /* 载入具体内容并直接在右侧打开 Canvas 工作区 */
  const loadCanvasDoc = useCallback((title: string, content: string) => {
    setActiveCanvas({
      id: `doc-${Date.now()}`,
      title,
      content,
      updatedAt: "刚刚",
    });
  }, []);

  /* 确认把 AI 提前提炼的记忆沉淀到世界模型中 */
  const confirmMemory = useCallback(
    (data: {
      personId: string;
      pattern: string;
      observation: string;
      confidence: number;
      scene?: string;
    }) => {
      setPeople((prev) =>
        prev.map((person) => {
          if (person.id !== data.personId) return person;
          const existingIdx = person.patterns.findIndex(
            (p) => p.pattern === data.pattern,
          );
          let updatedPatterns = [...person.patterns];
          if (existingIdx >= 0) {
            updatedPatterns[existingIdx] = {
              ...updatedPatterns[existingIdx],
              confidence: Math.max(
                updatedPatterns[existingIdx].confidence,
                data.confidence,
              ),
              evidenceCount: updatedPatterns[existingIdx].evidenceCount + 1,
              lastObserved: "刚刚",
            };
          } else {
            updatedPatterns.unshift({
              pattern: data.pattern,
              confidence: data.confidence,
              evidenceCount: 1,
              lastObserved: "刚刚",
            });
          }

          const newEvidenceItem = {
            id: `ev-confirmed-${Date.now()}`,
            date: "刚刚",
            scene: data.scene || "当前项目协同对话",
            source: "对话沉淀",
            person: person.name,
            project: activeProject?.name || "当前项目",
            record: `用户确认了 AI 针对 ${person.name} 提炼的行为模式：「${data.pattern}」`,
            observation: data.observation,
            pattern: data.pattern,
            patternConfidence: data.confidence,
          };

          return {
            ...person,
            patterns: updatedPatterns,
            evidence: [newEvidenceItem, ...person.evidence],
          };
        }),
      );
    },
    [activeProject?.name],
  );

  const startRehearsalWithScenario = useCallback(
    (scenario: RehearsalScenario) => {
      setRehearsalScenario(scenario);
      setRehearsal(true);
    },
    [],
  );

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
          const parsedBlocks = parseMarkdownToBlocks(
            streamAccumulator,
            (title, docContent) => {
              loadCanvasDoc(title, docContent);
            },
          );

          patchConversation(convId, (c) => ({
            ...c,
            messages: c.messages.map((m) =>
              m.id === assistantMsgId ? { ...m, blocks: parsedBlocks } : m,
            ),
          }));
        }

        setTyping(false);
      } catch (err) {
        console.warn("API fallback to canned reply:", err);
        setTyping(false);
        let replyIndex = cannedIdx.current % CANNED_REPLIES.length;
        if (isDocIntent) {
          replyIndex = 0; // PRD 骨架 & 记忆预提炼确认卡
          openDefaultCanvas();
        }
        const reply = CANNED_REPLIES[replyIndex];
        cannedIdx.current += 1;
        patchConversation(convId, (c) => ({
          ...c,
          messages: [
            ...c.messages.filter((m) => m.id !== assistantMsgId),
            {
              id: nextId(),
              role: "assistant",
              time: "刚刚",
              blocks: reply.blocks,
            } as ChatMessage,
          ],
        }));
      }
    },
    [
      activeConvId,
      activeCanvas,
      conversations,
      projects,
      openDefaultCanvas,
      loadCanvasDoc,
      patchConversation,
    ],
  );

  const selectConversation = useCallback((id: string) => {
    setActiveConvId(id);
    setRehearsal(false);
  }, []);

  const openProjectWorkspace = useCallback(
    (projectId: string) => {
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
      setRehearsal(false);
      setPanel(null);
    },
    [conversations, projects]
  );

  const startNewConversation = useCallback(() => {
    // 继承当前项目（若处于某个项目会话中），并提供幂等保护
    const targetProjectId = activeConv?.projectId;
    const emptyConv = conversations.find(
      (c) => c.messages.length === 0 && c.projectId === targetProjectId
    );
    if (emptyConv) {
      setActiveConvId(emptyConv.id);
      setRehearsal(false);
      return;
    }

    const proj = targetProjectId
      ? projects.find((p) => p.id === targetProjectId)
      : null;
    const conv = newConversation(targetProjectId);
    if (proj) conv.title = `${proj.name} · 会话`;
    setConversations((cs) => [conv, ...cs]);
    setActiveConvId(conv.id);
    setRehearsal(false);
  }, [conversations, activeConv?.projectId, projects]);

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
    startRehearsal: () => {
      setModal(null);
      setRehearsalScenario(null);
      setRehearsal(true);
    },
    startRehearsalWithScenario,
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
                  rehearsal={rehearsal}
                  rehearsalScenario={rehearsalScenario}
                  onExitRehearsal={() => {
                    setRehearsal(false);
                    setRehearsalScenario(null);
                  }}
                />
              )}
            </div>

            {/* 按需唤出的 Markdown Canvas 画布 */}
            {activeCanvas && (
              <MdCanvas
                doc={activeCanvas}
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
                  // 同步更新到所属项目 artifacts
                  if (activeCanvas?.id) {
                    setProjects((prev) =>
                      prev.map((p) => ({
                        ...p,
                        artifacts: p.artifacts?.map((art) =>
                          art.id === activeCanvas.id
                            ? { ...art, content, updatedAt: "刚刚" }
                            : art,
                        ),
                      })),
                    );
                  }
                }}
                onClose={() => setActiveCanvas(null)}
                onAskAI={ask}
              />
            )}
          </main>

          <footer className="shrink-0 space-y-2 border-t border-rule bg-paper pb-1 pt-2.5">
            <Composer prefill={prefill} onSend={send} />
            <BottomNav active={navActive} />
          </footer>
        </div>
      </div>

      {/* Layer 0 · 主动提醒 */}
      {proactive && <ProactiveCard onClose={() => setProactive(false)} />}

      {/* Layer 2 · 侧滑面板 */}
      {panel && (
        <SidePanelShell onClose={() => setPanel(null)}>
          <div key={JSON.stringify(panel)} className="anim-fade flex h-full flex-col">
            {panel.type === "person" && (
              <PersonPanel
                person={
                  people.find((p) => p.id === panel.id) ||
                  personById(panel.id)!
                }
              />
            )}
            {panel.type === "people" && <PeoplePanel people={people} />}
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
