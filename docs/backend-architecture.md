# 旁白（PANGBAI）— 后端系统架构与工程落地规范

> **核心设计哲学**：
> 1. **单 Agent 专注深耕**：唯一的 Coach Agent 负责职场策略决策与行动，坚决摒弃形式主义的 Multi-Agent 编排开销；
> 2. **活体世界模型（Living World Model）**：以贝叶斯式行为证据链（Evidence）持续进化「我—领导—项目—关系—事件」的认知，杜绝主观贴死标签；
> 3. **人机协同单键沉淀（Human-in-the-Loop）**：AI 负责预先计算填满所有字段（观察、Pattern、置信度），用户负责单键点击确认，保障核心记忆资产的 100% 客观与受控；
> 4. **双线并行与 Working Document 实时感知**：主对话流与 Canvas 产物画布双向实时通信，文档携带 YAML Frontmatter 元数据作为局部工作区上下文无缝注入大模型；
> 5. **轻量极速架构先行**：首期采用 SQLite + Drizzle ORM + FTS5 全文索引，零额外中间件负担，毫秒级响应，数据完全私有化与本地可控。

---

## 一、系统全景分层架构

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        前端 UI（AppShell / Canvas / Panels）           │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / SSE 流式通信
┌───────────────────────────────────▼────────────────────────────────────┐
│ 1. API & 传输接入层 (Next.js Route Handlers)                           │
│   ├── /api/chat           (流式对话、注入 Working Document 与项目上下文)│
│   ├── /api/artifacts      (文档 CRUD、YAML Frontmatter 解析与校验)      │
│   ├── /api/people         (人物画像、证据链查询、人机协同记忆沉淀确认) │
│   ├── /api/projects       (项目状态、里程碑、风险清单、产物关联)       │
│   └── /api/events         (职场事件录入、FTS5 全文检索)                 │
├────────────────────────────────────────────────────────────────────────┤
│ 2. Coach Agent 认知与运行时层 (Coach Runtime)                          │
│   ├── Context Assembler   (按需拼装 World Model + Canvas 实时工作区)   │
│   ├── Skill Engine        (workplace-coach, meeting-drill, difficult)  │
│   └── Tool Calling        (get_person, search_events, update_model)    │
├────────────────────────────────────────────────────────────────────────┤
│ 3. 职场世界模型与反思引擎 (World Model & Reflection Engine)            │
│   ├── Reflection Engine   (异步反思对话，自动提取客观行为证据)        │
│   ├── Memory Pre-filler   (生成预填完毕的 Candidate 卡片等待单键确认)  │
│   └── 会议推演引擎        (基于 CEO/VP 人物模型生成尖锐追问与破局建议)  │
├────────────────────────────────────────────────────────────────────────┤
│ 4. 产物与知识检索服务 (Artifacts & Retrieval Service)                  │
│   ├── YAML Frontmatter    (解析 expected_solution、progress 等结构化)  │
│   ├── FTS5 全文检索引擎   (秒级匹配历史对话、邮件、会议与证据文本)     │
│   └── Canvas 双向同步     (当前编辑态与版本快照维护)                   │
├────────────────────────────────────────────────────────────────────────┤
│ 5. 持久化存储层 (SQLite + Drizzle ORM)                                │
│   ├── better-sqlite3 / libsql (本地极速单文件，零运维，支持端侧)       │
│   └── Drizzle ORM         (类型安全，原生支持 Schema 迁移与 FTS5 虚拟表)│
└────────────────────────────────────────────────────────────────────────┘
```

---

## 二、数据库模型设计（SQLite + Drizzle ORM）

数据模型围绕职场核心要素展开：用户自身资料、人际网络与人物模型、项目空间与活文档产物、职场流水账事件与证据链、以及待确认的记忆草稿。

```text
               ┌──────────┐
               │  users   │
               └────┬─────┘
                    │ 1:N
        ┌───────────┴───────────┐
        ↓                       ↓
   ┌─────────┐             ┌──────────┐
   │ people  │             │ projects │
   └────┬────┘             └────┬─────┘
        │ 1:N                   │ 1:N
   ┌────┴────────┐         ┌────┴───────────────┐
   ↓             ↓         ↓                    ↓
