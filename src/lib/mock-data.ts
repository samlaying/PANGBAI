import type {
  ChatMessage,
  Conversation,
  Growth,
  Meeting,
  Notice,
  Person,
  Project,
} from "./types";

/* ── 人物 ─────────────────────────────────── */

export const ME = { name: "张明", role: "前端开发 · 产品部", char: "明" };

export const PEOPLE: Person[] = [
  {
    id: "wang",
    name: "王总",
    char: "王",
    role: "CEO",
    org: "产品部",
    relationChip: "直属领导 · 关系偏紧绷",
    tension: 65,
    patterns: [
      {
        pattern: "偏好提前同步风险",
        confidence: 82,
        evidenceCount: 4,
        lastObserved: "9月23日",
      },
      {
        pattern: "决策风格果断直接",
        confidence: 91,
        evidenceCount: 7,
        lastObserved: "9月18日",
      },
      {
        pattern: "对数据和时间线敏感",
        confidence: 76,
        evidenceCount: 3,
        lastObserved: "9月10日",
      },
    ],
    evidence: [
      {
        id: "ev-today",
        date: "9月23日 14:30",
        scene: "项目群聊",
        source: "群聊",
        person: "王总",
        project: "招聘 Agent v2",
        record:
          "王总在群里@张明：「为什么还没做完？」随后补了一句「周四就要给客户看了」。群里还有三位同事。",
        observation:
          "王总对「临时才知道风险」的反应是明显不满——不只是着急，而是失望。这与历史模式一致。",
        pattern: "偏好提前同步风险",
        patternConfidence: 82,
      },
      {
        id: "ev-jul8",
        date: "7月8日 15:20",
        scene: "项目评审会",
        source: "会议记录",
        person: "王总",
        project: "招聘 Agent v2",
        record:
          "评审会上，王总得知前端方案还没和后端对齐。他的表情明显沉下来，说了句「为什么这种事现在才说？」之后整场会议语气都比较紧。",
        observation:
          "王总对「临时暴露风险」的反应是明显不满，不仅仅是生气，而是失望。",
        pattern: "偏好提前同步风险",
        patternConfidence: 82,
      },
      {
        id: "ev-may20",
        date: "5月20日 10:00",
        scene: "一对一",
        source: "1:1 纪要",
        person: "王总",
        project: "—",
        record: "王总主动说：「下次有风险，提前跟我讲，别等我问。」",
        observation: "王总明确表达了希望风险前置同步的偏好，语气是期望而非指责。",
        pattern: "偏好提前同步风险",
        patternConfidence: 82,
      },
      {
        id: "ev-mar12",
        date: "3月12日 16:40",
        scene: "周会",
        source: "周会纪要",
        person: "王总",
        project: "招聘 Agent v1",
        record: "王总追问延期原因，连问三个「那现在呢」，语气严肃。",
        observation: "王总面对延期时关注点是「现在的状态与时间线」，而非追责。",
        pattern: "对数据和时间线敏感",
        patternConfidence: 76,
      },
    ],
    recent: [
      { date: "今天", text: "群聊问「为什么还没做完」", today: true },
      { date: "3天前", text: "项目周报批示「按计划推进」" },
      { date: "1周前", text: "方案讨论会，定了 v2 范围" },
      { date: "2周前", text: "数据口径确认" },
    ],
    advice: "和王总沟通，先说结论，再说过程。有风险主动提，别等他问。",
  },
  {
    id: "li",
    name: "李总",
    char: "李",
    role: "技术VP",
    org: "平台部",
    relationChip: "跨部门协作 · 关系平常",
    tension: 30,
    patterns: [
      {
        pattern: "重视技术完整性",
        confidence: 88,
        evidenceCount: 5,
        lastObserved: "9月19日",
      },
      {
        pattern: "偏好书面确认",
        confidence: 74,
        evidenceCount: 3,
        lastObserved: "9月2日",
      },
    ],
    evidence: [],
    recent: [
      { date: "2小时前", text: "在群里问「客户那边怎么说」", today: true },
      { date: "1周前", text: "schema 评审，提了三点意见" },
    ],
    advice: "和李总沟通，结论之外带上方案的技术取舍，他会更快点头。",
  },
  {
    id: "zhang",
    name: "张哥",
    char: "张",
    role: "后端负责人",
    org: "产品部",
    relationChip: "同组伙伴 · 关系良好",
    tension: 10,
    patterns: [
      {
        pattern: "执行靠谱，承诺必达",
        confidence: 90,
        evidenceCount: 6,
        lastObserved: "9月22日",
      },
    ],
    evidence: [],
    recent: [{ date: "昨天", text: "对齐了接口时序", today: false }],
    advice: "张哥是你最稳的盟友，跨端的事提前一天和他说就来得及。",
  },
];

