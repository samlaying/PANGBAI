"use client";

import { useEffect, useState, useCallback } from "react";
import { canvasDocumentManager, type CanvasDoc } from "@/business/entities/canvas-document";
import { agentBus } from "@/business/bus/agent-bus";

/**
 * useCanvas
 * 将 React 视图层接入 CanvasDocumentManager 业务实体。
 */
export function useCanvas(projectId?: string) {
  const [, setTick] = useState(0);

  useEffect(() => {
    canvasDocumentManager.activeProjectId = projectId;
  }, [projectId]);

  useEffect(() => {
    const unsub = agentBus.on("canvas_changed", () => {
      setTick((t) => t + 1);
    });
    return unsub;
  }, []);

  const openDoc = useCallback((doc: CanvasDoc, targetProjectId?: string) => {
    canvasDocumentManager.openDoc(doc, targetProjectId ?? projectId);
  }, [projectId]);

  const createDraft = useCallback((title?: string, targetProjectId?: string) => {
    canvasDocumentManager.createDraft(title, targetProjectId ?? projectId);
  }, [projectId]);

  const updateContent = useCallback((content: string) => {
    canvasDocumentManager.updateContent(content);
  }, []);

  const save = useCallback(async () => {
    await canvasDocumentManager.save();
  }, []);

  const closeDoc = useCallback(() => {
    canvasDocumentManager.closeDoc();
  }, []);

  return {
    activeCanvas: canvasDocumentManager.currentDoc,
    openDoc,
    createDraft,
    updateContent,
    save,
    closeDoc,
  };
}
