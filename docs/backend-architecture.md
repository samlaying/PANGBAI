# 旁白（PANGBAI）— 后端系统架构与工程落地规范

> **核心设计哲学**：
> 1. **单 Agent 专注深耕**：唯一的 Coach Agent 负责职场策略决策与行动，坚决摒弃形式主义的 Multi-Agent 编排开销；
> 2. **活体世界模型（Living World Model）**：以贝叶斯式行为证据链（Evidence）持续进化「我—领导—项目—关系—事件」的认知，杜绝主观贴死标签；
> 3. **人机协同单键沉淀（Human-in-the-Loop）**：AI 负责预先计算填满所有字段（观察、Pattern、置信度），用户负责单键点击确认，保障核心记忆资产的 100% 客观与受控；
> 4. **双线并行与 Working Document 实时感知**：主对话流与 Canvas 产物画布双向实时通信，文档携带 YAML Frontmatter 元数据作为局部工作区上下文无缝注入大模型；
> 5. **轻量极速架构先行**：采用 Supabase Cloud PostgreSQL + Drizzle ORM（`pgTable`），未配置 `DATABASE_URL` 时自动降级为进程内 PGlite（纯内存 PostgreSQL 兼容引擎，离线单测零网络依赖），零额外中间件负担。

---

## 一、系统全景分层架构

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        前端 UI（AppShell / Canvas / Panels）           │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / 纯文本流式（兼容 SSE）
┌───────────────────────────────────▼────────────────────────────────────┐
│ 1. API & 传输接入层 (Next.js Route Handlers)                           │
│   ├── /api/chat           (流式对话、注入 Working Document 与项目上下文)│
│   ├── /api/artifacts      (文档 CRUD 与 [id] 更新、Frontmatter 解析)    │
│   ├── /api/people         (画像与证据链查询、[id]/memory/confirm 沉淀) │
│   └── /api/projects       (项目状态、里程碑、风险清单、产物关联)       │
├────────────────────────────────────────────────────────────────────────┤
│ 2. Coach Agent 认知与运行时层 (Coach Runtime)                          │
│   ├── Context Assembler   (按需拼装 World Model + Canvas 实时工作区)   │
│   ├── 格式契约 (已实现)   (YAML→Canvas、>引用→话术、[人](person:id)深链)│
│   └── Tool Calling        (规划中：get_person / search_events 等真实FC)│
├────────────────────────────────────────────────────────────────────────┤
│ 3. 职场世界模型与反思引擎 (World Model & Reflection Engine)            │
│   ├── 记忆确认闭环 (已实现) (memory_candidates + /confirm 事务落库)    │
│   ├── 自动因果演进 (已实现) (流结束后提及人物 → 置信度演进、补写证据) │
│   └── 会议推演引擎        (规划中，会议面板当前为空状态)               │
├────────────────────────────────────────────────────────────────────────┤
│ 4. 产物与知识检索服务 (Artifacts & Retrieval Service)                  │
│   ├── YAML Frontmatter    (解析 expected_solution、progress 等结构化)  │
│   ├── 全文检索            (规划中：PostgreSQL 全文检索 / pgvector)     │
│   └── Canvas 双向同步     (当前编辑态与版本快照维护)                   │
├────────────────────────────────────────────────────────────────────────┤
│ 5. 持久化存储层 (PostgreSQL + Drizzle ORM)                             │
│   ├── Supabase Cloud PG   (postgres-js + Supavisor 事务池, prepare:false)│
│   ├── PGlite 内嵌降级     (无 DATABASE_URL 时纯内存，语法 100% 一致)   │
│   └── Drizzle ORM (pgTable) + llm_call_traces 可观测留底               │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 二、数据库模型设计（SQLite + Drizzle ORM）

数据模型围绕职场核心要素展开：人际网络与人物模型、项目空间与活文档产物、职场流水账事件与证据链、待确认的记忆草稿，以及会话/消息留痕与 LLM 调用 Trace。全部表以 Drizzle `pgTable` 定义于 `src/db/schema/`；云端为 Supabase PostgreSQL，离线单测走 PGlite（`src/db/client.ts` 双模式连接，PGlite 分支内嵌建表 DDL）。

