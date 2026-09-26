/**
 * PANGBAI Agent Harness · Planning 状态机与任务清单隔离机制
 *
 * 核心设计原则（遵循 Harness Engineering）:
 * 1. 任务清单 (TodoList) 必须存储在 Agent State 的【独立 Key】中，绝不能混入 messages；
 * 2. 上下文工程的任何压缩、剪裁 (Offload) 或摘要 (Summarization) 动作，均不可触碰该 Key；
 * 3. 复杂任务 (Jev score >= 60) 自动触发规划，并在执行推进中更新子任务状态 (pending -> in_progress -> completed)。
 */

export interface TodoItem {
  id: string;
  task: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  deliverable?: string;
}

export interface AgentPlanningState {
  sessionId: string;
  todoList: TodoItem[];
  activeSkill?: string;
  complexityScore: number;
  lastUpdated: number;
}

/**
 * 内存/会话级规划状态注册表 (生产环境可落 Redis / StoreBackend)
 */
const PLANNING_STORE = new Map<string, AgentPlanningState>();

export function getPlanningState(sessionId: string): AgentPlanningState {
  let state = PLANNING_STORE.get(sessionId);
  if (!state) {
    state = {
      sessionId,
      todoList: [],
      complexityScore: 0,
      lastUpdated: Date.now(),
    };
    PLANNING_STORE.set(sessionId, state);
  }
  return state;
}

export function updatePlanningState(sessionId: string, patch: Partial<AgentPlanningState>): AgentPlanningState {
  const current = getPlanningState(sessionId);
  const updated: AgentPlanningState = {
    ...current,
    ...patch,
    lastUpdated: Date.now(),
  };
  PLANNING_STORE.set(sessionId, updated);
  return updated;
}

/**
 * 根据命中的技能和用户诉求生成初始 TodoList
 */
export function generateInitialTodoList(skillChoice: string, userQuery: string): TodoItem[] {
  void userQuery;
  if (skillChoice === "prd_generator") {
    return [
      { id: "step_1", task: "明确业务背景与核心用户受众 (In-Scope/Out-of-Scope)", status: "completed", deliverable: "背景与边界定义" },
      { id: "step_2", task: "梳理核心功能清单与交互状态时序", status: "in_progress", deliverable: "YAML Frontmatter & 功能结构" },
      { id: "step_3", task: "撰写 Given-When-Then 自动化验收准则 (AC)", status: "pending", deliverable: "质量验收规范" },
      { id: "step_4", task: "排查技术依赖与实施 Plan B 兜底策略", status: "pending", deliverable: "风险防御方案" },
    ];
  }

  if (skillChoice === "canvas_doc_writer") {
    return [
      { id: "step_1", task: "提取讨论要点并确立方案核心目标", status: "completed", deliverable: "方案预期目标" },
      { id: "step_2", task: "生成 Canvas YAML Frontmatter 与架构骨架", status: "in_progress", deliverable: "右侧 Canvas 大纲" },
      { id: "step_3", task: "细化分阶段实施排期与干系人矩阵", status: "pending", deliverable: "落地甘特与矩阵" },
    ];
  }

  if (skillChoice === "situation_analyzer_daming") {
    return [
      { id: "step_1", task: "剥离台面理由，穿透核心利益链与权力格局", status: "completed", deliverable: "利益格局分析" },
      { id: "step_2", task: "推演各方关键干系人的生死底线与自保算盘", status: "in_progress", deliverable: "底线推演" },
      { id: "step_3", task: "输出不硬刚的破局切入点与自保策略", status: "pending", deliverable: "破局行动方案" },
    ];
  }

  if (skillChoice === "upward_report_pyramid") {
    return [
      { id: "step_1", task: "提炼核心结论与求援重点 (Conclusion First)", status: "completed", deliverable: "一句话结论" },
      { id: "step_2", task: "归纳 3 项关键事实与数据支撑 (Rule of Three)", status: "in_progress", deliverable: "三要点支撑" },
      { id: "step_3", task: "生成可直接复制发给领导的结构化汇报话术", status: "pending", deliverable: "可复制卡片话术" },
    ];
  }

  // 通用规划
  return [
    { id: "step_1", task: "剖析核心痛点与职场博弈背景", status: "completed" },
    { id: "step_2", task: "形成破局推演与应对策略", status: "in_progress" },
    { id: "step_3", task: "给出可直接落地的行动指南或话术", status: "pending" },
  ];
}

/**
 * 格式化 TodoList 为提示词注入块（仅展示当前进度，不破坏原有任务状态）
 */
export function formatTodoListPrompt(todoList: TodoItem[]): string {
  if (!todoList || todoList.length === 0) return "";
  let out = "【当前长任务规划与执行清单 (TodoList)】:\n";
  for (const item of todoList) {
    const icon = item.status === "completed" ? "[✓ 已完成]" : item.status === "in_progress" ? "[▶ 进行中]" : "[  待推进]";
    out += `${icon} ${item.task}${item.deliverable ? ` (交付物: ${item.deliverable})` : ""}\n`;
  }
  out += "请在回答中严格针对当前【进行中】的任务展开深入推演，并产出高质量交付物。\n";
  return out;
}
