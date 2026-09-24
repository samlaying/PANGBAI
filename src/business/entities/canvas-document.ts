import { agentBus } from "../bus/agent-bus";
import { workspaceManager } from "./workspace-manager";

export interface CanvasDoc {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
}

/**
 * CanvasDocument
 * 业务实体层：管理右侧 Canvas 活文档与产物状态。
 */
export class CanvasDocumentManager {
  public currentDoc: CanvasDoc | null = null;
  public activeProjectId?: string;

  constructor() {
    agentBus.on("canvas_close_requested", () => this.closeDoc());
    agentBus.on("canvas_open_requested", (request) => {
      this.currentDoc = {
        id: crypto.randomUUID(),
        title: request.title,
        content: request.content,
        updatedAt: "刚刚",
      };
      this.activeProjectId = request.projectId;
      this.notify("doc_opened", this.currentDoc);
    });
  }

  openDoc(doc: CanvasDoc, projectId?: string): void {
    this.currentDoc = doc;
    this.activeProjectId = projectId;
    this.notify("doc_opened", this.currentDoc);
  }

  createDraft(title = "未命名文档.md", projectId?: string): void {
    this.currentDoc = {
      id: crypto.randomUUID(),
      title,
      content: `# ${title}\n`,
      updatedAt: "刚刚",
    };
    this.activeProjectId = projectId;
    this.notify("doc_opened", this.currentDoc);
  }

  updateContent(content: string): void {
    if (!this.currentDoc) return;
    this.currentDoc = {
      ...this.currentDoc,
      content,
      updatedAt: "刚刚",
    };
    this.notify("doc_updated", this.currentDoc);
  }

  async save(): Promise<void> {
    if (!this.currentDoc) return;
    if (!this.activeProjectId) {
      throw new Error("请先选择关联项目后再保存产物");
    }
    const doc = this.currentDoc;
    const projectId = this.activeProjectId;

    const isPersisted = workspaceManager.projects.some(
      (project) => project.id === projectId && project.artifacts?.some((artifact) => artifact.id === doc.id),
    );
    const artifact = await workspaceManager.saveArtifact({
      id: isPersisted ? doc.id : undefined,
      projectId,
      title: doc.title,
      content: doc.content,
    });

    if (this.currentDoc?.id === doc.id) {
      this.currentDoc = {
        ...this.currentDoc,
        id: artifact.id,
        title: artifact.title,
        updatedAt: artifact.updatedAt,
      };
      this.notify("doc_saved", this.currentDoc);
    }
  }

  closeDoc(): void {
    this.currentDoc = null;
    this.notify("doc_closed", null);
  }

  private notify(action: "doc_opened" | "doc_updated" | "doc_closed" | "doc_saved", payload?: unknown) {
    agentBus.dispatch("canvas_changed", { action, payload });
  }
}

export const canvasDocumentManager = new CanvasDocumentManager();