```text
people ──1:N──▶ person_models          （行为模式 pattern + 置信度 + 证据计数）
  ├───1:N──▶ evidence                  （因果证据链；event_id 可引用 events）
  └───1:N──▶ memory_candidates         （待确认记忆草稿）

projects ──1:N──▶ project_artifacts    （Canvas 活文档，frontmatter_json）
  ├───1:N──▶ sessions ──1:N──▶ messages（parts_json 存 MessagePart[]）
  ├───1:N──▶ llm_call_traces           （TTFT / tokens / latency 调用留底）
  └───1:N──▶ project_search_snapshots  （项目检索快照）

events                                （职场事件流水；暂无全文索引，检索为规划项）
```

### 1. 人物与行为证据链（People & Evidence）
```typescript
// src/db/schema/people.ts
import { pgTable, text, integer, real, timestamp } from "drizzle-orm/pg-core";

export const people = pgTable("people", {
  id: text("id").primaryKey(),                     // 唯一ID，如 "wang", "li", "zhang"
  userId: text("user_id").notNull().default("default_user"),
  name: text("name").notNull(),                    // "王总"
  role: text("role").notNull(),                    // "CEO"
  department: text("department"),                  // "业务与产品部"
  relationshipTone: text("relationship_tone"),     // "偏紧绷" | "稳定协同" | "技术把关"
  tensionScore: integer("tension_score").default(50), // 关系紧张度 0-100
  advice: text("advice"),                          // 旁白整体策略备忘
  createdAt: timestamp("created_at", { mode: "string", withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string", withTimezone: true }).defaultNow(),
});

export const personModels = pgTable("person_models", {
  id: text("id").primaryKey(),
  personId: text("person_id").notNull().references(() => people.id, { onDelete: "cascade" }),
  pattern: text("pattern").notNull(),              // "偏好提前同步风险，极其看重对外交付承诺"
  confidence: real("confidence").notNull(),        // 置信度 (0.0 ~ 1.0)
  evidenceCount: integer("evidence_count").notNull().default(1),
  lastObservedAt: text("last_observed_at"),
  createdAt: timestamp("created_at", { mode: "string", withTimezone: true }).defaultNow(),
});

export const evidence = pgTable("evidence", {
  id: text("id").primaryKey(),
  personId: text("person_id").notNull().references(() => people.id, { onDelete: "cascade" }),
  projectId: text("project_id"),                   // 关联的项目 (让事实沉淀到具体项目中)
  eventId: text("event_id"),                       // 关联的职场事件ID (可空)
  observation: text("observation").notNull(),      // 客观事实观察
  rationale: text("rationale"),                    // AI 心理推断依据（为什么由此判断其性格动机）
  inferredPatternId: text("inferred_pattern_id"),  // 支撑的行为模式 ID
  source: text("source").notNull(),                // "周会现场" | "群聊消息" | "1:1 复盘"
  dateStr: text("date_str"),                       // 如 "今天 14:30", "7月8日"
  createdAt: timestamp("created_at", { mode: "string", withTimezone: true }).defaultNow(),
});
```

### 2. 项目空间与活文档产物（Projects & Artifacts）
```typescript
// src/db/schema/projects.ts
import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";

export const projects = pgTable("projects", {
  id: text("id").primaryKey(),                     // 如 "recruitment-agent"
  userId: text("user_id").notNull().default("default_user"),
  name: text("name").notNull(),                    // "招聘 Agent v2"
  status: text("status").notNull().default("in_progress"), // "in_progress" | "risk" | "completed"
  progress: integer("progress").default(0),        // 进度百分比 0-100
  deadline: text("deadline"),                      // "1月31日"
  risksJson: text("risks_json"),                   // JSON: Array<{ id, title, note, syncTarget }>
  milestonesJson: text("milestones_json"),         // JSON: Array<{ name, date, done, isRisk }>
  stakeholdersJson: text("stakeholders_json"),     // JSON: Array<{ id, name, role }>
  advice: text("advice"),                          // 旁白对当前项目的策略建议
  createdAt: timestamp("created_at", { mode: "string", withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string", withTimezone: true }).defaultNow(),
});

export const projectArtifacts = pgTable("project_artifacts", {
  id: text("id").primaryKey(),                     // 如 "art_prd_core"
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  filename: text("filename").notNull(),            // 如 "prd-core-solution.md"
  title: text("title").notNull(),                  // 如 "招聘 Agent v2 核心排期与风险兜底方案"
  docType: text("doc_type").notNull().default("prd"), // "prd" | "tech_spec" | "retrospective"
  frontmatterJson: text("frontmatter_json"),       // JSON: parsed YAML frontmatter
  content: text("content").notNull(),              // Markdown 全文内容
  version: text("version").default("v1.0"),
  updatedAt: timestamp("updated_at", { mode: "string", withTimezone: true }).defaultNow(),
});
```

