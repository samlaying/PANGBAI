"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

export function Modal({
  onClose,
  children,
  label,
}: {
  onClose: () => void;
  children: ReactNode;
  label: string;
}) {
  useEffect(() => {
    const el = document.getElementById("pb-modal-panel");
    el?.focus();
  }, []);

  return (
    <div
      className="anim-fade fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={label}
    >
      <button
        type="button"
        aria-label="关闭"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-ink/25 backdrop-blur-[2px]"
      />
      <div
        id="pb-modal-panel"
        tabIndex={-1}
        className="anim-modal relative max-h-[86vh] w-[560px] max-w-full overflow-y-auto border border-rule bg-paper p-2 shadow-[0_24px_64px_rgba(28,25,23,0.14)] outline-none"
      >
        <div className="border border-rule p-8">{children}</div>
      </div>
    </div>
  );
}

export function ModalHeader({
  kicker,
  onClose,
}: {
  kicker: string;
  onClose: () => void;
}) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div className="kicker">{kicker}</div>
      <button
        type="button"
        onClick={onClose}
        aria-label="关闭"
        className="-mt-1 flex items-center gap-1 font-mono text-[10px] tracking-[0.1em] text-ink-mute transition-colors hover:text-ink"
      >
        ESC
        <X className="size-4" strokeWidth={1.5} />
      </button>
    </div>
  );
}
