"use client";

import { useState } from "react";
import { Modal, ModalHeader } from "./modal";
import { SolidButton } from "../atoms";
import {
  INDUSTRY_OPTIONS,
  COACHING_STYLE_OPTIONS,
  DEFAULT_WORKSPACE_PROFILE,
  type WorkspaceProfile,
  type IndustryKey,
  type CoachingStyleKey,
} from "@/config/workspace-profile";
import { clientStorage } from "@/infra/storage/client-storage";
import { agentBus } from "@/business/bus/agent-bus";
import { Sparkles, Check, Building2, UserCircle2 } from "lucide-react";

export function OnboardingModal({
  onClose,
  initialProfile,
}: {
  onClose: () => void;
  initialProfile?: WorkspaceProfile;
}) {
  const current = initialProfile || clientStorage.getItem("workspace_profile", DEFAULT_WORKSPACE_PROFILE);

  const [name, setName] = useState(current.name || "我的工作区");
  const [industry, setIndustry] = useState<IndustryKey>(current.industry || "internet_saas");
  const [style, setStyle] = useState<CoachingStyleKey>(current.style || "strategic");

  const handleSave = () => {
    const updated: WorkspaceProfile = {
      name: name.trim() || "我的工作区",
      industry,
      style,
      isInitialized: true,
    };
    clientStorage.setItem("workspace_profile", updated);
    agentBus.dispatch("workspace_changed", { action: "profile_updated", payload: updated });
    onClose();
  };

  return (
    <Modal onClose={onClose} label="工作区基调初始化">
      <ModalHeader kicker="工作台基调设定 · INITIALIZE" onClose={onClose} />

      <div className="space-y-6">
        <div>
          <h2 className="font-serif text-[24px] font-black leading-snug tracking-[0.02em] text-ink">
            定制你的旁白工作基因
          </h2>
          <p className="mt-1.5 font-serif text-[13px] leading-relaxed text-ink-soft">
            名称、辅导风格与所属行业将深度融入大模型 Harness 上下文，赋予旁白最懂你业务语境的破局视角。
          </p>
        </div>

        {/* 1. 名称 */}
        <div className="space-y-2">
          <label className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-mute">
            <UserCircle2 className="size-3.5" />
            空间名称 / 你的称谓代号
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例如：核心业务产研组 / 林工"
            className="w-full border border-rule bg-paper px-3 py-2 font-serif text-[14px] text-ink outline-none transition-colors focus:border-ink"
          />
        </div>

        {/* 2. 辅导风格 */}
        <div className="space-y-2.5">
          <label className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-mute">
            <Sparkles className="size-3.5 text-accent" />
            旁白辅导风格 · COACHING STYLE
          </label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {COACHING_STYLE_OPTIONS.map((item) => {
              const selected = style === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setStyle(item.key)}
                  className={`flex flex-col items-start justify-between border p-3 text-left transition-all ${
                    selected
                      ? "border-accent bg-paper-warm shadow-sm"
                      : "border-rule bg-paper hover:border-ink/40"
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="font-serif text-[14px] font-bold text-ink">
                      {item.label}
                    </span>
                    {selected && <Check className="size-3.5 text-accent" strokeWidth={2.5} />}
                  </div>
                  <span className="mt-0.5 font-mono text-[9px] tracking-[0.08em] text-ink-mute">
                    {item.enLabel}
                  </span>
                  <p className="mt-1.5 line-clamp-2 text-[11.5px] leading-relaxed text-ink-soft">
                    {item.desc}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. 业务行业 */}
        <div className="space-y-2.5">
          <label className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-mute">
            <Building2 className="size-3.5" />
            业务所属行业 · INDUSTRY CONTEXT
          </label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {INDUSTRY_OPTIONS.map((item) => {
              const selected = industry === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setIndustry(item.key)}
                  className={`flex flex-col items-start justify-between border p-2.5 text-left transition-all ${
                    selected
                      ? "border-accent bg-paper-warm"
                      : "border-rule bg-paper hover:border-ink/40"
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="font-serif text-[13px] font-semibold text-ink">
                      {item.label}
                    </span>
                    {selected && <Check className="size-3 text-accent" strokeWidth={2.5} />}
                  </div>
                  <p className="mt-1 text-[11px] leading-snug text-ink-mute">
                    {item.desc}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* 确认提交 */}
        <div className="pt-2">
          <SolidButton className="w-full py-3" onClick={handleSave}>
            保存设定 · 进入工作区
          </SolidButton>
        </div>
      </div>
    </Modal>
  );
}
