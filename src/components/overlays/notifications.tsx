"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";
import type { Project } from "@/lib/types";
import { useUI } from "../ui-context";

export function Notifications({ projects, onClose }: { projects: Project[]; onClose: () => void }) {
  const ui = useUI();
  const risks = projects.flatMap((project) => project.risks.map((risk) => ({ project, risk })));
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest("[data-notif-root]")) onClose();
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [onClose]);
  return <div data-notif-root className="anim-fade-up absolute right-0 top-[calc(100%+10px)] w-[380px] border border-rule bg-paper shadow-lg">
    <div className="border-b border-rule px-5 py-3.5 kicker">项目风险 · NOTICES</div>
    {risks.length === 0 ? <p className="px-5 py-5 font-serif text-sm text-ink-mute">暂无风险通知</p> :
      <ul>{risks.map(({ project, risk }, index) => <li key={`${project.id}-${index}`} className="border-b border-rule px-5 py-4">
        <button type="button" onClick={() => { onClose(); ui.openProject(project.id); }} className="flex gap-2 text-left">
          <TriangleAlert className="size-4 shrink-0 text-vermilion" />
          <span><strong className="font-serif text-sm">{project.name} · {risk.title}</strong><span className="mt-1 block text-xs text-ink-mute">{risk.note}</span></span>
        </button>
      </li>)}</ul>}
  </div>;
}
