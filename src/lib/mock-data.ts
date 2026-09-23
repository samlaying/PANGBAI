import type {
  ChatMessage,
  EvidenceItem,
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
  },
];

export const projectById = (id: string) => PROJECTS.find((p) => p.id === id);

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

export const CONVERSATION: ChatMessage[] = [
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

/* 发送后旁白的演示回复（循环使用） */
export const CANNED_REPLIES: { paras: string[] }[] = [
  {
    paras: [
      "我在。先把事情说完整一点——他是私下问的，还是当着别人问的？这两种回法不一样。",
      "如果是当众问，先简短接住，细节放到私聊；你可以先回一句「收到，今天下班前我单独同步您」。",
    ],
  },
  {
    paras: [
      "明白了。当众被@，最忌讳当场解释太多——显得在找借口。",
      "一句认领 + 一个时间点，就够了。细节留给一对一。",
    ],
  },
  {
    paras: [
      "这个问题我先记下来了，晚上复盘的时候我会把它归进「向上管理」。",
      "你先去回他。回完告诉我他的反应，我帮你判断下一步。",
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