export const personById = (id: string) => PEOPLE.find((p) => p.id === id);

/* ── 项目 ─────────────────────────────────── */

export const PROJECTS: Project[] = [
  {
    id: "recruiting",
    name: "招聘 Agent v2",
    status: "进行中",
    deadline: "1月31日",
    progress: 65,
    riskCount: 2,
    risks: [
      {
        title: "数据标注进度慢 3 天",
        note: "尚未同步给王总 · 建议今晚先说",
        owner: "我",
      },
      {
        title: "后端 schema 未确认",
        note: "尚未同步给李总 · 影响联调排期",
        owner: "张哥",
      },
    ],
    milestones: [
      { name: "需求确认", date: "1月5日", state: "done" },
      { name: "技术方案", date: "1月10日", state: "done" },
      { name: "数据标注", date: "延期 3 天", state: "warn" },
      { name: "模型训练", date: "1月25日", state: "todo" },
      { name: "上线交付", date: "1月31日", state: "todo" },
    ],
    members: ["wang", "li", "zhang", "me"],
    advice: "两个风险都没同步。建议今晚先发条消息给王总，别拖到评审会。",
    artifacts: [
      {
        id: "art-prd-recruiting",
        projectId: "recruiting",
        title: "招聘 Agent v2 核心方案与 PRD",
        updatedAt: "刚刚",
        frontmatter: {
          title: "招聘 Agent v2 核心方案与 PRD",
          type: "prd",
          date: "2026-09-23",
          progress: "in_review",
          stakeholders: ["王总", "李总", "张哥", "张明"],
          version: "v2.0-rc",
          expected_solution: "先交付基于标准库的初筛 Agent 闭环，次要字段规则兜底，保证周四如期向客户演示",
          risk_points: ["数据标注延迟 3 天未同步王总", "后端 schema 接口时序待对齐"],
          notes: "周四向客户演示前需确保核心主流程可跑通",
        },
        content: `---
title: "招聘 Agent v2 核心方案与 PRD"
type: prd
date: "2026-09-23"
progress: in_review
stakeholders:
  - 王总
  - 李总
  - 张哥
  - 张明
version: "v2.0-rc"
expected_solution: "先交付基于标准库的初筛 Agent 闭环，次要字段规则兜底，保证周四如期向客户演示"
risk_points:
  - "数据标注延迟 3 天未同步王总"
  - "后端 schema 接口时序待对齐"
notes: "周四向客户演示前需确保核心主流程可跑通"
---

# 招聘 Agent v2 核心方案与 PRD

## 1. 业务背景与预期
- 目标：将初筛效率提升 40%，周四需向王总与客户演示初版。
- 现状卡点：数据标注由于样本复杂性延期 3 天，当前综合进度 65%。

## 2. 方案与取舍（Trade-off）
- **方案 A（保期交付核心链路，推荐）**：
  优先打通「简历解析 + 核心能力打分」，次要字段暂用规则兜底。可保证周四如期演示。
- **方案 B（全量精准交付）**：
  等待全部标注完毕再行评估，交付整体延后至下周二。

## 3. 向上沟通与跨部门协同
- 需在今晚下班前向王总主动同步，避免评审会上被动质询。
- 与李总对齐接口技术取舍，争取后端去重中间件支持。`,
      },
      {
        id: "art-comp-recruiting",
        projectId: "recruiting",
        title: "智能初筛竞品分析与行业对标",
        updatedAt: "3天前",
        frontmatter: {
          title: "智能初筛竞品分析与行业对标",
          type: "competitive_analysis",
          date: "2026-09-20",
          progress: "aligned",
          stakeholders: ["王总", "张明"],
          version: "v1.1",
          expected_solution: "借鉴市面大模型+规则双筛机制，重点补足人岗匹配解释性与隐私安全红线",
          notes: "李总认可技术路径，关注高并发推理成本",
        },
        content: `---
title: "智能初筛竞品分析与行业对标"
type: competitive_analysis
date: "2026-09-20"
progress: aligned
stakeholders:
  - 王总
  - 张明
version: "v1.1"
expected_solution: "借鉴市面大模型+规则双筛机制，重点补足人岗匹配解释性与隐私安全红线"
notes: "李总认可技术路径，关注高并发推理成本"
---

# 智能初筛竞品分析与行业对标

## 1. 竞品能力矩阵
- **竞品 A**：主打即时人岗匹配分数，缺乏可解释性，面试官信任度低。
- **竞品 B**：支持自然语言问答交互筛选，但推理耗时较长（>3s）。
- **我们的差异化优势**：兼顾秒级初筛与关键证据引用（Evidence-backed scoring）。

## 2. 核心架构建议
- 采用冷热双通道架构：基础硬性条件走规则缓存，主观匹配度走轻量 Agent 评估。`,
      },
      {
        id: "art-retro-recruiting",
        projectId: "recruiting",
        title: "需求评审会沟通与协同复盘",
        updatedAt: "上周",
        frontmatter: {
          title: "需求评审会沟通与协同复盘",
          type: "review_retrospective",
          date: "2026-09-16",
          progress: "completed",
          stakeholders: ["王总", "李总", "张明"],
          notes: "7月8日同类事件历史复盘沉淀",
          retrospective: {
            successes: [
              "锁定 v2 核心范围，砍掉了 2 个非核心报表模块",
              "与张哥提前敲定了基础数据格式",
            ],
            friction_points: [
              "风险未在会前提前同步王总，导致开场氛围紧张",
              "向李总提接口排期时未准备备选方案",
            ],
            action_items: [
              "重大评审前 24h 发送一页纸备忘",
              "凡涉及排期变动，必带方案 A / 方案 B 取舍",
            ],
          },
        },
        content: `---
title: "需求评审会沟通与协同复盘"
type: review_retrospective
date: "2026-09-16"
progress: completed
stakeholders:
  - 王总
  - 李总
  - 张明
retrospective:
  successes:
    - "锁定 v2 核心范围，砍掉了 2 个非核心报表模块"
    - "与张哥提前敲定了基础数据格式"
  friction_points:
    - "风险未在会前提前同步王总，导致开场氛围紧张"
    - "向李总提接口排期时未准备备选方案"
  action_items:
    - "重大评审前 24h 发送一页纸备忘"
    - "凡涉及排期变动，必带方案 A / 方案 B 取舍"
---

# 需求评审会沟通与协同复盘

## 一、 复盘背景
本次评审会上就初筛排期与技术选型发生了预期外的争执，为避免后续再次出现信息不对称，进行结构化复盘。

## 二、 关键得失
- **做得好的**：范围边界清晰，未让客户的新需求无序蔓延。
- **教训与阻力**：王总在会上当众追问，说明会前缺乏非正式对齐；李总对临时推过来的排期持防守态度。`,
      },
    ],
  },
  {
    id: "kb",
    name: "内部知识库改版",
    status: "规划中",
    deadline: "2月20日",
    progress: 12,
    riskCount: 0,
    risks: [],
    milestones: [
      { name: "现状调研", date: "2月1日", state: "todo" },
      { name: "方案评审", date: "2月10日", state: "todo" },
    ],
    members: ["zhang", "me"],
    advice: "还在规划期，先不动手，等招聘 Agent 交付后再启动。",
    artifacts: [
      {
        id: "art-brief-kb",
        projectId: "kb",
        title: "内部知识库改版方案概要与调研",
        updatedAt: "2周前",
        frontmatter: {
          title: "内部知识库改版方案概要与调研",
          type: "solution_brief",
          date: "2026-09-10",
          progress: "draft",
          stakeholders: ["张明", "张哥"],
          version: "v0.1",
          expected_solution: "打通部门文档与代码知识，构建轻量检索 Agent",
          notes: "优先级排在招聘 Agent 之后",
        },
        content: `---
title: "内部知识库改版方案概要与调研"
type: solution_brief
date: "2026-09-10"
progress: draft
stakeholders:
  - 张明
  - 张哥
version: "v0.1"
expected_solution: "打通部门文档与代码知识，构建轻量检索 Agent"
notes: "优先级排在招聘 Agent 之后"
---

# 内部知识库改版方案概要与调研

## 1. 目标与方向
构建部门级私有化知识库问答工具，减少新人入职问询成本。`,
      },
    ],
  },
];

