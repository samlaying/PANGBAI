"use client";

import { useEffect, useState, useCallback } from "react";
import { workspaceManager } from "@/business/entities/workspace-manager";
import { agentBus } from "@/business/bus/agent-bus";

/**
 * useWorkspace
 * 将 React 视图层接入 WorkspaceManager 业务实体。
 */
export function useWorkspace() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const unsub = agentBus.on("workspace_changed", () => {
      setTick((t) => t + 1);
    });
    void workspaceManager.init();
    return unsub;
  }, []);

  const addPerson = useCallback(async (name: string, role: string) => {
    return workspaceManager.addPerson({ name, role });
  }, []);

  const addProject = useCallback(async (name: string, deadline?: string) => {
    return workspaceManager.addProject({ name, deadline });
  }, []);

  const confirmMemory = useCallback(async (params: Parameters<typeof workspaceManager.confirmMemory>[0]) => {
    return workspaceManager.confirmMemory(params);
  }, []);

  return {
    people: workspaceManager.people,
    projects: workspaceManager.projects,
    isLoading: workspaceManager.isLoading,
    addPerson,
    addProject,
    confirmMemory,
  };
}
