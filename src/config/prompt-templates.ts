import type { LucideIcon } from "lucide-react";
import {
  CalendarCheck,
  FolderPlus,
  MessagesSquare,
  NotebookPen,
} from "lucide-react";

export interface PromptTemplateConfig {
  id: string;
  icon: LucideIcon;
  title: string;
  sub: string;
  templateText: string;
}

/**
 * 空白页场景提示词模版配置（代码级配置）
 * 开发者可在此直接添加、调整排序或修改各工作场景的模版内容。
 */
export const PROMPT_TEMPLATES: PromptTemplateConfig[] = [
  {
    id: "record_event",
    icon: NotebookPen,
    title: "记录今天的一件事",
    sub: "会后、群聊、一次不愉快——都值得记",
    templateText: `今天发生了一件想复盘的事：
- 场景与事件：[简述发生的时间、会议或群聊]
- 涉及的人员：[对方姓名与职位]
- 核心冲突或不适点：[对方说了什么/做了什么，让我觉得...]
- 我当时的反应：[我当时如何回应的]

请旁白帮我客观分析局势，指出潜在误区与破局思路。`,
  },
  {
    id: "prepare_meeting",
    icon: CalendarCheck,
    title: "有个会要准备",
    sub: "旁白按参会人画像帮你备会",
    templateText: `明天有个重要的会议需要准备：
- 会议主题：[例如：Q3 跨部门项目排期对齐]
- 核心参会人与角色：[例如：产品负责人、技术总监]
- 我希望达成的目标：[例如：锁定上线时间，明确分工]
- 我担心的分歧点或风险：[例如：资源被砍、被质疑延期]

请帮我按参会人视角预演，并给出破局策略与发言提纲。`,
  },
  {
    id: "reply_speech",
    icon: MessagesSquare,
    title: "有句话不会回",
    sub: "贴出对话，旁白帮你斟酌措辞",
    templateText: `群聊/私聊里收到了这样一段话，不知道怎么回复最得体：
- 对方原话：“[在此粘贴对方的上下文或原话]”
- 对方身份：[领导 / 跨部门负责人 / 业务方]
- 我当前顾虑：[想委婉拒绝延期 / 想推进对方给结果 / 想稳住关系]

请给我 2~3 版不同语气（正式、委婉、破局）的建议回复话术。`,
  },
  {
    id: "new_project_dossier",
    icon: FolderPlus,
    title: "新建项目档案",
    sub: "开一个新项目的观察记录",
    templateText: `我想为新项目建立观察档案与架构大纲：
- 项目名称：[项目名称]
- 目标与关键里程碑：[预期上线时间或关键节点]
- 核心干系人与协作方：[关键角色]
- 当前已知的最大风险与阻力：[已知堵点或顾虑]

请帮我梳理项目大纲骨架，并在右侧 Canvas 生成方案文档。`,
  },
];