┌────────────┐ ┌────────┐ ┌───────────────────┐ ┌───────────────┐
│person_model│ │evidence│ │ project_artifacts │ │ project_risks │
└────────────┘ └───┬────┘ └───────────────────┘ └───────────────┘
                   │
                   │ (引用)
                   ↓
              ┌─────────┐
              │ events  │ ◄─── (FTS5 全文搜索 events_fts)
              └─────────┘
```

### 1. 人物与行为证据链（People & Evidence）
```typescript
// src/db/schema/people.ts
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const people = sqliteTable("people", {
  id: text("id").primaryKey(),                     // 唯一标识，如 "wang", "li"
  userId: text("user_id").notNull(),
  name: text("name").notNull(),                    // "王总"
  role: text("role").notNull(),                    // "CEO"
  department: text("department"),                  // "业务与产品部"
  relationshipTone: text("relationship_tone"),     // "偏紧绷" | "稳定协同" | "导师型"
  tensionScore: integer("tension_score").default(50), // 紧张度 0-100%
  advice: text("advice"),                          // 旁白策略备忘
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const personModels = sqliteTable("person_models", {
  id: text("id").primaryKey(),
  personId: text("person_id").notNull().references(() => people.id),
  pattern: text("pattern").notNull(),              // "偏好提前同步风险，极其看重对外交付承诺"
  confidence: real("confidence").notNull(),        // 置信度 0.0 ~ 1.0 (如 0.85)
  evidenceCount: integer("evidence_count").notNull().default(1),
  lastObservedAt: text("last_observed_at"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const evidence = sqliteTable("evidence", {
  id: text("id").primaryKey(),
  personId: text("person_id").notNull().references(() => people.id),
  eventId: text("event_id"),                       // 关联的职场事件 ID
  observation: text("observation").notNull(),      // 客观事实观察
  source: text("source").notNull(),                // "周会现场" | "群聊消息" | "1:1 复盘"
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});
```

### 2. 项目空间与活文档产物（Projects & Artifacts）
```typescript
// src/db/schema/projects.ts
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),                     // 如 "recruitment-agent"
  userId: text("user_id").notNull(),
  name: text("name").notNull(),                    // "招聘 Agent v2"
  status: text("status").notNull().default("in_progress"), // "in_progress" | "risk" | "completed"
  progress: integer("progress").default(0),        // 进度百分比 0-100
  deadline: text("deadline"),                      // "1月31日"
  risksJson: text("risks_json"),                   // JSON 字符串: 风险清单与同步对象
  milestonesJson: text("milestones_json"),         // JSON 字符串: 交付里程碑
  stakeholdersJson: text("stakeholders_json"),     // JSON 字符串: 关联干系人 ID 列表
  advice: text("advice"),                          // 旁白对当前项目的整体策略
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const projectArtifacts = sqliteTable("project_artifacts", {
  id: text("id").primaryKey(),                     // "art_prd_core"
  projectId: text("project_id").notNull().references(() => projects.id),
  filename: text("filename").notNull(),            // "prd-core-solution.md"
  title: text("title").notNull(),                  // "招聘 Agent v2 核心排期与风险兜底方案"
  docType: text("doc_type").notNull(),             // "prd" | "tech_spec" | "retrospective"
  frontmatterJson: text("frontmatter_json"),       // 解析后的结构化元数据 (含 expected_solution)
  content: text("content").notNull(),              // Markdown 全文字符串
  version: text("version").default("v1.0"),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});
```

### 3. 人机协同单键确认记忆表（Memory Candidates）
```typescript
// src/db/schema/memory-candidates.ts
import { sqliteTable, text, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { people } from "./people";

export const memoryCandidates = sqliteTable("memory_candidates", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id"),
  personId: text("person_id").notNull().references(() => people.id),
  observation: text("observation").notNull(),      // AI 预填事实观察
  inferredPattern: text("inferred_pattern").notNull(), // AI 提炼的行为规律
  confidence: real("confidence").notNull(),        // AI 评估置信度 (如 0.85)
  rationale: text("rationale"),                    // 判定依据说明
  status: text("status").notNull().default("pending"), // "pending" | "confirmed" | "dismissed"
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});
```

### 4. 职场事件流水与全文索引（Events & FTS5）
```typescript
// src/db/schema/events.ts
import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const events = sqliteTable("events", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  type: text("type").notNull(),                    // "meeting" | "chat" | "review" | "incident"
  title: text("title").notNull(),
  content: text("content").notNull(),              // 原始富文本内容
  personId: text("person_id"),
  projectId: text("project_id"),
  metadataJson: text("metadata_json"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});
```

---

## 三、核心业务链路设计

### 链路 1：对话流与 Working Document 双向上下文感知
1. **客户端发起调用**：
   前端在 `/api/chat` 中携带：
   ```typescript
   interface ChatRequest {
     conversationId: string;
     messages: { role: string; content: string }[];
     activeProjectId?: string;
     activeCanvas?: {
       id?: string;
       title: string;
       content: string; // 用户当前正在编写或双击编辑的 Markdown 正文
     };
   }
   ```
2. **Context Assembler 组装工作区上下文**：
   - 若存在 `activeProjectId`：读取该项目所有的活文档元数据（包含每篇文档的 `expected_solution` 预期方案）、当前风险、关键干系人世界模型；
   - 若存在 `activeCanvas`：将当前文档的实时正文注入 System Prompt 的 `【当前用户正在编辑的工作文档 Canvas】` 区域；
3. **大模型流式生成**：
   通过 SiliconFlow 调用 DeepSeek-V3（或 DeepSeek-R1 思考模型），保持极低首字延迟；
4. **特殊卡片识别（Structured Protocol）**：
   - 若识别出行为沉淀，流中包含 `<memory_candidate ...>` 标签；
   - 若识别出文档需求，流中包含 `<artifact_suggestion ...>` 标签，前端自动在右侧唤出 Canvas。

### 链路 2：AI 预填反思与单键确认（Human-in-the-Loop）
```text
用户提到工作交互事实（如周会李总关于主库负荷发言）
       ↓
Coach Agent 输出策略建议
       ↓
[异步后台] Reflection Engine 分析本次交互
       ↓
提取到候选观察与规律，自动生成 Memory Candidate 记录 (status: 'pending')
       ↓
对话流中渲染人机协同确认卡片：
  [✓ 确认存入档案]           [✕ 忽略本次]
       ↓
用户点击 [✓ 确认存入档案] ──► 触发 POST /api/people/:id/memory/confirm
       ↓
后端事务落库：
  1. 将 candidate 状态置为 'confirmed'
  2. 写入 evidence 表
  3. 检索 person_models，匹配已有 pattern 累加 confidence 与 evidence_count
  4. 刷新 people.updatedAt
       ↓
前端 UI 侧滑面板中的王总/李总人物画像即时呈现最新规律与证据！
```

### 链路 3：高质量 PRD 方案骨架先行
1. 用户输入：“这期招聘 Agent 风险怎么规避？帮我出一下这期 PRD 方案”；
2. Agent 执行规约：
   - **绝不机械输出几千字冗长空洞的套话**；
   - **第一步：先给出预期方案（Expected Solution）与 Trade-off 取舍**（保交付底线 vs 全量延后）；
   - **第二步：给出结构清晰的三级骨架大纲**；
   - **第三步：附带规范 YAML Frontmatter**；
3. 输出包含骨架卡片，用户点击 `[📝 载入到 Canvas 补充细节 ↗]`，Canvas 自动在右侧开启并载入该 Markdown 模板，用户只需补充细节。

### 链路 4：会议多方连环追问模拟推演
1. 会议面板加载时，调用 `/api/meetings/:id/drill`；
2. 依据参会人的真实世界模型（如 CEO 王总关注确定性交付 vs 研发 VP 李总关注技术负荷），生成最具杀伤力的现场发难追问与 Coach 破局解法；
3. 用户点击 `[🎭 模拟演练此题 ↗]`，对话区切换为 Rehearsal 演练模式，Coach Agent 自动代入该角色身份与用户进行实战推演。

---

## 四、项目工程代码目录规范

```text
src/
├── app/
│   └── api/
│       ├── chat/route.ts                    # 流式对话与 Working Document 上下文注入
│       ├── artifacts/
│       │   ├── route.ts                     # 文档列表与新建
│       │   └── [id]/route.ts                # 文档更新 (带 Frontmatter 解析与校验)
│       ├── people/
│       │   ├── route.ts                     # 人物列表与画像查询
│       │   └── [id]/
│       │       ├── route.ts                 # 人物详细与证据链
│       │       └── memory/
│       │           └── confirm/route.ts     # 人机协同记忆单键确认落库
│       ├── projects/
│       │   ├── route.ts                     # 项目空间与风险列表
│       │   └── [id]/route.ts                # 项目详情与关联产物
│       └── events/
│           ├── route.ts                     # 事件录入
│           └── search/route.ts              # FTS5 全文搜索接口
│
├── server/                                  # 核心业务域服务（Node.js 服务端专用）
│   ├── agent/
│   │   ├── coach.ts                         # Coach Agent 主运行时
│   │   ├── context-assembler.ts             # World Model + Canvas 上下文拼装器
│   │   ├── prompt-templates.ts              # 杂志风与高情商导师 System Prompt
│   │   └── skills/                          # 渐进式程序性知识 Markdown
│   │       ├── workplace-coach.md
│   │       ├── meeting-drill.md
│   │       └── difficult-conversation.md
│   │
│   ├── world-model/
│   │   ├── people-service.ts                # 人物画像计算与证据链管理
│   │   ├── reflection-engine.ts             # 异步记忆反思与 Candidate 提炼
│   │   └── meeting-simulator.ts             # 会议多方尖锐追问推演器
│   │
│   └── artifacts/
│       ├── frontmatter-parser.ts            # YAML 容错解析与 Frontmatter 校验
│       └── skeleton-templates.ts            # PRD / 方案 / 复盘标准架构模板
│
└── db/                                      # 数据库与持久化层
    ├── client.ts                            # SQLite 客户端单例 (better-sqlite3)
    ├── schema/                              # Drizzle Schema 定义
    │   ├── index.ts
    │   ├── people.ts
    │   ├── projects.ts
    │   ├── artifacts.ts
    │   ├── memory-candidates.ts
    │   └── events.ts
    ├── seed.ts                              # 种子数据（预置王总、李总、招聘 Agent 项目）
    └── migrations/                          # Drizzle 迁移目录
```

---

## 五、分阶段落地演进路线

| 阶段 | 核心任务 | 交付产物与验证标准 |
|:---|:---|:---|
| **Phase 1: 数据层与核心闭环（当前步骤）** | 1. 引入 Drizzle ORM + SQLite (`better-sqlite3`)<br>2. 建立 Schema 与数据库初始化 Seed 脚本<br>3. 实现 Context Assembler（集成项目与 Canvas 实时感知）<br>4. 实现人机协同记忆沉淀 API (`/confirm`) | 纯代码打通真实数据库：能够从 DB 读取人物与产物，并在对话后一键确认将记忆存入真实 SQLite，页面刷新后数据依然保持。 |
| **Phase 2: 职场反思与主动推演** | 1. 完善后台 Reflection Engine，实现自动从对话提炼 Candidate<br>2. 会议推演引擎落库，基于人物真实证据链动态生成尖锐追问<br>3. 接入 SQLite FTS5 全文检索，赋能 ⌘K 快速搜索万物 | 在对话中提到新事件，AI 自动预填并弹出确认卡片；点击确认后即刻更新人物面板；⌘K 支持毫秒级全文匹配。 |
| **Phase 3: 自动化与扩展演进** | 1. 轻量定时任务 Scheduler（开会前 2 小时主动提醒）<br>2. 导出导入备份（Markdown / SQLite 文件导出）<br>3. 多人协作或本地模型（Ollama）可选接入 | 支持本地脱网单机离线运行，具备主动定时提醒能力。 |
