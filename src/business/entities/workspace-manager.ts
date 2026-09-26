import { agentBus } from "../bus/agent-bus";
import { workspaceApi, type ConfirmMemoryParams, type CreatePersonParams, type CreateProjectParams, type CreateEventParams, type SaveArtifactParams } from "@/infra/api/workspace-api";
import { clientStorage } from "@/infra/storage/client-storage";
import { DEFAULT_WORKSPACE_PROFILE, type WorkspaceProfile } from "@/config/workspace-profile";
import type { Person, Project, ProjectArtifact, WorkspaceEvent } from "@/lib/types";

/** 偏好候选在人物世界模型中的宿主档案 ID（与后端 workplace-crm-worker 保持一致） */
const USER_SELF_PERSON_ID = "user_self";
/** coachingNotes 上限，超出后丢弃最旧的 */
const COACHING_NOTES_LIMIT = 8;

/**
 * WorkspaceManager
 * 业务实体层：负责管理世界模型档案（人物、项目、产物、事实事件与记忆沉淀）。
 * 遵循原则 ②⑤：只调用底层 API，向 Event Bus 广播变更，绝不知晓 UI 组件。
 */
export class WorkspaceManager {
  public people: Person[] = [];
  public projects: Project[] = [];
  public events: WorkspaceEvent[] = [];
  public isLoading: boolean = false;

  async init(): Promise<void> {
    if (this.isLoading) return;
    this.isLoading = true;
    try {
      const results = await Promise.allSettled([
        workspaceApi.getPeople(),
        workspaceApi.getProjects(),
        workspaceApi.getEvents(),
      ]);

      const [peopleResult, projectsResult, eventsResult] = results;

      if (peopleResult.status === "fulfilled") {
        this.people = peopleResult.value;
        this.notify("people_updated", this.people);
      } else {
        console.warn("WorkspaceManager init: getPeople failed:", peopleResult.reason);
      }

      if (projectsResult.status === "fulfilled") {
        this.projects = projectsResult.value;
        this.notify("projects_updated", this.projects);
      } else {
        console.warn("WorkspaceManager init: getProjects failed:", projectsResult.reason);
      }

      if (eventsResult.status === "fulfilled") {
        this.events = eventsResult.value;
        this.notify("events_updated", this.events);
      } else {
        console.warn("WorkspaceManager init: getEvents failed:", eventsResult.reason);
      }
    } catch (error) {
      console.error("WorkspaceManager init failed:", error);
    } finally {
      this.isLoading = false;
    }
  }

  async refreshPeople(): Promise<void> {
    try {
      const people = await workspaceApi.getPeople();
      this.people = people;
      this.notify("people_updated", this.people);
    } catch (error) {
      console.error("WorkspaceManager refreshPeople failed:", error);
    }
  }

  async refreshProjects(): Promise<void> {
    try {
      const projects = await workspaceApi.getProjects();
      this.projects = projects;
      this.notify("projects_updated", this.projects);
    } catch (error) {
      console.error("WorkspaceManager refreshProjects failed:", error);
    }
  }

  async addPerson(params: CreatePersonParams): Promise<Person> {
    const person = await workspaceApi.createPerson(params);
    this.people = [...this.people, person];
    this.notify("people_updated", this.people);
    return person;
  }

  async addProject(params: CreateProjectParams): Promise<Project> {
    const project = await workspaceApi.createProject(params);
    this.projects = [project, ...this.projects];
    this.notify("projects_updated", this.projects);
    return project;
  }

  async saveArtifact(params: SaveArtifactParams): Promise<ProjectArtifact> {
    let artifact: ProjectArtifact;
    if (params.id) {
      artifact = await workspaceApi.updateArtifact(params.id, params);
    } else {
      artifact = await workspaceApi.createArtifact(params);
    }

    this.projects = this.projects.map((p) => {
      if (p.id !== params.projectId) return p;
      const exists = p.artifacts?.some((art) => art.id === artifact.id);
      const updatedArtifacts = exists
        ? (p.artifacts || []).map((art) => (art.id === artifact.id ? artifact : art))
        : [...(p.artifacts || []), artifact];
      return { ...p, artifacts: updatedArtifacts };
    });

    this.notify("artifact_updated", artifact);
    this.notify("projects_updated", this.projects);
    return artifact;
  }

  async confirmMemory(params: ConfirmMemoryParams): Promise<Person> {
    const updatedPerson = await workspaceApi.confirmMemory(params);
    // 偏好回流：确认「我」的偏好候选后，同步写入本地辅导设定，下一轮对话自动生效
    if (params.personId === USER_SELF_PERSON_ID && params.pattern) {
      this.applyConfirmedPreference(params.pattern.trim());
    }
    this.people = this.people.map((p) => (p.id === updatedPerson.id ? updatedPerson : p));
    this.notify("people_updated", this.people);
    return updatedPerson;
  }

  /**
   * 将确认过的偏好指引追加进 workspace_profile.coachingNotes（去重、限量）
   */
  private applyConfirmedPreference(guidance: string): void {
    if (!guidance) return;
    const profile = clientStorage.getItem<WorkspaceProfile>("workspace_profile", DEFAULT_WORKSPACE_PROFILE);
    const notes = profile.coachingNotes || [];
    if (notes.includes(guidance)) return;
    const next = [...notes, guidance].slice(-COACHING_NOTES_LIMIT);
    clientStorage.setItem<WorkspaceProfile>("workspace_profile", { ...profile, coachingNotes: next });
  }

  async refreshEvents(projectId?: string): Promise<void> {
    try {
      const events = await workspaceApi.getEvents(projectId ? { projectId } : undefined);
      this.events = events;
      this.notify("events_updated", this.events);
    } catch (error) {
      console.error("WorkspaceManager refreshEvents failed:", error);
    }
  }

  async addEvent(params: CreateEventParams): Promise<{ id: string; harness?: Record<string, unknown> }> {
    const res = await workspaceApi.createEvent(params);
    // 录入事件可能自动创建人物或更新项目，同步刷新人物与项目
    await Promise.all([
      this.refreshEvents(params.projectId),
      this.refreshPeople(),
      this.refreshProjects(),
    ]);
    return res;
  }

  async deleteEvent(id: string, projectId?: string): Promise<void> {
    void projectId;
    await workspaceApi.deleteEvent(id);
    this.events = this.events.filter((e) => e.id !== id);
    this.notify("events_updated", this.events);
  }

  private notify(action: "people_updated" | "projects_updated" | "artifact_updated" | "events_updated", payload?: unknown) {
    agentBus.dispatch("workspace_changed", { action, payload });
  }
}

export const workspaceManager = new WorkspaceManager();
