"use client";

import { createContext, useContext } from "react";

export interface UIActions {
  openPerson: (id: string) => void;
  openProject: (id: string) => void;
  openProjectDocs: (projectId: string) => void;
  openMeeting: () => void;
  openEvidence: (id: string) => void;
  openGrowth: () => void;
  openPeople: () => void;
  openProjects: () => void;
  openSettings: () => void;
  closePanel: () => void;
  /** 关掉所有浮层，把问题回填到输入框 */
  ask: (text: string) => void;
  startRehearsal: () => void;
  /** 打开项目索引并进入新建模式 */
  createProject: () => void;
}

export const UIContext = createContext<UIActions | null>(null);

export function useUI(): UIActions {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useUI 必须在 UIContext.Provider 内使用");
  return ctx;
}
