"use client";

import { useState, useRef } from "react";
import { AuthModal } from "./auth-modal";
import { ArrowRight, Sparkles, Shield, GitCommit, FileText, Pause, Play } from "lucide-react";

export function LandingPage({
  onEnterWorkbench,
}: {
  onEnterWorkbench: (initialQuery?: string) => void;
}) {
  const [authOpen, setAuthOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    onEnterWorkbench(prompt);
  };

  return (
    <div className="relative min-h-screen w-full bg-[#1c1917] text-[#faf8f2] selection:bg-[#2d6a4f]/40 selection:text-[#faf8f2]">
      {/* ─────────────────────────────────────────────────────────────
          第一屏 HERO WORLD (Full Viewport Video Layer + Editorial Scrim)
          严格遵循 chengfeng-landingpage 规范
      ────────────────────────────────────────────────────────────── */}
      <section className="relative flex min-h-screen w-full flex-col justify-between overflow-hidden">
        {/* 底层：自适应视频世界 */}
        <div className="absolute inset-0 z-0">
          <video
            ref={videoRef}
            src="/media/landing/hero-bg.mp4"
            poster="/media/landing/hero-start.png"
            autoPlay
            loop
            muted
            playsInline
            className="h-full w-full object-cover object-center filter brightness-[0.92] contrast-[1.04]"
          />
          {/* 大气对比度渐变遮罩 (Scrim & Paper Vignette) */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#1c1917]/95 via-[#1c1917]/70 to-[#1c1917]/30 sm:to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1c1917] via-transparent to-[#1c1917]/70" />
        </div>

        {/* 顶部刊物导航栏 (Live DOM Masthead) */}
        <header className="relative z-10 mx-auto flex w-full max-w-[1400px] items-center justify-between px-6 py-6 sm:px-10 sm:py-8">
          <div className="flex items-baseline gap-3">
            <span className="font-serif text-[22px] sm:text-[26px] font-black tracking-[0.08em] text-[#faf8f2]">
              旁白 · PANGBAI
            </span>
            <span className="hidden font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#e0dac8]/70 sm:inline-block">
              AI 职场评论员 · 局外军师
            </span>
          </div>

          <nav className="flex items-center gap-4 sm:gap-6">
            <a
              href="#metaphor"
              className="hidden font-serif text-[13.5px] text-[#e0dac8]/80 transition-colors hover:text-[#faf8f2] md:inline-block"
            >
              博弈洞察
            </a>
            <a
              href="#causality"
              className="hidden font-serif text-[13.5px] text-[#e0dac8]/80 transition-colors hover:text-[#faf8f2] md:inline-block"
            >
              因果证据链
            </a>
            <a
              href="#canvas"
              className="hidden font-serif text-[13.5px] text-[#e0dac8]/80 transition-colors hover:text-[#faf8f2] md:inline-block"
            >
              活文档协同
            </a>

            <button
              type="button"
              onClick={() => setAuthOpen(true)}
              className="border border-[#e0dac8]/30 px-3.5 py-1.5 font-serif text-[13px] text-[#faf8f2] transition-colors hover:border-[#faf8f2] hover:bg-[#faf8f2]/10"
            >
              登录
            </button>

            <button
              type="button"
              onClick={() => onEnterWorkbench()}
              className="flex items-center gap-2 border border-[#2d6a4f] bg-[#2d6a4f] px-4 py-1.5 font-serif text-[13px] font-medium text-[#faf8f2] shadow-sm transition-all hover:bg-[#234f3b] hover:border-[#234f3b]"
            >
              进入工作台
              <ArrowRight className="size-3.5" />
            </button>
          </nav>
        </header>

        {/* 核心价值张力文案 (Hero Typography Group) */}
        <div className="relative z-10 mx-auto my-auto w-full max-w-[1400px] px-6 sm:px-10">
          <div className="max-w-[720px] space-y-6">
            {/* 眉标 Eyebrow */}
            <div className="inline-flex items-center gap-2 border border-[#e0dac8]/25 bg-[#1c1917]/60 px-3 py-1 backdrop-blur-sm">
              <span className="size-1.5 rounded-full bg-[#bc4327] animate-pulse" />
              <span className="font-mono text-[11px] tracking-[0.1em] text-[#e0dac8]">
                专为产品经理与职场实干者打造的局外军师
              </span>
            </div>

            {/* 主标题 Headline (严格遵循两行语义断句，行高 1.22) */}
            <h1 className="font-serif text-[38px] sm:text-[54px] lg:text-[60px] font-black leading-[1.22] tracking-[0.01em] text-[#faf8f2]">
              <span>在复杂的职场博弈中，</span>
              <br />
              <span className="text-[#f1ede1]">做你最清醒的旁白。</span>
            </h1>

            {/* 副标题 Supporting Copy (单句精炼，行高 1.85) */}
            <p className="font-serif text-[15.5px] sm:text-[17px] leading-[1.85] text-[#e0dac8]/90 max-w-[28em]">
              不讲空洞鸡汤，像懂人性的军师一样帮你看懂干系人潜台词，用事实因果破除内耗，将混乱冲突转化为可落地的破局方案。
            </p>

            {/* 行动入口 Action Group */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <button
                type="button"
                onClick={() => onEnterWorkbench()}
                className="group flex items-center justify-center gap-3 border border-[#2d6a4f] bg-[#2d6a4f] px-7 py-3.5 font-serif text-[15.5px] font-semibold text-[#faf8f2] shadow-lg transition-all hover:bg-[#234f3b] hover:shadow-xl active:translate-y-0.5"
              >
                开启工作台 · 体验破局
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </button>

              <button
                type="button"
                onClick={() => setAuthOpen(true)}
                className="flex items-center justify-center gap-2 border border-[#e0dac8]/30 bg-[#1c1917]/40 px-6 py-3.5 font-serif text-[14.5px] text-[#e0dac8] backdrop-blur-sm transition-colors hover:border-[#faf8f2] hover:text-[#faf8f2]"
              >
                注册专属席位
              </button>
            </div>

            {/* 互动试探微提示 State / Interaction Cue */}
            <div className="pt-4">
              <button
                type="button"
                onClick={() => handleQuickPrompt("王总在群里当众催排期，如何体面破局？")}
                className="group inline-flex items-center gap-2.5 border border-[#e0dac8]/20 bg-[#1c1917]/70 px-4 py-2 text-left backdrop-blur-md transition-all hover:border-[#bc4327]/60 hover:bg-[#1c1917]/90"
              >
                <Sparkles className="size-3.5 text-[#bc4327] shrink-0" />
                <span className="font-serif text-[13px] text-[#e0dac8]/90 group-hover:text-[#faf8f2]">
                  试着问旁白：“王总在群里当众催排期，如何体面破局？”
                </span>
                <span className="font-mono text-[11px] text-[#bc4327] group-hover:translate-x-0.5 transition-transform">
                  ➔
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* 首屏底栏：视频播放状态控制与卷期标记 */}
        <footer className="relative z-10 mx-auto flex w-full max-w-[1400px] items-center justify-between px-6 py-6 sm:px-10 font-mono text-[10.5px] text-[#e0dac8]/60">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={togglePlay}
              aria-label={isPlaying ? "暂停背景动态" : "播放背景动态"}
              className="flex items-center gap-1.5 border border-[#e0dac8]/20 px-2.5 py-1 transition-colors hover:border-[#e0dac8]/50 hover:text-[#faf8f2]"
            >
              {isPlaying ? <Pause className="size-3" /> : <Play className="size-3" />}
              <span>{isPlaying ? "晨光破局 · 循环微动" : "动态已暂停"}</span>
            </button>
            <span className="hidden sm:inline-block">1080P CINEMATIC HEROWORLD</span>
          </div>

          <div className="flex items-center gap-4">
            <span>知人性 · 明因果 · 谋定而后动</span>
            <span className="hidden sm:inline-block text-[#bc4327]">【旁白核印】</span>
          </div>
        </footer>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          第二屏：核心能力与视觉隐喻 (The Three Pillars)
      ────────────────────────────────────────────────────────────── */}
      <section id="metaphor" className="relative border-t border-[#e0dac8]/15 bg-[#1c1917] px-6 py-24 sm:px-10">
        <div className="mx-auto max-w-[1200px]">
          <div className="max-w-[680px] space-y-3">
            <div className="font-mono text-[11px] tracking-[0.14em] text-[#bc4327]">
              核心推演架构 · THE CAUSAL ARCHITECTURE
            </div>
            <h2 className="font-serif text-[32px] sm:text-[40px] font-bold leading-tight text-[#faf8f2]">
              不是千篇一律的通用对话，
              <br />
              而是懂博弈深度的军师智库。
            </h2>
            <p className="font-serif text-[15px] leading-relaxed text-[#e0dac8]/80">
              把每一次模糊的沟通，拆解为因果三元组：因为什么事（Event）➔ 做了什么判断（Rationale）➔ 沉淀为什么模式（Pattern）。
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3">
            {/* 卡片 1 */}
            <div id="causality" className="border border-[#e0dac8]/20 bg-[#25221e] p-8 space-y-4 transition-all hover:border-[#2d6a4f]">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[12px] text-[#bc4327]">01 / CAUSALITY</span>
                <Shield className="size-5 text-[#2d6a4f]" strokeWidth={1.5} />
              </div>
              <h3 className="font-serif text-[20px] font-bold text-[#faf8f2]">
                因果溯源与引经据典
              </h3>
              <p className="font-serif text-[13.5px] leading-[1.8] text-[#e0dac8]/80">
                不再凭空推断。对话中实时穿透引用历史事件标签与真实凭证，点击超链接即可唤起证据链条，掌握来龙去脉。
              </p>
              <div className="pt-2 font-mono text-[11px] text-[#e0dac8]/50">
                支持 [王总](person:id) 与 [7月8日会议](evidence:id)
              </div>
            </div>

            {/* 卡片 2 */}
            <div className="border border-[#e0dac8]/20 bg-[#25221e] p-8 space-y-4 transition-all hover:border-[#2d6a4f]">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[12px] text-[#bc4327]">02 / STAKEHOLDERS</span>
                <GitCommit className="size-5 text-[#2d6a4f]" strokeWidth={1.5} />
              </div>
              <h3 className="font-serif text-[20px] font-bold text-[#faf8f2]">
                活体干系人模式演进
              </h3>
              <p className="font-serif text-[13.5px] leading-[1.8] text-[#e0dac8]/80">
                随对话推进，人物档案模式置信度实时微调计算，记录最新观察时间与因果归因，生成组织协作矩阵。
              </p>
              <div className="pt-2 font-mono text-[11px] text-[#e0dac8]/50">
                置信标尺 · 证据链展开 · 针对性破局话术
              </div>
            </div>

            {/* 卡片 3 */}
            <div id="canvas" className="border border-[#e0dac8]/20 bg-[#25221e] p-8 space-y-4 transition-all hover:border-[#2d6a4f]">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[12px] text-[#bc4327]">03 / LIVING CANVAS</span>
                <FileText className="size-5 text-[#2d6a4f]" strokeWidth={1.5} />
              </div>
              <h3 className="font-serif text-[20px] font-bold text-[#faf8f2]">
                双线协作 Canvas 活文档
              </h3>
              <p className="font-serif text-[13.5px] leading-[1.8] text-[#e0dac8]/80">
                对话区聊策略，右侧 Canvas 实时生成 PRD、排期对齐方案与复盘框架，标准 YAML 自动解析入库，边聊边写。
              </p>
              <div className="pt-2 font-mono text-[11px] text-[#e0dac8]/50">
                大纲 TOC 索引 · 极低 Token 组装 · 即时导出
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          第三屏：报刊格言与底部行动呼吁 (Editorial Footer CTA)
      ────────────────────────────────────────────────────────────── */}
      <section className="relative border-t border-[#e0dac8]/15 bg-[#171412] px-6 py-20 sm:px-10 text-center">
        <div className="mx-auto max-w-[700px] space-y-6">
          <blockquote className="font-serif text-[22px] sm:text-[28px] font-bold italic leading-relaxed text-[#faf8f2]">
            &ldquo;局中人，需有局外之智。看清局，才能走出局；看透人，才能不困于人。&rdquo;
          </blockquote>

          <p className="font-serif text-[14px] text-[#e0dac8]/70">
            旁白现已支持项目级会话持久化、干系人因果推断与行业风格深度定制。
          </p>

          <div className="pt-4">
            <button
              type="button"
              onClick={() => onEnterWorkbench()}
              className="inline-flex items-center gap-3 border border-[#2d6a4f] bg-[#2d6a4f] px-8 py-3.5 font-serif text-[15px] font-semibold text-[#faf8f2] shadow-lg transition-all hover:bg-[#234f3b]"
            >
              立即进入旁白工作台
              <ArrowRight className="size-4" />
            </button>
          </div>
        </div>

        <div className="mt-16 border-t border-[#e0dac8]/10 pt-8 font-mono text-[11px] text-[#e0dac8]/40 flex flex-col sm:flex-row items-center justify-between gap-4 max-w-[1200px] mx-auto">
          <span>© 2026 PANGBAI · 旁白 ALL RIGHTS RESERVED</span>
          <span>BROADSHEET EDITORIAL INTELLIGENCE SYSTEM</span>
        </div>
      </section>

      {/* 登录/注册认证弹窗 */}
      {authOpen && (
        <AuthModal
          onClose={() => setAuthOpen(false)}
          onSuccess={() => {
            setAuthOpen(false);
            onEnterWorkbench();
          }}
        />
      )}
    </div>
  );
}
