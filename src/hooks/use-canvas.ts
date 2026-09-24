"use client";

import { useEffect, useState, useCallback } from "react";
import { canvasDocumentManager } from "@/business/entities/canvas-document";
import { agentBus } from "@/business/bus/agent-bus";
import type { CanvasDoc } from "@/components/canvas/md-canvas";

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

  const openDoc = useCallback((doc: CanvasDoc) => {
    canvasDocumentManager.openDoc(doc, projectId);
  }, [projectId]);

  const createDraft = useCallback((title?: string) => {
    canvasDocumentManager.createDraft(title, projectId);
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
