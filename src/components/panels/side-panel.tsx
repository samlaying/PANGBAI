"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import { useUI } from "../ui-context";

export function SidePanelShell({
  children,
  onClose,
}: {
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <>
      <button
        type="button"
        aria-label="收起面板"
        onClick={onClose}
        className="anim-fade fixed inset-0 z-40 cursor-default bg-ink/10"
      />
      <aside
        className="anim-panel fixed inset-y-0 right-0 z-50 flex w-[420px] max-w-[92vw] flex-col border-l border-rule bg-paper shadow-[-12px_0_40px_rgba(28,25,23,0.08)]"
        style={{ borderLeft: "3px double rgba(28,25,23,0.65)" }}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </aside>
    </>
  );
}

export function PanelHeader({
  kicker,
  children,
}: {
  kicker: string;
  children?: ReactNode;
}) {
  const ui = useUI();
  return (
    <div className="flex items-start justify-between gap-4 border-b border-rule px-7 pb-5 pt-6">
      <div className="min-w-0">
        <div className="kicker">{kicker}</div>
        {children && <div className="mt-2">{children}</div>}
      </div>
      <button
        type="button"
        onClick={ui.closePanel}
        aria-label="关闭"
        className="mt-0.5 flex shrink-0 items-center gap-1 font-mono text-[10px] tracking-[0.1em] text-ink-mute transition-colors hover:text-ink"
      >
        ESC
        <X className="size-4" strokeWidth={1.5} />
      </button>
    </div>
  );
}

export function PanelBody({ children }: { children: ReactNode }) {
  return (
    <div className="flex-1 space-y-8 overflow-y-auto px-7 py-7">{children}</div>
  );
}

export function PanelFooter({ children }: { children: ReactNode }) {
  return (
    <div className="shrink-0 border-t border-rule px-7 py-5">{children}</div>
  );
}
