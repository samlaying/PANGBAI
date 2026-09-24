import type { ArtifactType } from "@/lib/types";

export type MessagePart =
  | {
      type: "text";
      text: string;
      dropcap?: boolean;
      isQuote?: boolean;
      quoteLabel?: string;
    }
  | {
      type: "thinking";
      content: string;
      collapsed?: boolean;
    }
  | {
      type: "tool";
      toolCallId: string;
      name: string;
      input: Record<string, unknown>;
      output?: unknown;
      status: "running" | "done" | "error";
    }
  | {
      type: "artifact";
      artifactId?: string;
      title: string;
      artifactType: ArtifactType;
      content: string;
      frontmatter?: Record<string, unknown>;
      description?: string;
    }
  | {
      type: "memory_candidate";
      candidateId?: string;
      personId: string;
      personName: string;
      pattern: string;
      observation: string;
      confidence: number;
      targetScene?: string;
      status: "pending" | "confirmed" | "ignored";
    }
  | {
      type: "generative_ui";
      component: string;
      props: Record<string, unknown>;
    };

export interface AgentMessage {
  id: string;
  role: "user" | "assistant" | "system";
  timestamp: string;
  parts: MessagePart[];
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  feedback?: "helpful" | "unhelpful";
}