### 3. 人机协同单键确认记忆表（Memory Candidates）
```typescript
// src/db/schema/memory-candidates.ts
import { pgTable, text, real, timestamp } from "drizzle-orm/pg-core";
import { people } from "./people";

export const memoryCandidates = pgTable("memory_candidates", {
  id: text("id").primaryKey(),                     // 如 "cand_123"
  conversationId: text("conversation_id"),
  projectId: text("project_id"),                   // 关联的项目
  personId: text("person_id").notNull().references(() => people.id, { onDelete: "cascade" }),
  observation: text("observation").notNull(),      // AI 预填事实观察
  inferredPattern: text("inferred_pattern").notNull(), // AI 归纳的 Pattern
  confidence: real("confidence").notNull(),        // 置信度 (0.0 ~ 1.0)
  rationale: text("rationale"),                    // 判定理由
  status: text("status").notNull().default("pending"), // "pending" | "confirmed" | "dismissed"
  createdAt: timestamp("created_at", { mode: "string", withTimezone: true }).defaultNow(),
});
```

### 4. 职场事件流水（Events）
```typescript
// src/db/schema/events.ts
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const events = pgTable("events", {
  id: text("id").primaryKey(),                     // 如 "evt_001"
  userId: text("user_id").notNull().default("default_user"),
  type: text("type").notNull(),                    // "meeting" | "chat" | "review" | "incident"
  title: text("title").notNull(),
  content: text("content").notNull(),              // 原始富文本内容
  personId: text("person_id"),                     // 关联干系人
  projectId: text("project_id"),                   // 关联项目
  metadataJson: text("metadata_json"),             // JSON 扩展字段
  createdAt: timestamp("created_at", { mode: "string", withTimezone: true }).defaultNow(),
});
```
> 全文索引（原 SQLite FTS5 方案）尚未实现；迁移 PostgreSQL 后以全文检索 / pgvector 为规划方向。

### 5. 会话留痕与 LLM 调用 Trace（Sessions & Traces）
```typescript
// src/db/schema/sessions.ts（节选）
export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  title: text("title").notNull().default("新对话"),
  sessionType: text("session_type").notNull().default("coaching"), // "coaching" | "rehearsal" | ...
  activeCanvasId: text("active_canvas_id").references(() => projectArtifacts.id, { onDelete: "set null" }),
  metadataJson: text("metadata_json"),
  createdAt: timestamp("created_at", { mode: "string", withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string", withTimezone: true }).defaultNow(),
});

export const messages = pgTable("messages", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  role: text("role").notNull(),                    // "user" | "assistant" | "system"
  partsJson: text("parts_json").notNull(),         // JSON: Array<MessagePart>
  timestampStr: text("timestamp_str"),
  createdAt: timestamp("created_at", { mode: "string", withTimezone: true }).defaultNow(),
});
```
```typescript
// src/db/schema/traces.ts（节选）—— 每次对话流结束后异步写入
export const llmCallTraces = pgTable("llm_call_traces", {
  id: text("id").primaryKey(),
  traceId: text("trace_id").notNull(),
  projectId: text("project_id").references(() => projects.id, { onDelete: "cascade" }),
  sessionId: text("session_id").references(() => sessions.id, { onDelete: "cascade" }),
  messageId: text("message_id"),
  modelName: text("model_name").notNull(),
  promptTokens: integer("prompt_tokens").default(0),      // 按 len/3 粗估
  completionTokens: integer("completion_tokens").default(0),
  totalTokens: integer("total_tokens").default(0),
  estimatedCostCny: real("estimated_cost_cny").default(0),
  ttftMs: integer("ttft_ms"),                             // 首 token 延迟
  totalLatencyMs: integer("total_latency_ms").notNull(),
  status: text("status").notNull().default("success"),
  metadataJson: text("metadata_json"),
  createdAt: timestamp("created_at", { mode: "string", withTimezone: true }).defaultNow(),
});

export const projectSearchSnapshots = pgTable("project_search_snapshots", { /* 检索快照 */ });
```

