import { sqlite } from "./client";
import { db } from "./client";
import { people, personModels, evidence, projects, projectArtifacts, memoryCandidates, events } from "./schema";
import { eq } from "drizzle-orm";

export function initializeDatabase() {
  // 创建基础数据表 (若不存在)
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS people (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'default_user',
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      department TEXT,
      relationship_tone TEXT,
      tension_score INTEGER DEFAULT 50,
      advice TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS person_models (
      id TEXT PRIMARY KEY,
      person_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
      pattern TEXT NOT NULL,
      confidence REAL NOT NULL,
      evidence_count INTEGER NOT NULL DEFAULT 1,
      last_observed_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS evidence (
      id TEXT PRIMARY KEY,
      person_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
      event_id TEXT,
      observation TEXT NOT NULL,
      source TEXT NOT NULL,
      date_str TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'default_user',
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'in_progress',
      progress INTEGER DEFAULT 0,
      deadline TEXT,
      risks_json TEXT,
      milestones_json TEXT,
      stakeholders_json TEXT,
      advice TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS project_artifacts (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      filename TEXT NOT NULL,
      title TEXT NOT NULL,
      doc_type TEXT NOT NULL DEFAULT 'prd',
      frontmatter_json TEXT,
      content TEXT NOT NULL,
      version TEXT DEFAULT 'v1.0',
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS memory_candidates (
      id TEXT PRIMARY KEY,
      conversation_id TEXT,
      person_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
      observation TEXT NOT NULL,
      inferred_pattern TEXT NOT NULL,
      confidence REAL NOT NULL,
      rationale TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'default_user',
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      person_id TEXT,
      project_id TEXT,
      metadata_json TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

export async function seedDatabase() {
  initializeDatabase();

  // 1. 种子人物数据
  const existingWang = await db.select().from(people).where(eq(people.id, "wang")).limit(1);
  if (existingWang.length === 0) {
    console.log("Seeding people...");
    await db.insert(people).values([
      {
        id: "wang",
        name: "王总",
        role: "CEO",
        department: "产品与业务部",
        relationshipTone: "直属领导 · 关系偏紧绷",
        tensionScore: 65,
        advice: "和王总沟通，先说结论再说过程。有风险主动提，给出明确的保底承诺与时间线。",
      },
      {
        id: "li",
        name: "李总",
        role: "技术 VP",
        department: "研发平台部",
        relationshipTone: "跨部门协同 · 严谨型",
        tensionScore: 40,
        advice: "和李总对齐需带上架构取舍与系统负荷评估，主动提供方案 A/B 供其做技术掌控。",
      },
      {
        id: "zhang",
        name: "张哥",
        role: "后端研发骨干",
        department: "核心业务后端",
        relationshipTone: "敏捷战友 · 信任度高",
        tensionScore: 20,
        advice: "对张哥直接给字段定义与接口边界，减少客套话，需求明确后执行极快。",
      },
    ]);

    // 2. 种子人物画像 Models
    await db.insert(personModels).values([
      {
        id: "pm_wang_1",
        personId: "wang",
        pattern: "偏好提前同步风险",
        confidence: 0.82,
        evidenceCount: 4,
        lastObservedAt: "今天 14:30",
      },
      {
        id: "pm_wang_2",
        personId: "wang",
        pattern: "决策风格果断直接，极看重交付确定性",
        confidence: 0.91,
        evidenceCount: 7,
        lastObservedAt: "7月8日",
      },
      {
        id: "pm_wang_3",
        personId: "wang",
        pattern: "对数据指标和截止时间线极敏感",
        confidence: 0.76,
        evidenceCount: 3,
        lastObservedAt: "5月20日",
      },
      {
        id: "pm_li_1",
        personId: "li",
        pattern: "重视技术完整性与主库稳定性",
        confidence: 0.88,
        evidenceCount: 5,
        lastObservedAt: "1月10日",
      },
      {
        id: "pm_li_2",
        personId: "li",
        pattern: "警惕突击上线，倾向于提前降级保稳定",
        confidence: 0.84,
        evidenceCount: 4,
        lastObservedAt: "1月12日",
      },
    ]);

    // 3. 证据链 Evidence
    await db.insert(evidence).values([
      {
        id: "ev_w1",
        personId: "wang",
        observation: "群聊追问：'为什么还没做完？周五就要给客户看'，在意未提前暴露风险",
        source: "今天 14:30 群聊",
        dateStr: "今天 14:30",
      },
      {
        id: "ev_w2",
        personId: "wang",
        observation: "项目评审会上得知前端方案未与后端对齐，语气严肃表示'为什么这种事现在才说'",
        source: "7月8日 项目评审",
        dateStr: "7月8日",
      },
      {
        id: "ev_w3",
        personId: "wang",
        observation: "1对1沟通明确要求：项目有任何卡点必须提前半天预警，不能等他主动追问",
        source: "5月20日 1:1",
        dateStr: "5月20日",
      },
      {
        id: "ev_w4",
        personId: "wang",
        observation: "周会追问延期原因，当场叫停没有保底方案的非核心特性开发",
        source: "3月12日 周会",
        dateStr: "3月12日",
      },
    ]);
  }

  // 4. 种子项目与产物
  const existingProject = await db.select().from(projects).where(eq(projects.id, "recruitment-agent")).limit(1);
  if (existingProject.length === 0) {
    console.log("Seeding projects & artifacts...");
    await db.insert(projects).values({
      id: "recruitment-agent",
      name: "招聘 Agent v2",
      status: "risk",
      progress: 65,
      deadline: "1月31日",
      risksJson: JSON.stringify([
        {
          id: "r1",
          title: "数据标注进度慢 3 天",
          note: "尚未同步给王总，周五客户演示存在功能残缺风险",
          syncTarget: "王总",
        },
        {
          id: "r2",
          title: "后端联调接口未完全冻结",
          note: "尚未与李总对齐降级方案",
          syncTarget: "李总",
        },
      ]),
      milestonesJson: JSON.stringify([
        { name: "需求确认", date: "1月5日", done: true },
        { name: "技术方案", date: "1月10日", done: true },
        { name: "数据标注", date: "1月15日", done: false, isRisk: true },
        { name: "模型联调", date: "1月25日", done: false },
        { name: "上线交付", date: "1月31日", done: false },
      ]),
      stakeholdersJson: JSON.stringify([
        { id: "wang", name: "王总", role: "CEO · 发起人" },
        { id: "li", name: "李总", role: "技术 VP · 平台" },
        { id: "zhang", name: "张哥", role: "后端骨干 · 研发" },
      ]),
      advice: "两个风险都没同步。建议今晚先发消息预警，准备一页 Plan B 兜底方案并在会上主动提。",
    });

    // 核心 PRD 产物
    const prdContent = `---
title: 招聘 Agent v2 核心排期与风险兜底方案
doc_type: prd
progress: 75%
version: v1.2
date: 2025-01-15
stakeholders:
  - 王总 (CEO)
  - 李总 (VP 研发)
expected_solution: 先以核心初筛打通为交付标准，周五前完成联调；数据标注延期部分采用静态规则兜底，确保对客户交付底线
note: 周四需与李总对齐降级方案接口
---

# 招聘 Agent v2 核心排期与风险兜底方案

## 1. 背景与交付底线
针对当前数据标注卡点，核心策略为保证周五客户联调。
核心底线是 **保期交付核心初筛流程**，延期风险通过静态规则库做临时降级兜底。

## 2. 方案与取舍（Trade-off）
- **方案 A（全量上线）**：需延期 3 天，存在严重客户信任危机。
- **方案 B（核心先行）**：保期上线，标注规则静态兜底，下周二静默升级。

> 💡 向上管理提示：先承认未提前对齐风险，拿出 Plan B 方案供领导做选择。

## 3. 跨部门协同与接口冻结
- 与李总团队对接接口文档：周四 18:00 前完成。
- 周五上午 10:00 与王总进行灰度演示。
`;

    const fallbackContent = `---
title: 招聘 Agent 降级与兜底方案 (Plan B)
doc_type: prd
progress: 90%
version: v1.0
date: 2025-01-14
stakeholders:
  - 王总 (CEO)
  - 李总 (VP 研发)
expected_solution: 遇到模型超时或标注缺失时，自动降级为规则匹配模式，保证前端UI不报错且返回保底推荐人选
note: 适用于网络抖动或标注未就绪场景
---

# 招聘 Agent 降级与兜底方案 (Plan B)

## 1. 降级触发条件
- 模型响应时间超过 2500ms
- 简历关键技术标签未在标注库中命中

## 2. 兜底动作与用户体验
- 界面提示：“正在采用标准专业库推荐”
- 保持系统高可用，对外演示不出现 Crash 或死等转圈
`;

    await db.insert(projectArtifacts).values([
      {
        id: "art_prd_core",
        projectId: "recruitment-agent",
        filename: "prd-core-solution.md",
        title: "招聘 Agent v2 核心排期与风险兜底方案",
        docType: "prd",
        frontmatterJson: JSON.stringify({
          title: "招聘 Agent v2 核心排期与风险兜底方案",
          doc_type: "prd",
          progress: "75%",
          version: "v1.2",
          date: "2025-01-15",
          stakeholders: ["王总 (CEO)", "李总 (VP 研发)"],
          expected_solution: "先以核心初筛打通为交付标准，周五前完成联调；数据标注延期部分采用静态规则兜底，确保对客户交付底线",
          note: "周四需与李总对齐降级方案接口",
        }),
        content: prdContent,
        version: "v1.2",
      },
      {
        id: "art_prd_fallback",
        projectId: "recruitment-agent",
        filename: "fallback-plan-b.md",
        title: "招聘 Agent 降级与兜底方案 (Plan B)",
        docType: "prd",
        frontmatterJson: JSON.stringify({
          title: "招聘 Agent 降级与兜底方案 (Plan B)",
          doc_type: "prd",
          progress: "90%",
          version: "v1.0",
          date: "2025-01-14",
          stakeholders: ["王总 (CEO)", "李总 (VP 研发)"],
          expected_solution: "遇到模型超时或标注缺失时，自动降级为规则匹配模式，保证前端UI不报错且返回保底推荐人选",
          note: "适用于网络抖动或标注未就绪场景",
        }),
        content: fallbackContent,
        version: "v1.0",
      },
    ]);
  }

  console.log("Database initialized & seeded successfully!");
}

// 支持直接通过 node / tsx 执行
if (process.argv[1]?.includes("seed.ts")) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Seed error:", err);
      process.exit(1);
    });
}
