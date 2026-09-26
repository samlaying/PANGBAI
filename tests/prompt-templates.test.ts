import test from "node:test";
import assert from "node:assert/strict";
import { PROMPT_TEMPLATES } from "../src/config/prompt-templates";

test("PROMPT_TEMPLATES configures structured workplace templates", () => {
  assert.equal(PROMPT_TEMPLATES.length, 6);

  const titles = PROMPT_TEMPLATES.map((t) => t.title);
  assert.ok(titles.includes("记录今天的一件事"));
  assert.ok(titles.includes("有个会要准备"));
  assert.ok(titles.includes("有句话不会回"));
  assert.ok(titles.includes("新建项目档案"));

  // Check structured placeholders exist in template text
  const recordEvent = PROMPT_TEMPLATES.find((t) => t.id === "record_event");
  assert.ok(recordEvent?.templateText.includes("场景与事件："));
  assert.ok(recordEvent?.templateText.includes("涉及的人员："));
  assert.ok(recordEvent?.templateText.includes("核心冲突或不适点："));

  const prepareMeeting = PROMPT_TEMPLATES.find((t) => t.id === "prepare_meeting");
  assert.ok(prepareMeeting?.templateText.includes("会议主题："));
  assert.ok(prepareMeeting?.templateText.includes("核心参会人与角色："));

  const replySpeech = PROMPT_TEMPLATES.find((t) => t.id === "reply_speech");
  assert.ok(replySpeech?.templateText.includes("对方原话："));

  const projectDossier = PROMPT_TEMPLATES.find((t) => t.id === "new_project_dossier");
  assert.ok(projectDossier?.templateText.includes("项目名称："));
  assert.ok(projectDossier?.templateText.includes("Canvas"));
});