---

## 三、核心业务链路设计

### 链路 1：对话流与 Working Document 双向上下文感知
1. **客户端发起调用**：
   前端在 `/api/chat` 中携带（见 `src/app/api/chat/route.ts`）：
   ```typescript
   interface ChatRequest {
     messages: { role: string; content: string }[]; // 历史（assistant 侧折叠为"已提供建议"以省 token）
     sessionId?: string;
     sessionTitle?: string;
     projectId?: string;           // 或 activeProject?.id 二选一
     activeProject?: { id: string } & Record<string, unknown>;
     activeCanvas?: {              // 用户当前正在编写或双击编辑的 Markdown 正文
       id?: string;
       title: string;
       content: string;
       doc_type?: string;
     };
     profile?: Partial<WorkspaceProfile>; // 工作区画像（名称 / 行业 / 辅导风格）
   }
   ```
2. **Context Assembler 组装工作区上下文**：
   - 若存在 `activeProjectId`：读取该项目所有的活文档元数据（包含每篇文档的 `expected_solution` 预期方案）、当前风险、关键干系人世界模型；
   - 若存在 `activeCanvas`：将当前文档的实时正文注入 System Prompt 的 `【当前用户正在编辑的工作文档 Canvas】` 区域；
3. **大模型流式生成**：
   通过 SiliconFlow 调用 DeepSeek-V3（或 DeepSeek-R1 思考模型），保持极低首字延迟；
4. **特殊卡片识别（格式契约，Format-as-Action）**：
   - 响应为 `text/plain` 纯文本流；前端 `SSETransport` 兼容纯文本与标准 SSE 双模式，将 chunk 规范化为 `message.delta` 事件；
   - `BlockParser` 流式识别三种格式契约：YAML Frontmatter（→ `artifact` Part，前端自动在右侧唤出 Canvas）、`>` 引用块（→ 可复制话术卡片）、`[姓名](person:id)`（→ 实体深链，穿透人物面板 / 证据弹窗）；
   - `tool.*` / `memory.candidate` / `ui.generative` 等结构化事件已在 `src/infra/transport/agent-protocol.ts` 预留，当前服务端尚未发出（待接入真实 Function Calling）。

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

### 链路 4：会议多方连环追问模拟推演（规划中，尚未实现）

> 当前无 `/api/meetings` 路由，会议面板无数据来源，页面显示空状态（见 README）。以下为设计目标：

1. 会议面板加载时，调用 `/api/meetings/:id/drill`（规划）；
2. 依据参会人的真实世界模型（如 CEO 王总关注确定性交付 vs 研发 VP 李总关注技术负荷），生成最具杀伤力的现场发难追问与 Coach 破局解法；
3. 用户点击 `[🎭 模拟演练此题 ↗]`，对话区切换为 Rehearsal 演练模式，Coach Agent 自动代入该角色身份与用户进行实战推演。

---

## 四、项目工程代码目录规范

