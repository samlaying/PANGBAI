import { agentBus } from "../bus/agent-bus";
import { AgentSession } from "./agent-session";
import { workspaceManager } from "./workspace-manager";

/**
 * SessionManager
 * 业务实体层：负责管理用户的全部会话生命周期与当前活跃会话。
 */
export class SessionManager {
  public sessions: AgentSession[] = [];
  public activeSessionId: string;

  constructor() {
    const initialSession = new AgentSession(crypto.randomUUID(), "新的对话");
    this.sessions = [initialSession];
    this.activeSessionId = initialSession.id;
  }

  get activeSession(): AgentSession {
    return this.sessions.find((s) => s.id === this.activeSessionId) ?? this.sessions[0];
  }

  selectSession(id: string): void {
    if (this.activeSessionId === id) return;
    this.activeSessionId = id;
    agentBus.dispatch("canvas_close_requested", {});
    agentBus.dispatch("session_changed", {
      sessionId: id,
      action: "message_added",
    });
  }

  createSession(projectId?: string): AgentSession {
    // 幂等保护：如果当前会话就是空会话且项目匹配，直接复用
    const empty = this.sessions.find(
      (s) => s.messages.length === 0 && s.projectId === projectId,
    );
    if (empty) {
      this.selectSession(empty.id);
      return empty;
    }

    let title = "新的对话";
    if (projectId) {
      const proj = workspaceManager.projects.find((p) => p.id === projectId);
      if (proj) title = `${proj.name} · 会话`;
    }

    const session = new AgentSession(crypto.randomUUID(), title, projectId);
    this.sessions = [session, ...this.sessions];
    this.activeSessionId = session.id;
    agentBus.dispatch("canvas_close_requested", {});
    agentBus.dispatch("session_changed", {
      sessionId: session.id,
      action: "message_added",
    });
    return session;
  }

  deleteSession(id: string): void {
    this.sessions = this.sessions.filter((s) => s.id !== id);
    if (this.sessions.length === 0) {
      const fallback = new AgentSession(crypto.randomUUID(), "新的对话");
      this.sessions = [fallback];
      this.activeSessionId = fallback.id;
    } else if (this.activeSessionId === id) {
      this.activeSessionId = this.sessions[0].id;
    }
    agentBus.dispatch("session_changed", {
      sessionId: this.activeSessionId,
      action: "message_added",
    });
  }
}

export const sessionManager = new SessionManager();
