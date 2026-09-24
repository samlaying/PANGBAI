"use client";

import { useState } from "react";
import { ChevronDown, Download, PencilLine, Trash2 } from "lucide-react";
import { SectionTitle, Toggle, GhostButton } from "../atoms";
import { PanelBody, PanelHeader } from "./side-panel";

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-rule py-3 last:border-0">
      <div>
        <div className="font-serif text-[14px]">{label}</div>
        {hint && <div className="mt-0.5 text-[11.5px] text-ink-mute">{hint}</div>}
      </div>
      {children}
    </div>
  );
}

export function SettingsPanel() {
  const [autoEvent, setAutoEvent] = useState(true);
  const [reflection, setReflection] = useState(true);
  const [meetRemind, setMeetRemind] = useState(true);
  const [riskWarn, setRiskWarn] = useState(true);
  const [todoRemind, setTodoRemind] = useState(true);
  const [relRemind, setRelRemind] = useState(false);

  return (
    <>
      <PanelHeader kicker="设置 · PREFERENCES">
        <h2 className="font-serif text-[26px] font-black tracking-[0.04em]">设置</h2>
      </PanelHeader>

      <PanelBody>
        {/* 我 */}
        <section className="space-y-3">
          <SectionTitle>我 · PROFILE</SectionTitle>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-serif text-[16px] font-bold">个人资料未设置</div>
              <div className="mt-0.5 text-[12px] text-ink-mute">本地工作区</div>
            </div>
            <GhostButton>
              <PencilLine className="size-3.5" strokeWidth={1.5} />
              编辑资料
            </GhostButton>
          </div>
        </section>

        {/* 记忆 */}
        <section>
          <SectionTitle>记忆 · MEMORY</SectionTitle>
          <div className="mt-3">
            <Row label="自动记录事件" hint="对话中的工作事件自动写入事件簿">
              <Toggle on={autoEvent} onClick={() => setAutoEvent(!autoEvent)} />
            </Row>
            <Row label="Reflection 自动运行" hint="定期从事件提炼证据与画像">
              <Toggle on={reflection} onClick={() => setReflection(!reflection)} />
            </Row>
            <Row label="重要度阈值" hint="低于阈值不入长期记忆">
              <span className="font-mono text-[12px] tracking-[0.2em] text-gold">
                ★★★☆☆
              </span>
            </Row>
            <Row label="记忆保留">
              <span className="font-mono text-[11px] text-ink-soft">6 个月</span>
            </Row>
          </div>
        </section>

        {/* 通知 */}
        <section>
          <SectionTitle>通知 · NOTICES</SectionTitle>
          <div className="mt-3">
            <Row label="会议提醒">
              <Toggle on={meetRemind} onClick={() => setMeetRemind(!meetRemind)} />
            </Row>
            <Row label="风险预警">
              <Toggle on={riskWarn} onClick={() => setRiskWarn(!riskWarn)} />
            </Row>
            <Row label="待办提醒">
              <Toggle on={todoRemind} onClick={() => setTodoRemind(!todoRemind)} />
            </Row>
            <Row label="关系提醒" hint="长时间未互动的重要关系">
              <Toggle on={relRemind} onClick={() => setRelRemind(!relRemind)} />
            </Row>
            <Row label="静默时间">
              <span className="font-mono text-[11px] text-ink-soft">21:00 – 9:00</span>
            </Row>
          </div>
        </section>

        {/* 模型 */}
        <section>
          <SectionTitle>模型 · MODEL</SectionTitle>
          <div className="mt-3">
            <Row label="当前模型" hint="可切换 DeepSeek / Claude / GPT / Qwen">
              <button
                type="button"
                className="flex items-center gap-1.5 border border-rule px-3 py-1.5 font-serif text-[13px] transition-colors hover:border-ink"
              >
                DeepSeek
                <ChevronDown className="size-3.5 text-ink-mute" strokeWidth={1.5} />
              </button>
            </Row>
          </div>
        </section>

        {/* 数据 */}
        <section className="space-y-3">
          <SectionTitle>数据 · DATA</SectionTitle>
          <div className="flex gap-2.5">
            <GhostButton className="flex-1">
              <Download className="size-3.5" strokeWidth={1.5} />
              导出记忆
            </GhostButton>
            <GhostButton className="flex-1">
              <Download className="size-3.5" strokeWidth={1.5} />
              导出事件
            </GhostButton>
          </div>
        </section>

        {/* 危险 */}
        <section className="space-y-3">
          <SectionTitle>
            <span className="text-vermilion">危险区 · DANGER</span>
          </SectionTitle>
          <button
            type="button"
            className="flex w-full items-center justify-center gap-2 border border-vermilion/50 py-2.5 font-serif text-[13px] text-vermilion transition-colors hover:bg-vermilion hover:text-paper"
          >
            <Trash2 className="size-4" strokeWidth={1.5} />
            清空全部记忆
          </button>
        </section>
      </PanelBody>
    </>
  );
}