```text
src/
├── app/
│   ├── layout.tsx / page.tsx                # AppShell 挂载点
│   └── api/
│       ├── chat/route.ts                    # 流式对话：上下文装配 + 纯文本流 + 流后异步落库
│       ├── artifacts/
│       │   ├── route.ts                     # 文档列表与新建
│       │   └── [id]/route.ts                # 文档更新 (带 Frontmatter 解析)
│       ├── people/
│       │   ├── route.ts                     # 人物列表与画像查询
│       │   └── [id]/
│       │       ├── route.ts                 # 人物详细与证据链
│       │       └── memory/confirm/route.ts  # 人机协同记忆单键确认落库
│       └── projects/
│           ├── route.ts                     # 项目空间与风险列表
│           └── [id]/route.ts                # 项目详情与关联产物
│
├── server/                                  # 核心业务域服务（Node.js 服务端专用）
│   ├── agent/context-assembler.ts           # World Model + Canvas 上下文拼装器（含 Coach 基座 Prompt）
│   ├── world-model/people-service.ts        # 画像查询 + confirmMemoryToDatabase 事务
│   └── artifacts/frontmatter.ts             # YAML Frontmatter 容错解析
│   # 规划项（尚未落码）：skills/、reflection-engine、meeting-simulator、skeleton-templates
│
├── business/                                # 前端领域层（纯 TS，零 React，详见 docs/frontend-architecture.md）
│   ├── bus/agent-bus.ts                     # 发布订阅事件总线
│   ├── entities/                            # AgentSession / SessionManager / MessagePart / WorkspaceManager
│   └── parser/block-parser.ts               # 流式 Markdown → Parts 解析器
│
├── infra/                                   # 前端基础设施层（零业务感知）
│   ├── transport/                           # SSETransport + agent-protocol 事件协议
│   ├── api/                                 # api-client / workspace-api
│   └── storage/client-storage.ts            # LocalStorage 容错读写
│
├── components/ + hooks/                     # 表现层（Editorial 杂志风 UI + React 适配器）
│
├── config/
│   ├── prompt-templates.ts                  # 场景模版（代码级配置，非 UI CRUD）
│   └── workspace-profile.ts                 # 工作区画像（行业 / 辅导风格 → prompt 映射）
│
├── db/                                      # 数据库与持久化层
│   ├── client.ts                            # postgres-js (Supabase) / PGlite 双模式连接单例
│   ├── schema/                              # Drizzle pgTable：people / projects / sessions / traces / events / ...
│   └── migrate.ts                           # SQLite 时代遗留（better-sqlite3 DDL，当前无调用方，待清理）
│
└── lib/                                     # types.ts / chat-protocol.ts / records.ts

tests/                                       # node --import tsx --test（19 用例 / 3 文件）
```

---

## 五、分阶段落地演进路线

| 阶段 | 核心任务 | 交付产物与验证标准 |
|:---|:---|:---|
| **Phase 1: 数据层与核心闭环（已完成）** | 1. Drizzle ORM + Supabase PostgreSQL（`pgTable`），PGlite 离线降级<br>2. Schema 经 `npm run db:push` 同步，PGlite 分支内嵌建表 DDL<br>3. Context Assembler 已实现（画像 / 干系人 / 项目 / Canvas JIT 注入）<br>4. 人机协同记忆沉淀 API（`/confirm`，事务 + 幂等）已实现 | ✅ 从 DB 读取人物与产物；创建、编辑和确认操作写入 PostgreSQL，页面刷新后数据保持。 |
| **Phase 2: 职场反思与主动推演（进行中）** | 1. 后台 Reflection Engine：自动从对话提炼 Candidate（当前仅有对话后自动因果演进雏形，见 `chat/route.ts` 的 `onStreamFinished`）<br>2. 会议推演引擎落库，基于人物真实证据链动态生成尖锐追问<br>3. 接入 PostgreSQL 全文检索 / pgvector，赋能 ⌘K 快速搜索万物 | 在对话中提到新事件，AI 自动预填并弹出确认卡片；点击确认后即刻更新人物面板；⌘K 支持毫秒级全文匹配。 |
| **Phase 3: 自动化与扩展演进** | 1. 轻量定时任务 Scheduler（开会前 2 小时主动提醒）<br>2. 导出导入备份（Markdown / 数据库文件导出）<br>3. 多人协作或本地模型（Ollama）可选接入 | 支持本地脱网单机离线运行，具备主动定时提醒能力。 |
