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

  const addProject = useCallback(async (params: Parameters<typeof workspaceManager.addProject>[0]) => {
    return workspaceManager.addProject(params);
  }, []);

  const confirmMemory = useCallback(async (params: Parameters<typeof workspaceManager.confirmMemory>[0]) => {
    return workspaceManager.confirmMemory(params);
  }, []);

  const addEvent = useCallback(async (params: Parameters<typeof workspaceManager.addEvent>[0]) => {
    return workspaceManager.addEvent(params);
  }, []);

  const deleteEvent = useCallback(async (id: string, projectId?: string) => {
    return workspaceManager.deleteEvent(id, projectId);
  }, []);

  const refreshPeople = useCallback(async () => {
    return workspaceManager.refreshPeople();
  }, []);

  const refreshProjects = useCallback(async () => {
    return workspaceManager.refreshProjects();
  }, []);

  const refreshEvents = useCallback(async (projectId?: string) => {
    return workspaceManager.refreshEvents(projectId);
  }, []);

  return {
    people: workspaceManager.people,
    projects: workspaceManager.projects,
    events: workspaceManager.events,
    isLoading: workspaceManager.isLoading,
    addPerson,
    addProject,
    confirmMemory,
    addEvent,
    deleteEvent,
    refreshPeople,
    refreshProjects,
    refreshEvents,
  };
}
