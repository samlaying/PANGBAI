/**
 * PANGBAI Agent Harness · Jev 决策层 (TypeSafe Pre-Decision Layer)
 *
 * 核心职责：
 * 在主大模型动笔之前，通过 TypeSafe 官方 Jev 决策模型（System One Model）进行毫秒级预判：
 * 1. choice: 命中哪项专属技能 (双轨制技能系统) 或直接直通回复
 * 2. need_tool: 是否需要外挂工具 (如飞书聊天同步、Canvas 活文档、数据库穿透)
 * 3. score: 任务复杂度与紧急度评分 (0~100)，“三个没说”判定，>= 60 触发 Planning (write_todo)
 */

import { SKILL_REGISTRY } from "./skill-registry";

export interface JevDecision {
  choice: string;
  need_tool: boolean;
  score: number;
  rationale: string;
}

export interface JevEvaluationInput {
  userQuery: string;
  activeCanvas?: { title?: string; doc_type?: string } | null;
  historySummary?: string;
}

/**
 * 启发式规则库 (保底超高速路径)
 */
function evaluateHeuristic(input: JevEvaluationInput): JevDecision {
  const q = input.userQuery.toLowerCase();

  // 0. 飞书相关
  if (/飞书|lark|飞书群|获取聊天|同步飞书|群聊记录/.test(q)) {
    return {
      choice: "feishu_sync",
      need_tool: true,
      score: 50,
      rationale: "用户明确涉及飞书聊天、群聊或素材同步，需调取飞书接入层",
    };
  }

  // 1. PRD 需求文档类
  if (/prd|需求文档|需求规格|产品规格|写个需求|功能需求清单/.test(q)) {
    return {
      choice: "prd_generator",
      need_tool: true,
      score: 75,
      rationale: "用户明确要求输出结构化 PRD 需求文档，需启动画布与大纲生成流程",
    };
  }

  // 2. Canvas 方案 / 大纲类
  if (/画布|canvas|方案骨架|复盘总结|大纲|梳理方案/.test(q)) {
    return {
      choice: "canvas_doc_writer",
      need_tool: true,
      score: 70,
      rationale: "用户要求组织大纲方案或复盘活文档，需唤起 Canvas 架构师技能",
    };
  }

  // 3. 需求变更 / 范围比对 / 研发砍需求
  if (/砍需求|需求变更|插单|改动太大|版本比对|范围|scope/.test(q)) {
    return {
      choice: "scope_diff_checker",
      need_tool: false,
      score: 65,
      rationale: "涉及版本范围蔓延与砍需求博弈，需比对变更影响并给出保底策略",
    };
  }

  // 4. 用户故事与验收准则 (AC)
  if (/用户故事|验收标准|ac|invest|测试用例|given when/.test(q)) {
    return {
      choice: "user_story_expander",
      need_tool: false,
      score: 55,
      rationale: "需求细化至用户故事与验收准则颗粒度",
    };
  }

  // 5. 向上汇报 / 领导对齐 / 金字塔汇报
  if (/向领导汇报|向上汇报|领导问|怎么跟领导说|求援|老板/.test(q)) {
    return {
      choice: "upward_report_pyramid",
      need_tool: false,
      score: 60,
      rationale: "涉及向上管理与领导沟通，强制采用金字塔原理结论先行与求援框架",
    };
  }

  // 6. 体面拒绝 / 甄嬛传借力打力 / 不接锅
  if (/怎么拒绝|体面拒绝|不想接|甩锅|推诿|借力打力|怎么回|话术/.test(q)) {
    return {
      choice: "tactful_reply_zhenhuan",
      need_tool: false,
      score: 50,
      rationale: "涉及职场博弈与拒绝话术，启用甄嬛传借力打力高情商卡片输出",
    };
  }

  // 7. 局势分析 / 大明王朝 / 谁在搞我
  if (/局势|利益|大明王朝|谁在自保|水下算盘|看懂局势|背后目的/.test(q)) {
    return {
      choice: "situation_analyzer_daming",
      need_tool: false,
      score: 70,
      rationale: "复杂的职场权力与利益格局，调用大明王朝深度局势推演法",
    };
  }

  // 8. 跨部门撕逼 / 冲突调解
  if (/撕逼|冲突|对齐会|运营甩锅|研发不给排期|跨部门/.test(q)) {
    return {
      choice: "conflict_mediator",
      need_tool: false,
      score: 65,
      rationale: "跨部门利益对立与协作卡点，采用利益置换调解策略",
    };
  }

  // 9. 人物画像 / 摸清性格
  if (/这个人|他的性格|老李|张三|王五|总监|如何搞定他/.test(q)) {
    return {
      choice: "crm_person_profiler",
      need_tool: true,
      score: 55,
      rationale: "靶向干系人深度心理与攻防画像",
    };
  }

  // 默认：直通模式
  const isComplex = q.length > 80 || q.includes("并且") || q.includes("另外");
  return {
    choice: "direct_chat",
    need_tool: false,
    score: isComplex ? 60 : 35,
    rationale: "日常职场咨询沟通，采用清醒真诚的直通解答路径",
  };
}

