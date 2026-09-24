"use client";

import { useState } from "react";
import { Modal, ModalHeader } from "../modals/modal";
import { SolidButton, GhostButton } from "../atoms";
import { Lock, Mail, User, ArrowRight } from "lucide-react";

export function AuthModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // 模拟或真实接入 Supabase Auth，体验模式直接放行
    setTimeout(() => {
      setLoading(false);
      onSuccess();
    }, 400);
  };

  return (
    <Modal onClose={onClose} label={mode === "login" ? "登录旁白" : "注册账号"}>
      <ModalHeader
        kicker={mode === "login" ? "身份印证 · SIGN IN" : "开启席位 · REGISTER"}
        onClose={onClose}
      />

      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="stamp">局外军师</span>
            <span className="font-mono text-[10.5px] text-ink-mute">PANGBAI AUTH</span>
          </div>
          <h2 className="mt-2 font-serif text-[24px] font-black leading-snug tracking-[0.02em] text-ink">
            {mode === "login" ? "欢迎回到旁白" : "成为掌握全局的局中人"}
          </h2>
          <p className="mt-1 font-serif text-[13px] leading-relaxed text-ink-soft">
            {mode === "login"
              ? "登录以同步你的项目空间、干系人因果证据库与活文档。"
              : "开启你的专属 AI 职场智库，让每一次决策都有据可循。"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === "register" && (
            <div className="space-y-1">
              <label className="flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.08em] text-ink-mute">
                <User className="size-3" /> 称谓 / 昵称
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：林工 / Alex"
                className="w-full border border-rule bg-paper px-3 py-2 font-serif text-[13.5px] text-ink outline-none transition-colors focus:border-ink"
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.08em] text-ink-mute">
              <Mail className="size-3" /> 工作邮箱
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="w-full border border-rule bg-paper px-3 py-2 font-serif text-[13.5px] text-ink outline-none transition-colors focus:border-ink"
            />
          </div>

          <div className="space-y-1">
            <label className="flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.08em] text-ink-mute">
              <Lock className="size-3" /> 密码
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full border border-rule bg-paper px-3 py-2 font-serif text-[13.5px] text-ink outline-none transition-colors focus:border-ink"
            />
          </div>

          <div className="pt-2 space-y-2.5">
            <SolidButton type="submit" className="w-full py-3">
              {loading ? "印证中..." : mode === "login" ? "登录并进入工作台" : "创建账号并开启"}
              <ArrowRight className="size-4" />
            </SolidButton>

            <GhostButton
              type="button"
              className="w-full py-2.5 text-center justify-center font-serif text-[12.5px] text-ink-mute hover:text-ink"
              onClick={onSuccess}
            >
              跳过登录 · 以本地访客身份直接体验 ➔
            </GhostButton>
          </div>
        </form>

        <div className="border-t border-rule pt-4 text-center">
          {mode === "login" ? (
            <p className="font-serif text-[12.5px] text-ink-soft">
              尚未建立席位？{" "}
              <button
                type="button"
                onClick={() => setMode("register")}
                className="font-semibold text-accent hover:underline"
              >
                立即注册
              </button>
            </p>
          ) : (
            <p className="font-serif text-[12.5px] text-ink-soft">
              已有席位账号？{" "}
              <button
                type="button"
                onClick={() => setMode("login")}
                className="font-semibold text-accent hover:underline"
              >
                直接登录
              </button>
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}
