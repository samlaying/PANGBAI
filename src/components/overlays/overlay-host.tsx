"use client";

import { SidePanelShell } from "../panels/side-panel";
import { PersonPanel } from "../panels/person-panel";
import { PeoplePanel, ProjectsPanel } from "../panels/list-panels";
import { ProjectPanel } from "../panels/project-panel";
import { MeetingPanel } from "../panels/meeting-panel";
import { SettingsPanel } from "../panels/settings-panel";
import { EvidenceModal } from "../modals/evidence-modal";
import { GrowthModal } from "../modals/growth-modal";
import { CommandMenu } from "./command-menu";
import type { useOverlayRouter } from "@/hooks/use-overlay-router";
import type { useWorkspace } from "@/hooks/use-workspace";

export function OverlayHost({
  router,
  workspace,
}: {
  router: ReturnType<typeof useOverlayRouter>;
  workspace: ReturnType<typeof useWorkspace>;
}) {
  const { panel, setPanel, modal, setModal, commandOpen, setCommandOpen } = router;
  const { people, projects, addPerson, addProject } = workspace;

  return (
    <>
      {/* Layer 2 · 侧滑面板 */}
      {panel && (
        <SidePanelShell onClose={() => setPanel(null)}>
          <div key={JSON.stringify(panel)} className="anim-fade flex h-full flex-col">
            {panel.type === "person" && people.find((p) => p.id === panel.id) && (
              <PersonPanel person={people.find((p) => p.id === panel.id)!} />
            )}
            {panel.type === "people" && (
              <PeoplePanel
                people={people}
                onCreated={async (name, role) => {
                  await addPerson(name, role);
                }}
              />
            )}
            {panel.type === "project" && projects.find((p) => p.id === panel.id) && (
              <ProjectPanel project={projects.find((p) => p.id === panel.id)!} people={people} />
            )}
            {panel.type === "projects" && (
              <ProjectsPanel
                projects={projects}
                createSignal={0}
                onCreated={async (name, deadline) => {
                  const p = await addProject(name, deadline);
                  setPanel({ type: "project", id: p.id });
                }}
              />
            )}
            {panel.type === "meeting" && <MeetingPanel />}
            {panel.type === "settings" && <SettingsPanel />}
          </div>
        </SidePanelShell>
      )}

      {/* Layer 1 · 模态框 */}
      {modal?.type === "evidence" && (
        <EvidenceModal
          evidence={people.flatMap((p) => p.evidence).find((e) => e.id === modal.id)!}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === "growth" && (
        <GrowthModal onClose={() => setModal(null)} />
      )}

      {/* Layer 0 · ⌘K 检索 */}
      {commandOpen && (
        <CommandMenu
          people={people}
          projects={projects}
          onClose={() => setCommandOpen(false)}
        />
      )}
    </>
  );
}