export const projectById = (id: string, list: Project[] = PROJECTS) =>
  list.find((p) => p.id === id);

/* ── 会议 ─────────────────────────────────── */

export const MEETING: Meeting = {
  title: "项目评审",
  when: "明天 10:00",
  duration: "30 分钟",
  location: "腾讯会议",
  attendees: [
    { personId: "wang", host: true },
    { personId: "li" },
    { personId: "zhang" },
    { personId: "me" },
  ],
  prep: [
    "今天先发一条消息预告风险，别让他在会上第一次听到",
    "准备一页风险应对方案：标注现状、追赶计划、需要的支持",
    "会上主动提，先给结论，再给时间线",
  ],
  relatedProjectId: "recruiting",
};

/* ── 通知 ─────────────────────────────────── */

export const NOTICES: Notice[] = [
  {
    id: "n1",
    icon: "risk",
    title: "项目风险未同步",
    body: "王总明天主持项目评审，招聘 Agent v2 有 2 个风险你还没提前说。",
    time: "10分钟前",
    primary: "查看项目",
    secondary: "问旁白",
  },
  {
    id: "n2",
    icon: "message",
    title: "李总 · 2小时前",
    body: "「客户那边怎么说？」——跨部门沟通已延迟 2 小时，建议今天内回复。",
    time: "2小时前",
    primary: "去回复",
    secondary: "问旁白",
  },
  {
    id: "n3",
    icon: "calendar",
    title: "明天 2 个会议",
    body: "10:00 项目评审（王总主持）· 16:00 与王总一对一",
    time: "3小时前",
    primary: "查看",
    secondary: "知道了",
  },
];

