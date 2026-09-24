"use client";

import { Check, Loader2, AlertCircle, Wrench } from "lucide-react";
import type { MessagePart } from "@/business/entities/message-part";

export function ToolPartRenderer({
  tool,
}: {
  tool: Extract<MessagePart, { type: "tool" }>;
}) {
  return (
    <div className="my-2 border border-rule/70 bg-paper-deep/60 p-3 font-mono text-[12px] text-ink shadow-2xs">
      <div className="flex items-center justify-between gap-2 border-b border-rule/40 pb-2">
        <div className="flex items-center gap-2">
          <Wrench className="size-3.5 text-accent" />
          <span className="font-semibold text-ink">{tool.name}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px]">
          {tool.status === "running" && (
            <span className="flex items-center gap-1 text-accent">
              <Loader2 className="size-3 animate-spin" />
              执行中...
            </span>
          )}
          {tool.status === "done" && (
            <span className="flex items-center gap-1 text-ink-mute">
              <Check className="size-3 text-accent" />
              已完成
            </span>
          )}
          {tool.status === "error" && (
            <span className="flex items-center gap-1 text-vermilion">
              <AlertCircle className="size-3" />
              调用异常
            </span>
          )}
        </div>
      </div>

      <div className="mt-2 space-y-1 text-ink-soft">
        <div>
          <span className="text-ink-mute">入参：</span>
          <code>{JSON.stringify(tool.input)}</code>
        </div>
        {tool.output !== undefined && (
          <div className="mt-1 border-t border-rule/30 pt-1">
            <span className="text-ink-mute">结果：</span>
            <code>{typeof tool.output === "object" ? JSON.stringify(tool.output) : String(tool.output)}</code>
          </div>
        )}
      </div>
    </div>
  );
}
