"use client";

import { Drama } from "lucide-react";
import { GROWTH } from "@/lib/mock-data";
import { useUI } from "../ui-context";
import { Modal, ModalHeader } from "./modal";

/* 四轴雷达图（SVG） */
function Radar() {
  const cx = 130;
  const cy = 118;
  const R = 74;
  const axes = GROWTH.radar;
  const angles = [-90, 0, 90, 180];

  const pt = (r: number, deg: number) => {
    const a = (deg * Math.PI) / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as const;
  };
  const poly = (vals: number[]) =>
    vals.map((v, i) => pt((v / 5) * R, angles[i]).join(",")).join(" ");

  return (
    <svg viewBox="-36 0 332 240" className="mx-auto w-full max-w-[300px]" role="img" aria-label="能力雷达图">
      {/* 网格 */}
      {[1 / 3, 2 / 3, 1].map((f) => (
        <polygon
          key={f}
          points={poly(axes.map(() => 5 * f))}
          fill="none"
          stroke="var(--color-rule)"
          strokeWidth="1"
        />
      ))}
      {/* 轴线 */}
      {angles.map((a) => {
        const [x, y] = pt(R, a);
        return (
          <line
            key={a}
            x1={cx}
            y1={cy}
            x2={x}
            y2={y}
            stroke="var(--color-rule)"
            strokeWidth="1"
          />
        );
      })}
      {/* 上月（虚线） */}
      <polygon
        points={poly(axes.map((d) => d.prev))}
        fill="none"
        stroke="var(--color-ink-soft)"
        strokeWidth="1.75"
        strokeDasharray="5 4"
      />
      {/* 本月 */}
      <polygon
        points={poly(axes.map((d) => d.score))}
        fill="color-mix(in srgb, var(--color-accent) 16%, transparent)"
        stroke="var(--color-accent)"
        strokeWidth="1.5"
      />
      {/* 标签 */}
      {axes.map((d, i) => {
        const [x, y] = pt(R + 18, angles[i]);
        const anchor =
          angles[i] === 0 ? "start" : angles[i] === 180 ? "end" : "middle";
        return (
          <text
            key={d.label}
            x={x}
            y={y + 4}
            textAnchor={anchor}
            className="fill-ink"
            fontSize="12"
            fontFamily="var(--font-serif)"
          >
            {d.label}
          </text>
        );
      })}
    </svg>
  );
}

export function GrowthModal({ onClose }: { onClose: () => void }) {
  const ui = useUI();

  return (
    <Modal onClose={onClose} label="成长月报">
      <ModalHeader kicker="成长月报 · GROWTH REVIEW" onClose={onClose} />
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-serif text-[26px] font-black">这个月的你</h2>
        <span className="font-mono text-[10.5px] tracking-[0.08em] text-ink-mute">
          {GROWTH.period}
        </span>
      </div>

      <Radar />
      <div className="mt-1 flex justify-center gap-6 font-mono text-[10px] tracking-[0.1em] text-ink-mute">
        <span>┈┈ 上月</span>
        <span className="text-accent">── 本月</span>
      </div>

      {/* 亮点 */}
      <section className="mt-6">
        <div className="kicker mb-3">亮点 · HIGHLIGHTS</div>
        <ul className="space-y-2.5">
          {GROWTH.highlights.map((h) => (
            <li key={h} className="flex items-baseline gap-3">
              <span className="mt-[7px] size-[6px] shrink-0 rounded-full bg-accent" />
              <span className="font-serif text-[14px] leading-relaxed text-ink-soft">
                {h}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* 待改进 */}
      <section className="mt-6">
        <div className="kicker mb-3">待改进 · TO IMPROVE</div>
        <ul className="space-y-2.5">
          {GROWTH.improve.map((it) => (
            <li key={it.text} className="flex items-baseline gap-3">
              <span
                className={`mt-[7px] size-[6px] shrink-0 rounded-full ${
                  it.level === "bad" ? "bg-vermilion" : "bg-gold"
                }`}
              />
              <span className="font-serif text-[14px] leading-relaxed text-ink-soft">
                {it.text}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* 下月练习 */}
      <section className="mt-6 border border-rule bg-paper-warm px-5 py-5">
        <div className="kicker mb-2">下月练习 · PRACTICE</div>
        <h3 className="font-serif text-[16px] font-bold">{GROWTH.practice.title}</h3>
        <p className="mt-1 text-[13px] text-ink-soft">{GROWTH.practice.desc}</p>
        <button
          type="button"
          onClick={() => {
            onClose();
            ui.startRehearsal();
          }}
          className="mt-4 inline-flex items-center gap-2 border border-ink/25 px-4 py-[7px] font-serif text-[13.5px] transition-colors hover:border-ink hover:bg-ink hover:text-paper"
        >
          <Drama className="size-4" strokeWidth={1.5} />
          开始演练
        </button>
      </section>
    </Modal>
  );
}