/* ── 成长 ─────────────────────────────────── */

export const GROWTH: Growth = {
  period: "2026.09.01 — 09.23",
  radar: [
    { label: "向上管理", score: 4, prev: 3 },
    { label: "沟通", score: 5, prev: 4 },
    { label: "执行", score: 3, prev: 3 },
    { label: "项目管理", score: 4, prev: 3 },
  ],
  highlights: [
    "9月18日 · 首次主动向王总同步风险",
    "9月12日 · 评审会上主动提出备选方案",
    "9月5日 · 需求确认会上表达清晰，一遍过",
  ],
  improve: [
    { level: "mid", text: "与李总的跨部门沟通不够及时（平均延迟 1.5 天）" },
    { level: "bad", text: "9月20日紧急情况下忘了先汇报再动手" },
  ],
  practice: {
    title: "高难度对话 · 先认错再给方案",
    desc: "围绕「向王总汇报延期」做一次角色扮演演练",
  },
};

/* ── 演示对话 ─────────────────────────────── */

const DEMO_MESSAGES: ChatMessage[] = [
  {
    id: "u1",
    role: "user",
    time: "14:31",
    text: "王总刚才在群里@我，问「为什么还没做完」，群里还有别人，有点下不来台。我该怎么回？",
  },
  {
    id: "a1",
    role: "assistant",
    time: "刚刚",
    blocks: [
      {
        kind: "para",
        dropcap: true,
        text: "今天[王总](person:wang)有点不开心，对吧。",
      },
      {
        kind: "para",
        text: "他问「为什么还没做完」的时候，其实在意的不是进度——是他今天才知道有风险。这件事[7月8日](evidence:ev-jul8)也发生过一次。",
      },
      { kind: "para", text: "我翻了翻记录，把前因后果理了一下：" },
      { kind: "evidence" },
      { kind: "divider" },
      { kind: "para", text: "现在最要紧的，是让他知道你接住了这件事。你可以这样回：" },
      {
        kind: "quote",
        label: "话术 · SUGGESTED REPLY",
        text: "王总，这块我没提前同步，是我的问题。\n目前卡在数据标注，预计周四能出初版。\n之后我每天同步一次进度，有变化第一时间说。",
      },
      { kind: "para", text: "要不要我帮你想想，他接下来会追问什么？" },
      { kind: "actions" },
      { kind: "source" },
    ],
  },
];

