"use client";

import type { ReactNode } from "react";

/* 眉题 */
export function Kicker({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`kicker ${className}`}>{children}</div>;
}

/* 栏目标题：── 文本 ── */
export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-px flex-1 bg-rule" />
      <span className="kicker">{children}</span>
      <span className="h-px flex-1 bg-rule" />
    </div>
  );
}

/* 置信度点阵 ●●●●○ */
export function DotMeter({
  value,
  total = 5,
  tone = "accent",
}: {
  value: number; // 0–100
  total?: number;
  tone?: "accent" | "ink";
}) {
  const filled = Math.round((value / 100) * total);
  const on = tone === "accent" ? "bg-accent" : "bg-ink";
  return (
    <span className="inline-flex items-center gap-[3px]" aria-label={`置信度 ${value}%`}>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`size-[5px] rounded-full ${i < filled ? on : "bg-rule"}`}
        />
      ))}
    </span>
  );
}

/* 方形头像（衬线单字） */
export function Avatar({
  char,
  size = "md",
  tone = "paper",
}: {
  char: string;
  size?: "sm" | "md" | "lg";
  tone?: "paper" | "ink";
}) {
  const s = {
    sm: "size-7 text-[13px]",
    md: "size-9 text-[15px]",
    lg: "size-14 text-2xl",
  }[size];
  const t =
    tone === "ink"
      ? "bg-ink text-paper border-ink"
      : "bg-paper-warm text-ink border-rule";
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center border font-serif font-semibold ${s} ${t} rounded-[3px]`}
    >
      {char}
    </span>
  );
}

/* 报刊分隔花饰 ── ✦ ── */
export function FlowerDivider() {
  return (
    <div className="flex items-center gap-5 py-1" aria-hidden>
      <span className="h-px flex-1 bg-rule" />
      <span className="font-display text-[11px] text-ink-mute">✦</span>
      <span className="h-px flex-1 bg-rule" />
    </div>
  );
}

/* 编辑风开关 */
export function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onClick}
      className={`relative h-[18px] w-8 shrink-0 border transition-colors ${
        on ? "border-ink bg-ink" : "border-ink-mute/60 bg-transparent"
      }`}
    >
      <span
        className={`absolute top-[2px] size-[12px] transition-all ${
          on ? "left-[16px] bg-paper" : "left-[2px] bg-ink-mute"
        }`}
      />
    </button>
  );
}

/* 细线按钮 / 实心按钮 */
export function GhostButton({
  children,
  onClick,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-1.5 border border-rule px-3 py-1.5 font-serif text-[13px] text-ink-soft transition-colors hover:border-ink hover:bg-paper-deep hover:text-ink ${className}`}
    >
      {children}
    </button>
  );
}

export function SolidButton({
  children,
  onClick,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-1.5 bg-ink px-4 py-2 font-serif text-[13px] text-paper transition-colors hover:bg-accent ${className}`}
    >
      {children}
    </button>
  );
}
