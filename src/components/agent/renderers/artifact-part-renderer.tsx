"use client";

import { FileText } from "lucide-react";
import { canvasDocumentManager } from "@/business/entities/canvas-document";
import type { MessagePart } from "@/business/entities/message-part";

export function ArtifactPartRenderer({
  artifact,
}: {
  artifact: Extract<MessagePart, { type: "artifact" }>;
}) {
  const handleLoad = () => {
    canvasDocumentManager.openDoc({
      id: artifact.artifactId || crypto.randomUUID(),
      title: artifact.title,
      content: artifact.content,
      updatedAt: "刚刚",
    });
  };

  return (
    <div className="my-3 border border-ink/20 bg-paper-deep/70 p-4 sm:p-5 shadow-2xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rule pb-2.5">
        <div className="flex items-center gap-2">
          <span className="font-serif text-[14.5px] font-bold text-ink">
            {artifact.title}
          </span>
          <span className="border border-ink/20 bg-paper px-2 py-0.5 font-serif text-[10.5px] font-semibold text-ink">
            {artifact.artifactType === "prd" ? "PRD 需求骨架" : "方案架构"}
          </span>
        </div>
        <span className="font-mono text-[10px] text-ink-mute">
          已挂载 YAML Frontmatter
        </span>
      </div>

      {artifact.description && (
        <p className="mt-2.5 font-serif text-[13.5px] leading-relaxed text-ink-soft">
          {artifact.description}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-2">
        <span className="font-mono text-[10.5px] text-ink-mute">
          AI 已备齐大体架构，载入后可直观预览或微调细节
        </span>
        <button
          type="button"
          onClick={handleLoad}
          className="flex items-center gap-1.5 border border-accent bg-paper px-3.5 py-1.5 font-serif text-[12.5px] font-semibold text-accent shadow-2xs transition-all hover:bg-accent hover:text-paper"
        >
          <FileText className="size-3.5" strokeWidth={1.5} />
          <span>载入到 Canvas 补充细节 ↗</span>
        </button>
      </div>
    </div>
  );
}