export const INITIAL_CONVERSATIONS: Conversation[] = [
  {
    id: "c-demo",
    projectId: "recruiting",
    title: "王总问「为什么还没做完」",
    time: "14:31",
    group: "今天",
    opener: {
      kicker: "本期实录 · CONVERSATION",
      title: "关于王总那句「为什么还没做完」",
      standfirst:
        "一句群里的追问，背后是一段没被提前说出的风险。旁白翻出了四条旧记录，把这件事的来龙去脉摆在桌面上。",
      metas: ["记录 · 9月23日 14:31", "涉及 · 王总 / 招聘 Agent v2", "字数 · 约 400"],
    },
    messages: DEMO_MESSAGES,
  },
  {
    id: "c-li",
    projectId: "recruiting",
    title: "和李总对接口排期",
    time: "3天前",
    group: "本周",
    opener: {
      kicker: "本篇实录 · CONVERSATION",
      title: "和李总对接口排期之前",
      standfirst: "跨部门的一次排期对齐。旁白提醒：带取舍去谈，别只给结论。",
      metas: ["记录 · 9月20日 10:02", "涉及 · 李总", "字数 · 约 120"],
    },
    messages: [
      {
        id: "li-u1",
        role: "user",
        time: "10:02",
        text: "和李总约了明天对接口排期，有什么要注意的？",
      },
      {
        id: "li-a1",
        role: "assistant",
        time: "10:02",
        blocks: [
          {
            kind: "para",
            dropcap: true,
            text: "[李总](person:li)重视技术完整性——和他谈排期，结论之外要带上方案的技术取舍。",
          },
          {
            kind: "para",
            text: "他偏好书面确认（74%）。建议先发一页书面摘要，会上一遍过。",
          },
        ],
      },
    ],
  },
  {
    id: "c-review",
    title: "复盘：需求评审会",
    time: "上周",
    group: "更早",
    opener: {
      kicker: "往期实录 · CONVERSATION",
      title: "需求评审会上被问住了",
      standfirst: "一次不太舒服的复盘。结论：被问住不丢人，丢的是没提前想备选。",
      metas: ["记录 · 9月12日 17:40", "涉及 · 张哥", "字数 · 约 90"],
    },
    messages: [
      {
        id: "rv-u1",
        role: "user",
        time: "17:40",
        text: "今天需求评审会被问住了，帮我复盘下。",
      },
      {
        id: "rv-a1",
        role: "assistant",
        time: "17:41",
        blocks: [
          {
            kind: "para",
            dropcap: true,
            text: "被问住不丢人——丢的是没提前想备选。这次卡住你的问题是「降级方案是什么」。",
          },
          { kind: "para", text: "下次带上 Plan B 去。到时我提醒你。" },
        ],
      },
    ],
  },
];

