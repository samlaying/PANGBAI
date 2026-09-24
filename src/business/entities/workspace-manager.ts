import { agentBus } from "../bus/agent-bus";
import { workspaceApi, type ConfirmMemoryParams, type CreatePersonParams, type CreateProjectParams, type SaveArtifactParams } from "@/infra/api/workspace-api";
import type { Person, Project, ProjectArtifact } from "@/lib/types";

/**
 * WorkspaceManager
 * 业务实体层：负责管理世界模型档案（人物、项目、产物与记忆沉淀）。
 * 遵循原则 ②⑤：只调用底层 API，向 Event Bus 广播变更，绝不知晓 UI 组件。
 */
export class WorkspaceManager {
  public people: Person[] = [];
  public projects: Project[] = [];
  public isLoading: boolean = false;

  async init(): Promise<void> {
    if (this.isLoading) return;
    this.isLoading = true;
    try {
      const [people, projects] = await Promise.all([
        workspaceApi.getPeople(),
        workspaceApi.getProjects(),
      ]);
      this.people = people;
      this.projects = projects;
      this.notify("people_updated", this.people);
      this.notify("projects_updated", this.projects);
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
    this.people = this.people.map((p) => (p.id === updatedPerson.id ? updatedPerson : p));
    this.notify("people_updated", this.people);
    return updatedPerson;
  }

  private notify(action: "people_updated" | "projects_updated" | "artifact_updated", payload?: unknown) {
    agentBus.dispatch("workspace_changed", { action, payload });
  }
}

export const workspaceManager = new WorkspaceManager();
