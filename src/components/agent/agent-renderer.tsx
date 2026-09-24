"use client";

import type { MessagePart } from "@/business/entities/message-part";
import { TextPartRenderer } from "./renderers/text-part-renderer";
import { ToolPartRenderer } from "./renderers/tool-part-renderer";
import { ArtifactPartRenderer } from "./renderers/artifact-part-renderer";
import { MemoryPartRenderer } from "./renderers/memory-part-renderer";
import { GenerativeUIRenderer } from "./renderers/generative-ui-renderer";

export function AgentRenderer({ parts }: { parts: MessagePart[] }) {
  if (!parts || parts.length === 0) return null;

  return (
    <div className="space-y-3">
      {parts.map((part, index) => {
        switch (part.type) {
          case "text":
            return (
              <TextPartRenderer
                key={index}
                text={part.text}
                dropcap={part.dropcap}
                isQuote={part.isQuote}
                quoteLabel={part.quoteLabel}
              />
            );
          case "thinking":
            return (
              <details
                key={index}
                className="my-2 border-l border-rule/60 pl-3 font-mono text-[11.5px] text-ink-mute"
              >
                <summary className="cursor-pointer select-none text-[11px] text-accent/70 hover:text-accent">
                  🧠 旁白思考链 (点击展开)
                </summary>
                <p className="mt-1 whitespace-pre-wrap">{part.content}</p>
              </details>
            );
          case "tool":
            return <ToolPartRenderer key={part.toolCallId || index} tool={part} />;
          case "artifact":
            return <ArtifactPartRenderer key={part.artifactId || index} artifact={part} />;
          case "memory_candidate":
            return <MemoryPartRenderer key={part.candidateId || index} candidate={part} />;
          case "generative_ui":
            return (
              <GenerativeUIRenderer
                key={index}
                type="generative_ui"
                component={part.component}
                props={part.props}
              />
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