/* 发送后旁白的演示回复（模拟真实 Chatbot 结构化回复） */
export const CANNED_REPLIES: { blocks: import("./types").Block[] }[] = [
  {
    blocks: [
      {
        kind: "para",
        dropcap: true,
        text: "我在。先别急，当众群聊被问和私下沟通逻辑截然不同。",
      },
      {
        kind: "para",
        text: "当众被质询时，最忌讳长篇解释客观原因——在[王总](person:wang)看来容易变成推脱。此时最需要的是一句明确接住的承诺加私下同步的时间点。",
      },
      {
        kind: "quote",
        label: "建议回复话术 · SUGGESTED REPLY",
        text: "收到王总，这块我在盯紧攻坚，今天下班前我把进度细节与后续时间表单独同步您。",
      },
      {
        kind: "para",
        text: "群里给领导台阶，细节转移到私下复核。需要我帮你演练接下来王总可能的追问吗？",
      },
      { kind: "actions" },
    ],
  },
  {
    blocks: [
      {
        kind: "para",
        dropcap: true,
        text: "我梳理了一下当前的情况：这件事的核心不在动作快慢，而在于信息传递的时机。",
      },
      {
        kind: "para",
        text: "参考[李总](person:li)的沟通习惯，对齐排期时一定要带上方案的技术取舍，而不是单单抛出阻碍点。",
      },
      {
        kind: "quote",
        label: "对齐话术 · ALIGNMENT",
        text: "李总，目前受限于联调环境。方案A保核心链路可如期推进；方案B全量交付需多等两天。您看先按方案A跑如何？",
      },
      {
        kind: "para",
        text: "把单选题变成带有取舍的选择题，把掌控感交还给对方，沟通阻力会降低很多。",
      },
      { kind: "actions" },
    ],
  },
  {
    blocks: [
      {
        kind: "para",
        dropcap: true,
        text: "这个问题我先记下来了，会后我会自动归档到你的复盘记录中。",
      },
      {
        kind: "para",
        text: "向上沟通的第一原则是「先认领状态，再抛出解法」。你可以先去回复，稍后把对方的反馈告诉我，我们再针对性调整策略。",
      },
      { kind: "actions" },
    ],
  },
];

/* ── ⌘K 检索数据 ──────────────────────────── */

export const SEARCH_SOURCE = [
  {
    group: "人物" as const,
    items: [
      { title: "王总 · CEO · 产品部", sub: "偏好提前同步风险", meta: "82%", key: "person:wang" },
      { title: "李总 · 技术VP · 平台部", sub: "重视技术完整性", meta: "88%", key: "person:li" },
      { title: "张哥 · 后端负责人 · 产品部", sub: "执行靠谱，承诺必达", meta: "90%", key: "person:zhang" },
    ],
  },
  {
    group: "项目" as const,
    items: [
      { title: "招聘 Agent v2 · 王总发起", sub: "2 个风险 · 进度 65%", meta: "进行中", key: "project:recruiting" },
      { title: "内部知识库改版", sub: "规划中 · 进度 12%", meta: "规划中", key: "project:kb" },
    ],
  },
  {
    group: "会议" as const,
    items: [
      { title: "明天 10:00 项目评审 · 王总主持", sub: "腾讯会议 · 30 分钟", meta: "明天", key: "meeting:" },
      { title: "10月8日 方案讨论 · 有王总", sub: "会议室 B · 60 分钟", meta: "待定", key: "meeting:" },
    ],
  },
  {
    group: "记忆" as const,
    items: [
      { title: "「王总偏好提前同步风险」", sub: "置信度 82% · 4 条证据", meta: "人物", key: "person:wang" },
      { title: "「李总重视技术完整性」", sub: "置信度 88% · 5 条证据", meta: "人物", key: "person:li" },
    ],
  },
];

export const SEARCH_ASKS = [
  "王总最近怎么样？",
  "和李总的沟通怎么改进？",
  "明天的项目评审怎么准备？",
];
