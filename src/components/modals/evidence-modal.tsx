"use client";

import { MessageCircle } from "lucide-react";
import type { EvidenceItem } from "@/lib/types";
import { useUI } from "../ui-context";
import { SolidButton } from "../atoms";
import { Modal, ModalHeader } from "./modal";

export function EvidenceModal({
  evidence,
  onClose,
}: {
  evidence: EvidenceItem;
  onClose: () => void;
}) {
  const ui = useUI();

  return (
    <Modal onClose={onClose} label="证据详情">
      <ModalHeader kicker={`证物 · EVIDENCE`} onClose={onClose} />
      <h2 className="font-serif text-[24px] font-black leading-snug">
        {evidence.scene}的记录
      </h2>

      {/* 档案信息 */}
      <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 border-y border-rule py-4">
        {[
          ["日期", evidence.date],
          ["场景", evidence.scene],
          ["人物", evidence.person],
          ["项目", evidence.project],
          ["来源", evidence.source],
        ].map(([k, v]) => (
          <div key={k} className="flex items-baseline gap-3">
            <dt className="w-8 shrink-0 font-mono text-[10px] tracking-[0.12em] text-ink-mute">
              {k}
            </dt>
            <dd className="font-serif text-[13.5px]">{v}</dd>
          </div>
        ))}
      </dl>

      {/* 原始事件 */}
      <section className="mt-6">
        <div className="kicker mb-3">原始事件 · THE RECORD</div>
        <blockquote className="border-l-2 border-ink pl-5 font-serif text-[15px] leading-[2] text-ink">
          {evidence.record}
        </blockquote>
      </section>

      {/* AI 观察 */}
      <section className="mt-8">
        <div className="flex items-center gap-3">
          <span className="h-px flex-1 bg-rule" />
          <span className="kicker">
            AI 的观察 · <span className="text-vermilion">推断，非记录</span>
          </span>
          <span className="h-px flex-1 bg-rule" />
        </div>
        <p className="mt-4 font-serif text-[15px] leading-[1.95] text-ink-soft">
          {evidence.observation}
        </p>
        {evidence.rationale && (
          <div className="mt-3 border-l-2 border-vermilion/60 bg-paper-warm p-3">
            <div className="font-mono text-[10px] tracking-[0.08em] text-vermilion">
              心理归因与推断逻辑 · RATIONALE
            </div>
            <p className="mt-1 font-serif text-[13.5px] leading-relaxed text-ink-soft">
              {evidence.rationale}
            </p>
          </div>
        )}
        {evidence.pattern && (
          <div className="mt-4 inline-flex items-center gap-2 border border-accent/50 px-3 py-1.5">
            <span className="font-mono text-[10px] text-accent">▸</span>
            <span className="font-serif text-[13px]">
              支撑画像：{evidence.pattern}
            </span>
            <span className="font-mono text-[11px] text-accent">
              {evidence.patternConfidence}%
            </span>
          </div>
        )}
      </section>

      <div className="mt-8">
        <SolidButton
          className="w-full py-3"
          onClick={() => {
            onClose();
            ui.ask(`关于这条记录（${evidence.date} ${evidence.scene}），帮我再分析分析。`);
          }}
        >
          <MessageCircle className="size-4" strokeWidth={1.5} />
          引用这段对话到旁白
        </SolidButton>
      </div>
    </Modal>
  );
}
