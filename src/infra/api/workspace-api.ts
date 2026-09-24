import { request } from "./api-client";
import { mapArtifact, mapPerson, mapProject } from "@/lib/records";
import type { Person, Project, ProjectArtifact } from "@/lib/types";

export interface CreatePersonParams {
  name: string;
  role: string;
}

export interface CreateProjectParams {
  name: string;
  deadline?: string;
}

export interface SaveArtifactParams {
  id?: string;
  projectId: string;
  title: string;
  content: string;
}

export interface ConfirmMemoryParams {
  personId: string;
  candidateId?: string;
  pattern: string;
  observation: string;
  confidence: number;
  scene?: string;
}

/**
 * WorkspaceApi
 * 独立封装对后端工作区（人物、项目、文档产物、记忆确认）的所有网络数据通讯。
 */
export const workspaceApi = {
  async getPeople(): Promise<Person[]> {
    const raw = await request<unknown[]>("/api/people");
    return Array.isArray(raw) ? raw.map(mapPerson) : [];
  },

  async createPerson(params: CreatePersonParams): Promise<Person> {
    const raw = await request<unknown>("/api/people", {
      method: "POST",
      body: JSON.stringify(params),
    });
    return mapPerson(raw);
  },

  async getProjects(): Promise<Project[]> {
    const raw = await request<unknown[]>("/api/projects");
    return Array.isArray(raw) ? raw.map(mapProject) : [];
  },

  async createProject(params: CreateProjectParams): Promise<Project> {
    const raw = await request<unknown>("/api/projects", {
      method: "POST",
      body: JSON.stringify(params),
    });
    return mapProject(raw);
  },

  async createArtifact(params: SaveArtifactParams): Promise<ProjectArtifact> {
    const raw = await request<unknown>("/api/artifacts", {
      method: "POST",
      body: JSON.stringify(params),
    });
    return mapArtifact(raw);
  },

  async updateArtifact(id: string, params: SaveArtifactParams): Promise<ProjectArtifact> {
    const raw = await request<unknown>(`/api/artifacts/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(params),
    });
    return mapArtifact(raw);
  },

  async confirmMemory(params: ConfirmMemoryParams): Promise<Person> {
    const raw = await request<{ person: unknown }>(
      `/api/people/${encodeURIComponent(params.personId)}/memory/confirm`,
      {
        method: "POST",
        body: JSON.stringify({
          candidateId: params.candidateId,
          observation: params.observation,
          inferredPattern: params.pattern,
          confidence: params.confidence,
          source: params.scene,
        }),
      },
    );
    return mapPerson(raw.person);
  },
};
