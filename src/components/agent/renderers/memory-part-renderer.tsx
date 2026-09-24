"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { workspaceManager } from "@/business/entities/workspace-manager";
import { agentBus } from "@/business/bus/agent-bus";
import type { MessagePart } from "@/business/entities/message-part";

export function MemoryPartRenderer({
  candidate,
}: {
  candidate: Extract<MessagePart, { type: "memory_candidate" }>;
}) {
  const [status, setStatus] = useState<"pending" | "confirmed" | "ignored">(candidate.status);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleConfirm = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError("");

    try {
      await workspaceManager.confirmMemory({
        personId: candidate.personId,
        candidateId: candidate.candidateId,
        pattern: candidate.pattern,
        observation: candidate.observation,
        confidence: candidate.confidence,
        scene: candidate.targetScene,
      });
      setStatus("confirmed");
    } catch {
      setError("保存失败，请重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleIgnore = () => {
    setStatus("ignored");
  };

  return (
    <div className="my-3 border border-accent/40 bg-paper-warm/95 p-4 sm:p-5 shadow-2xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rule/60 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10.5px] uppercase tracking-wider text-accent font-bold">
            🧠 待沉淀的职场记忆 · AI 预先提炼
          </span>
          <span className="border border-accent/30 bg-accent/10 px-2 py-0.5 font-mono text-[10px] text-accent font-medium">
            置信度 {candidate.confidence}%
          </span>
        </div>
        <button
          type="button"
          onClick={() => agentBus.dispatch("overlay_requested", { type: "person", id: candidate.personId })}
          className="font-serif text-[11.5px] text-ink-mute hover:text-accent transition-colors"
        >
          查看 {candidate.personName} 档案 ↗
        </button>
      </div>

      <div className="mt-3 space-y-2 text-[13px] leading-relaxed">
        <div>
          <span className="font-semibold text-ink">现象观察：</span>
          <span className="text-ink-soft">{candidate.observation}</span>
        </div>
        <div>
          <span className="font-semibold text-accent">提炼规律：</span>
          <span className="font-serif text-[13.5px] font-bold text-ink">{candidate.pattern}</span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-rule/50">
        {error && <span role="alert" className="text-vermilion">{error}</span>}
        {status === "pending" ? (
          <>
            <span className="font-mono text-[10.5px] text-ink-mute">
              由 AI 提前分析填充，确认后存入人物画像与世界模型
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleIgnore}
                className="border border-rule bg-paper px-3 py-1 font-serif text-[12px] text-ink-mute transition-colors hover:text-ink hover:bg-paper-deep"
              >
                ✕ 忽略
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirm}
                className="flex items-center gap-1.5 border border-accent bg-accent px-3 py-1 font-serif text-[12px] font-semibold text-paper shadow-2xs transition-all hover:bg-accent/90 disabled:opacity-50"
              >
                <Check className="size-3.5" />
                <span>{isSubmitting ? "存入中..." : "✓ 确认存入档案"}</span>
              </button>
            </div>
          </>
        ) : status === "confirmed" ? (
          <div className="flex items-center gap-2 font-serif text-[12.5px] font-semibold text-accent">
            <Check className="size-4 text-accent" />
            <span>✓ 已确认存入人物档案与世界模型库</span>
          </div>
        ) : (
          <div className="font-serif text-[12px] text-ink-mute">
            ✕ 已忽略，不录入档案
          </div>
        )}
      </div>
    </div>
  );
}
