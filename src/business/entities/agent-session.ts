import { agentBus } from "../bus/agent-bus";
import { sseTransport } from "@/infra/transport/sse-transport";
import type { AgentEvent } from "@/infra/transport/agent-protocol";
import type { AgentMessage, MessagePart } from "./message-part";
import { parseMarkdownToBlocksAndParts } from "../parser/block-parser";
import { workspaceManager } from "./workspace-manager";
import type { Block, ChatMessage, Conversation, Project } from "@/lib/types";

export interface SendChatOptions {
  projectId?: string;
  activeCanvas?: { title: string; content: string };
  activeProject?: Project | Record<string, unknown>;
  projectArtifacts?: unknown[];
}

/**
 * AgentSession
 * 业务实体层核心：承载单个 Agent 会话的全部生命周期与 Parts 状态流转。
 * 遵循原则 ⑤：业务实体不知道 UI 层的存在，所有状态变动向 AgentBus 广播。
 */
export class AgentSession {
  public id: string;
  public title: string;
  public time: string;
  public group: Conversation["group"];
  public projectId?: string;
  public messages: AgentMessage[] = [];
  public isRunning: boolean = false;
  private rawAccumulator: string = "";
  private pendingArtifactDoc?: { title: string; content: string; type: import("@/lib/types").ArtifactType };

  constructor(id: string, title = "新的对话", projectId?: string) {
    this.id = id;
    this.title = title;
    this.time = "刚刚";
    this.group = "今天";
    this.projectId = projectId;
  }

  /**
   * 发送用户指令给 Agent Runtime
   * 包含业务级并发锁与幂等保护
   */
  async send(text: string, options?: SendChatOptions): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;
    this.rawAccumulator = "";
    this.pendingArtifactDoc = undefined;

    // 1. 追加用户消息
    const userMsg: AgentMessage = {
      id: crypto.randomUUID(),
      role: "user",
      timestamp: "刚刚",
      parts: [{ type: "text", text }],
    };
    this.messages.push(userMsg);
    if (this.messages.length === 1) {
      this.title = text.slice(0, 16) + (text.length > 16 ? "…" : "");
    }
    this.notify("message_added", userMsg);

