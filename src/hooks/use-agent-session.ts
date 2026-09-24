"use client";

import { useEffect, useState, useCallback } from "react";
import { sessionManager } from "@/business/entities/session-manager";
import { agentBus } from "@/business/bus/agent-bus";
import type { AgentSession } from "@/business/entities/agent-session";

/**
 * useAgentSession
 * 将 React 视图层接入 SessionManager 业务实体。
 * 遵循原则 ④：UI 只是薄壳，全部会话状态与发送调用均委派给 AgentSession。
 */
export function useAgentSession() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const unsub = agentBus.on("session_changed", () => {
      setTick((t) => t + 1);
    });
    return unsub;
  }, []);

  const activeSession = sessionManager.activeSession;

  const send = useCallback(
    async (text: string, options?: Parameters<AgentSession["send"]>[1]) => {
      await sessionManager.activeSession.send(text, options);
    },
    [],
  );

  return {
    sessions: sessionManager.sessions,
    activeSession,
    activeConvId: activeSession.id,
    isRunning: activeSession.isRunning,
    messages: activeSession.messages,
    chatMessages: activeSession.toChatMessages(),
    send,
    selectSession: (id: string) => sessionManager.selectSession(id),
    createSession: (projectId?: string) => sessionManager.createSession(projectId),
    deleteSession: (id: string) => sessionManager.deleteSession(id),
  };
}
