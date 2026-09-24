/**
 * AgentBus
 * 系统级类型安全事件总线 (Event Bus)
 * 遵循原则 ③：解决下层（业务实体/底层通讯）向绝对上层（UI）的解耦通信。
 * 发送方不关心谁接收，接收方不关心谁发送。
 */

export type BusEventMap = {
  session_changed: {
    sessionId: string;
    action: "message_added" | "part_updated" | "part_added" | "run_finished" | "error";
    payload?: unknown;
  };
  workspace_changed: {
    action: "people_updated" | "projects_updated" | "artifact_updated";
    payload?: unknown;
  };
  canvas_changed: {
    action: "doc_opened" | "doc_updated" | "doc_closed" | "doc_saved";
    payload?: unknown;
  };
  canvas_open_requested: {
    title: string;
    content: string;
    projectId?: string;
  };
  canvas_close_requested: Record<string, never>;
  overlay_requested: {
    type: "person" | "project" | "evidence" | "growth" | "meeting" | "settings";
    id?: string;
  };
};

export type BusEventHandler<T> = (data: T) => void;

export class AgentBus {
  private listeners: Map<keyof BusEventMap, Set<BusEventHandler<unknown>>> = new Map();

  on<K extends keyof BusEventMap>(event: K, handler: BusEventHandler<BusEventMap[K]>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    const set = this.listeners.get(event)!;
    set.add(handler as BusEventHandler<unknown>);

    return () => {
      set.delete(handler as BusEventHandler<unknown>);
    };
  }

  dispatch<K extends keyof BusEventMap>(event: K, data: BusEventMap[K]): void {
    const set = this.listeners.get(event);
    if (!set || set.size === 0) return;

    for (const handler of set) {
      try {
        handler(data);
      } catch (err) {
        console.error(`AgentBus handler error on event "${event}":`, err);
      }
    }
  }
}

export const agentBus = new AgentBus();