/**
 * 接入 TypeSafe Jev 官方 System One 决策 API
 */
async function callTypeSafeJevAPI(input: JevEvaluationInput): Promise<JevDecision | null> {
  const apiKey =
    process.env.JEV_API_KEY ||
    "apikey_252e5ec34f0537d46cca1abaf7be78e17eb_d231ad0f049341fcba1561015603d8ed60446c221a2663ba361654a69fec978a";
  const endpoint = process.env.JEV_BASE_URL || "https://api.typesafe.ai/v1/systemone";

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1200);

    const payload = {
      model: "jev-latest",
      state: input.userQuery,
      questions: {
        is_complex: {
          type: "noul",
          instructions: "Is this a complex workplace task requiring multi-step planning or structured document generation?",
        },
        need_tool: {
          type: "noul",
          instructions: "Does this request need external tool integration (such as Feishu sync, database lookup, or Canvas artifact)?",
        },
        choice: {
          type: "choice",
          instructions: "Which specialized skill should handle this user request?",
          criteria: {
            prd_generator: "Writing or generating PRD, requirements specification, or user stories",
            canvas_doc_writer: "Generating Canvas architecture document, project outline, or retrospective",
            scope_diff_checker: "Handling scope creep, cutting features, or timeline negotiation with dev",
            user_story_expander: "Expanding user stories and acceptance criteria (AC)",
            issue_breakdown_planner: "WBS task breakdown and project delivery planning",
            situation_analyzer_daming: "Deep workplace politics, hidden agendas, power dynamics analysis",
            tactful_reply_zhenhuan: "Drafting tactful refusal, high-EQ reply, dodging blame",
            upward_report_pyramid: "Reporting to leadership using Pyramid Principle (conclusion first)",
            conflict_mediator: "Cross-department friction or alignment",
            crm_person_profiler: "Analyzing personality and psychological patterns of specific colleagues",
            feishu_sync: "Fetching or syncing messages, chats, or meetings from Feishu/Lark",
            direct_chat: "General conversational advice or simple Q&A",
          },
        },
      },
    };

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      const answers = data.answers || {};

      const rawChoice = answers.choice?.choice;
      const validChoice =
        rawChoice && (SKILL_REGISTRY[rawChoice] || rawChoice === "direct_chat")
          ? rawChoice
          : "direct_chat";

      const isComplexProb = typeof answers.is_complex?.noul === "number" ? answers.is_complex.noul : 0.4;
      const needToolProb = typeof answers.need_tool?.noul === "number" ? answers.need_tool.noul : 0.2;

      const score = Math.round(isComplexProb * 100);
      const need_tool = needToolProb > 0.5;

      return {
        choice: validChoice,
        need_tool,
        score,
        rationale: `由 TypeSafe Jev 官方决策模型裁决 (技能置信度: ${(answers.choice?.confidence ?? 1.0).toFixed(2)}, 复杂度: ${score}分)`,
      };
    }
  } catch (err) {
    // 超时或网络异常，安全平滑降级
    console.warn("Jev API call timed out or failed, falling back to heuristic:", err);
  }

  return null;
}

/**
 * 执行 Jev 决策
 */
export async function runJevDecision(input: JevEvaluationInput): Promise<JevDecision> {
  // 1. 尝试调用 TypeSafe 官方 Jev 决策 API (带 1200ms 熔断)
  const jevRes = await callTypeSafeJevAPI(input);
  if (jevRes) {
    return jevRes;
  }

  // 2. 降级走启发式规则引擎
  return evaluateHeuristic(input);
}
