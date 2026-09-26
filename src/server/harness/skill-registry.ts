/**
 * PANGBAI Agent Harness · 双轨制技能注册表 (Dual-Track Skill Registry)
 *
 * 遵循 Harness Engineering 渐进式披露 (Progressive Disclosure) 原则：
 * 1. 元数据层 (Metadata): 极小 Token 预算 (<= 200 Tokens/Skill)，供上下文初筛或 Jev 决策使用；
 * 2. 深度 SOP 与提示词 (Full SOP): 命中后 JIT (即时) 动态加载注入，不占用常驻上下文。
 */

export interface SkillDefinition {
  id: string;
  name: string;
  category: "pm_workflow" | "workplace_dynamics";
  description: string; // Progressive disclosure description (<= 200 tokens)
  tags: string[];
  systemPromptAddendum: string;
  outputContract: {
    requiresCanvasYaml?: boolean;
    requiresQuoteCards?: boolean;
    requiresEntityLinks?: boolean;
  };
}

export const SKILL_REGISTRY: Record<string, SkillDefinition> = {
  // ─── Track 1: 产品经理工作流 Skills ───
  prd_generator: {
    id: "prd_generator",
    name: "PRD 需求规格说明书生成器",
    category: "pm_workflow",
    description: "专为产品经理设计的高完整度 PRD 生成技能，将模糊需求结构化为包含背景、用户痛点、功能清单、交互时序及验收标准 (AC) 的可交付规格文档。",
    tags: ["prd", "需求文档", "规格说明", "Canvas"],
    outputContract: {
      requiresCanvasYaml: true,
      requiresEntityLinks: true,
    },
    systemPromptAddendum: `【当前激活技能：PRD 需求规格说明书生成器】
你的任务是协助产品经理将业务需求梳理为高标准 PRD 骨架。你必须在输出顶部以标准 YAML Frontmatter 输出文档头，并紧接着提供 Markdown 骨架：
---
title: "需求文档标题-PRD.md"
type: "prd"
expected_solution: "一句话阐明该 PRD 解决的核心用户价值与业务指标"
---
# [功能模块名称] 需求规格说明书
## 1. 业务背景与用户价值
- 目标受众与核心使用场景
- 关键衡量指标 (北极星指标 / 核心成功指标)
## 2. 需求范围与业务流程 (Scope)
- In-Scope (本次必须交付)
- Out-of-Scope (后续迭代演进，本次不做)
- 核心业务时序图或状态机
## 3. 功能详细定义与交互规则
- [子功能点 A]: 交互时序、异常边界、前置/后置条件
## 4. 验收准则 (Acceptance Criteria - Given/When/Then)
## 5. 技术依赖与风险评估 (Plan B)`,
  },

  canvas_doc_writer: {
    id: "canvas_doc_writer",
    name: "Canvas 方案与活文档架构师",
    category: "pm_workflow",
    description: "将对话讨论、头脑风暴或项目复盘沉淀为右侧 Canvas 活文档，提供结构化大纲、方案推演、排期甘特与风险矩阵。",
    tags: ["canvas", "方案", "大纲", "复盘"],
    outputContract: {
      requiresCanvasYaml: true,
      requiresEntityLinks: true,
    },
    systemPromptAddendum: `【当前激活技能：Canvas 方案与活文档架构师】
当用户希望梳理方案或将讨论沉淀为文档时，你必须直接在输出最上方输出标准 YAML Frontmatter，并在正文组织清晰的大纲：
---
title: "方案名称-落地方案.md"
type: "tech_spec"
expected_solution: "提炼核心交付方案与攻坚重点"
---
# 核心大纲与推演方案
## 1. 核心目标与破局策略
## 2. 关键干系人对齐矩阵
## 3. 分阶段实施里程碑 (Milestones)
## 4. 潜在卡点与资源兜底措施`,
  },

  scope_diff_checker: {
    id: "scope_diff_checker",
    name: "需求范围与变更比对审查器",
    category: "pm_workflow",
    description: "针对需求插单、研发砍需求或版本迭代，审查新旧版本范围差异 (Scope Diff)，提供范围蔓延风险评估与保核心谈判策略。",
    tags: ["scope", "需求变更", "砍需求", "排期博弈"],
    outputContract: {
      requiresCanvasYaml: false,
      requiresQuoteCards: true,
      requiresEntityLinks: true,
    },
    systemPromptAddendum: `【当前激活技能：需求范围与变更比对审查器】
深入分析当前变更导致的工期、成本和上下游依赖风险。
请输出：
1. 【变更影响评估矩阵】：区分“必须保的核心底线”与“可妥协做下一期的锦上添花”；
2. 【向业务方/研发的沟通解释话术】：必须使用 > "话术..." 提供可直接发送给对方的专业对齐表述。`,
  },

  user_story_expander: {
    id: "user_story_expander",
    name: "用户故事与 INVEST 验收准则细化器",
    category: "pm_workflow",
    description: "将粗粒度需求拆解为符合 INVEST 原则的用户故事，并撰写 Given-When-Then 格式的自动化验收准则 (AC)。",
    tags: ["user_story", "验收标准", "AC", "敏捷"],
    outputContract: {
      requiresCanvasYaml: false,
      requiresEntityLinks: false,
    },
    systemPromptAddendum: `【当前激活技能：用户故事与 INVEST 验收准则细化器】
为每个用户故事明确：
- 作为 [用户角色]，我想要 [做某件事]，以便于 [达成某种价值]
- 验收准则 (AC):
  * Given (在某种前置上下文下)
  * When (当用户触发某动作)
  * Then (系统应产生明确可验证的结果)
- 异常场景与边界值防御`,
  },

  issue_breakdown_planner: {
    id: "issue_breakdown_planner",
    name: "任务 WBS 拆解与交付规划器",
    category: "pm_workflow",
    description: "针对复杂大任务进行 WBS 逐层拆解，确定前后置依赖关系、颗粒度估算与交付状态追踪清单。",
    tags: ["wbs", "任务拆解", "排期", "todo"],
    outputContract: {
      requiresCanvasYaml: false,
      requiresEntityLinks: true,
    },
    systemPromptAddendum: `【当前激活技能：任务 WBS 拆解与交付规划器】
将复杂任务拆解为结构化任务列表，明确：
- 阶段划分与里程碑
- 每个任务的输入条件、执行动作与预期产出物
- 外部依赖与潜在风险节点`,
  },

  // ─── Track 2: 人情世故 / 职场博弈 Skills ───
  situation_analyzer_daming: {
    id: "situation_analyzer_daming",
    name: "大明王朝局势分析法（利益链与权力格局推演）",
    category: "workplace_dynamics",
    description: "穿透职场台面上的冠冕堂皇理由，以利益驱动与权力博弈视角，深挖各方真正诉求、谁在自保、谁在甩锅、谁拥有最终裁决权。",
    tags: ["局势分析", "大明王朝", "利益博弈", "甩锅识别"],
    outputContract: {
      requiresCanvasYaml: false,
      requiresQuoteCards: false,
      requiresEntityLinks: true,
    },
    systemPromptAddendum: `【当前激活技能：大明王朝局势分析法（利益格局剖析）】
从利益与人性底层剖析当前局势，切忌浮于表面：
1. 【台面理由 vs 水下算盘】：对方公开给出的借口（如工期紧、合规风险）背后，真正顾虑的是什么（背锅风险/抢功劳/业务领地冲突）；
2. 【各方生死底线与筹码】：分析关键人（领导、合作方、业务方）在本次事件中的核心利益与不可触碰的红线；
3. 【破局关键切入点】：如何在不直接硬刚的前提下，让关键决策人意识到协助你符合他自身的最大利益。`,
  },

  tactful_reply_zhenhuan: {
    id: "tactful_reply_zhenhuan",
    name: "甄嬛传体面拒绝术（借力打力高情商话术）",
    category: "workplace_dynamics",
    description: "面对不合理需求、无理插单或同事甩锅，提供滴水不漏、既不伤和气又坚决不接锅的高情商话术，支持直接复制发给对方。",
    tags: ["体面拒绝", "高情商话术", "甄嬛传", "拒接锅"],
    outputContract: {
      requiresCanvasYaml: false,
      requiresQuoteCards: true,
      requiresEntityLinks: true,
    },
    systemPromptAddendum: `【当前激活技能：甄嬛传体面拒绝术（高情商借力打力）】
你的核心输出目标是给出“立竿见影、滴水不漏的直接复制话术”：
1. 引用语法（> "话术..."）必须专门用于提供可直接复制发给领导/同事的消息。严禁在引用块里写导师分析或寒暄！
2. 话术策略原则：
   - 态度诚恳肯定对方诉求的重要性；
   - 借公司公共规则、大老板目标或现有排期客观制约作为挡箭牌；
   - 绝不生硬说“不行”，而是给出“若要硬上，需要大老板批资源或先砍另一个大项目”的选择题，把决策压力踢回对方。`,
  },

  upward_report_pyramid: {
    id: "upward_report_pyramid",
    name: "麦肯锡金字塔向上汇报架构师",
    category: "workplace_dynamics",
    description: "向领导汇报工作进度、风险预警或争取资源支持时，坚持结论先行、归纳分组、逻辑递进，让汇报条理清晰、决策高效。",
    tags: ["向上汇报", "金字塔原理", "领导沟通", "求援"],
    outputContract: {
      requiresCanvasYaml: false,
      requiresQuoteCards: true,
      requiresEntityLinks: true,
    },
    systemPromptAddendum: `【当前激活技能：麦肯锡金字塔向上汇报架构师】
遵循金字塔原理组织你的建议和汇报提纲：
1. 【结论与求援重点 (Conclusion First)】：一句话说明当前进展或核心卡点，并明确需要领导拍板什么；
2. 【关键依据 (Rule of Three)】：归纳出不超过 3 点的核心事实或数据支撑；
3. 【备选行动方案 (Action Options)】：给出方案 A (推荐) 与方案 B 的优劣权衡与资源需求；
4. 提供一段可以直接微信/飞书发给领导的汇报话术，用 > "..." 格式清晰呈现。`,
  },

  conflict_mediator: {
    id: "conflict_mediator",
    name: "跨部门冲突对齐与利益交换调解器",
    category: "workplace_dynamics",
    description: "化解研发、设计、业务运营与产品之间的对立矛盾，设计利益置换方案与共识对齐机制。",
    tags: ["跨部门对齐", "冲突调解", "撕逼", "协同"],
    outputContract: {
      requiresCanvasYaml: false,
      requiresQuoteCards: true,
      requiresEntityLinks: true,
    },
    systemPromptAddendum: `【当前激活技能：跨部门冲突对齐与利益交换调解器】
解决跨部门推诿的核心不是讲大道理，而是设计“利益交换”：
1. 梳理各方的抵触根源与痛点；
2. 设计双赢或保底妥协机制（如敏捷一期保上线、二期补体验）；
3. 提供对齐会上的开场破冰话术与定音总结话术（使用 > "..." 卡片格式）。`,
  },

  crm_person_profiler: {
    id: "crm_person_profiler",
    name: "Workplace CRM 干系人心理与攻防画像",
    category: "workplace_dynamics",
    description: "针对具体同事或领导深入分析其过往行为模式、核心诉求、沟通偏好与防御机制，制定专属打法。",
    tags: ["人物画像", "干系人分析", "心理防线", "对策"],
    outputContract: {
      requiresCanvasYaml: false,
      requiresQuoteCards: false,
      requiresEntityLinks: true,
    },
    systemPromptAddendum: `【当前激活技能：Workplace CRM 干系人心理与攻防画像】
基于已有事实和证据，靶向穿透特定干系人的行为动机：
1. 分析此人在以往关键事件中的表现模式与置信度；
2. 识别其沟通雷区（他最讨厌什么）与爽点（他最在意什么成就感）；
3. 给出与他协作时的一对一攻防策略与底线防范。`,
  },

  feishu_sync: {
    id: "feishu_sync",
    name: "飞书聊天与事实素材同步器",
    category: "workplace_dynamics",
    description: "通过飞书开放平台与飞书 CLI，提取飞书群聊、私聊与会议记录，自动接入 Harness 反思管线提炼干系人行为事实与潜台词。",
    tags: ["飞书", "聊天同步", "会议纪要", "群聊"],
    outputContract: {
      requiresCanvasYaml: false,
      requiresQuoteCards: true,
      requiresEntityLinks: true,
    },
    systemPromptAddendum: `【当前激活技能：飞书聊天与事实素材同步器】
你正在处理从飞书同步进来的群聊记录、私聊记录或会议纪要：
1. 深入分析飞书对话中各方发言的潜台词与真实利益诉求；
2. 识别关键干系人在此次沟通中的态度倾向（如防御、推诿、试探、配合）；
3. 给出产品经理在飞书群里应当回复的最佳策略，并使用 > "话术..." 提供可直接复制发到飞书群里的高情商回复。`,
  },
};

/**
 * 渐进式披露：生成供常驻上下文引用的轻量化 Metadata 描述清单 (单个 <= 200 tokens)
 */
export function getSkillsSummaryForContext(): string {
  const pmSkills = Object.values(SKILL_REGISTRY).filter((s) => s.category === "pm_workflow");
  const wpSkills = Object.values(SKILL_REGISTRY).filter((s) => s.category === "workplace_dynamics");

  let out = "【系统搭载的双轨制能力注册表 (Skill Registry)】:\n";
  out += "• 产品经理工作流轨道 (PM Workflow):\n";
  for (const s of pmSkills) {
    out += `  - [${s.id}] ${s.name}: ${s.description}\n`;
  }
  out += "• 人情世故与职场博弈轨道 (Workplace Dynamics):\n";
  for (const s of wpSkills) {
    out += `  - [${s.id}] ${s.name}: ${s.description}\n`;
  }
  return out;
}

/**
 * JIT 动态获取命中的 Skill 完整 SOP 提示词
 */
export function getActiveSkillAddendum(skillId: string): string | null {
  const skill = SKILL_REGISTRY[skillId];
  return skill ? skill.systemPromptAddendum : null;
}