    // 2. 占位 Assistant 消息
    const assistantMsg: AgentMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      timestamp: "刚刚",
      parts: [],
    };
    this.messages.push(assistantMsg);
    this.notify("message_added", assistantMsg);

    try {
      // 当前用户消息和 assistant 占位都已加入列表，先移除这两条，
      // 再在请求末尾单独追加当前输入，避免重复发送。
      const history = this.messages.slice(0, -2).map((m) => {
        const textPart = m.parts.find((p) => p.type === "text");
        return {
          role: m.role,
          content: m.role === "user" ? (textPart?.type === "text" ? textPart.text : "") : "已提供建议",
        };
      });

      await sseTransport.stream(
        "/api/chat",
        {
          messages: [...history, { role: "user", content: text }],
          sessionId: this.id,
          sessionTitle: this.title,
          projectId: options?.projectId || this.projectId,
          activeCanvas: options?.activeCanvas,
          activeProject: options?.activeProject,
          projectArtifacts: options?.projectArtifacts,
        },
        (event: AgentEvent) => {
          this.handleAgentEvent(assistantMsg, event);
        },
      );
    } catch (error) {
      console.error(`AgentSession ${this.id} send failed:`, error);
      assistantMsg.parts.push({
        type: "text",
        text: "请求失败，请检查服务配置后重试。",
      });
      this.notify("error", error);
    } finally {
      this.flushPendingArtifactDoc(options?.projectId || this.projectId);
      this.isRunning = false;
      this.notify("run_finished", { sessionId: this.id });
      void workspaceManager.refreshPeople();
    }
  }

  private flushPendingArtifactDoc(projectId?: string): void {
    const artifactDoc = this.pendingArtifactDoc as
      | { title: string; content: string; type: import("@/lib/types").ArtifactType }
      | undefined;
    if (!artifactDoc) return;
    this.pendingArtifactDoc = undefined;
    agentBus.dispatch("canvas_open_requested", {
      title: artifactDoc.title,
      content: artifactDoc.content,
      projectId,
    });
  }

  /**
   * 处理后端推送过来的结构化 AgentEvent
   */
  private handleAgentEvent(msg: AgentMessage, event: AgentEvent): void {
    switch (event.type) {
      case "message.delta": {
        this.rawAccumulator += event.delta;
        const { parts, artifactDoc } = parseMarkdownToBlocksAndParts(this.rawAccumulator);
        if (artifactDoc) this.pendingArtifactDoc = artifactDoc;

        // 保留已有的 tool / candidate 等特殊 parts
        const specialParts = msg.parts.filter((p) => p.type !== "text" && p.type !== "artifact");
        msg.parts = [...specialParts, ...parts];

        this.notify("part_updated", { messageId: msg.id, parts: msg.parts });
        break;
      }

      case "thinking.delta": {
        let thinkPart = msg.parts.find((p) => p.type === "thinking");
        if (!thinkPart || thinkPart.type !== "thinking") {
          thinkPart = { type: "thinking", content: "" };
          msg.parts.unshift(thinkPart);
        }
        thinkPart.content += event.delta;
        this.notify("part_updated", { messageId: msg.id, part: thinkPart });
        break;
      }

      case "tool.started": {
        const toolPart: MessagePart = {
          type: "tool",
          toolCallId: event.toolCallId,
          name: event.toolName,
          input: event.input,
          status: "running",
        };
        msg.parts.push(toolPart);
        this.notify("part_added", { messageId: msg.id, part: toolPart });
        break;
      }

      case "tool.result": {
        const tool = msg.parts.find((p) => p.type === "tool" && p.toolCallId === event.toolCallId);
        if (tool && tool.type === "tool") {
          tool.status = event.status === "success" ? "done" : "error";
          tool.output = event.output;
          this.notify("part_updated", { messageId: msg.id, part: tool });
        }
        break;
      }

      case "artifact.suggested": {
        const artPart: MessagePart = {
          type: "artifact",
          artifactId: event.artifactId,
          title: event.title,
          artifactType: event.artifactType,
          content: event.content,
          frontmatter: event.frontmatter,
          description: event.description,
        };
        msg.parts.push(artPart);
        this.notify("part_added", { messageId: msg.id, part: artPart });
        agentBus.dispatch("canvas_open_requested", {
          title: event.title,
          content: event.content,
          projectId: this.projectId,
        });
        break;
      }

      case "memory.candidate": {
        const memPart: MessagePart = {
          type: "memory_candidate",
          candidateId: event.candidateId || crypto.randomUUID(),
          personId: event.personId,
          personName: event.personName,
          pattern: event.pattern,
          observation: event.observation,
          confidence: event.confidence,
          targetScene: event.targetScene,
          status: "pending",
        };
        msg.parts.push(memPart);
        this.notify("part_added", { messageId: msg.id, part: memPart });
        break;
      }

      case "ui.generative": {
        const genPart: MessagePart = {
          type: "generative_ui",
          component: event.componentType,
          props: event.props,
        };
        msg.parts.push(genPart);
        this.notify("part_added", { messageId: msg.id, part: genPart });
        break;
      }

      case "run.finished": {
        msg.usage = event.usage;
        this.notify("part_updated", { messageId: msg.id, usage: msg.usage });
        break;
      }
    }
  }

  /**
   * 将 AgentMessage[] 适配转换为遗留的 ChatMessage[] 格式（保证向后兼容）
   */
  toChatMessages(): ChatMessage[] {
    return this.messages.map((m) => {
      if (m.role === "user") {
        const textPart = m.parts.find((p) => p.type === "text");
        return {
          id: m.id,
          role: "user",
          time: m.timestamp,
          text: textPart && textPart.type === "text" ? textPart.text : "",
        };
      }

      // Assistant 角色转换为 Block[]
      const blocks: Block[] = [];
      for (const p of m.parts) {
        if (p.type === "text") {
          if (p.isQuote) {
            blocks.push({
              kind: "quote",
              label: p.quoteLabel || "建议回复话术",
              text: p.text,
            });
          } else {
            blocks.push({
              kind: "para",
              dropcap: p.dropcap,
              text: p.text,
            });
          }
        } else if (p.type === "artifact") {
          blocks.push({
            kind: "artifact_suggestion",
            title: p.title,
            artifactType: p.artifactType,
            description: p.description,
            docContent: p.content,
          });
        } else if (p.type === "memory_candidate") {
          blocks.push({
            kind: "memory_candidate",
            candidateId: p.candidateId || `${m.id}-memory-${m.parts.indexOf(p)}`,
            personId: p.personId,
            personName: p.personName,
            pattern: p.pattern,
            observation: p.observation,
            confidence: p.confidence,
            targetScene: p.targetScene || "",
          });
        }
      }

      if (blocks.length > 0 && !blocks.some((b) => b.kind === "actions")) {
        blocks.push({ kind: "actions" });
      }

      return {
        id: m.id,
        role: "assistant",
        time: m.timestamp,
        blocks,
      };
    });
  }

  private notify(action: "message_added" | "part_updated" | "part_added" | "run_finished" | "error", payload?: unknown) {
    agentBus.dispatch("session_changed", {
      sessionId: this.id,
      action,
      payload,
    });
  }
}
