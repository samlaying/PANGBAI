# 🏗️ AI 职场导师 — 最终完整技术栈

> **架构哲学：一个 Coach Agent + Skills + Tools + 持久化工作世界模型 + Harness**
>
> 不做 Multi-Agent 平台，不做架构先行，一切被真实场景逼出来再加。

---

## 一、系统总览

```text
┌─────────────────────────────────────────────────────────────────┐
│                        AI 职场导师                                │
│                                                                 │
│   对话 ─ 项目 ─ 人物 ─ 会议 ─ 记忆 ─ 主动提醒 ─ 成长             │
└────────────────────────────┬────────────────────────────────────┘
                             │
                      Next.js Web App
                             │
                ┌────────────┴────────────┐
                │                         │
          Frontend UI               Backend API
                │                         │
         React + Tailwind           TypeScript
         shadcn/ui + Radix          Next.js Route Handlers
                │                         │
                └────────────┬────────────┘
                             │
                     ┌───────▼────────┐
                     │  Agent Runtime │
                     │ DeepSeek       │
                     │ Harness        │
                     └───────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
           Skills         Tools          Memory
              │              │              │
           SKILL.md      TypeScript      SQLite
           (渐进式披露)    Functions      + Drizzle
              │              │           + FTS5
              │              │              │
              └──────────────┼──────────────┘
                             │
                   Workplace World Model
                             │
        ┌──────────┬─────────┼─────────┬──────────┐
        │          │         │         │          │
      People    Projects  Relations  Events    Evidence
        │          │         │         │          │
        └──────────┴─────────┼─────────┴──────────┘
                             │
                     Background Jobs
                             │
                  Scheduler / Event Loop
                             │
              主动提醒 ─ 复盘 ─ Memory Reflection
```

---

## 二、技术栈总表

| 层 | 技术 | 说明 |
|:---|:---|:---|
| **Web 框架** | **Next.js 15 (App Router)** | 全栈统一，前后端同仓 |
| **语言** | **TypeScript** | 全栈统一 |
| **UI** | **React 18** | |
| **CSS** | **Tailwind CSS** | |
| **组件库** | **shadcn/ui + Radix UI** | 可控、可定制 |
| **表单** | **React Hook Form** | |
| **校验** | **Zod** | 前后端共享 schema |
| **数据获取** | **TanStack Query** | 前端缓存 / 请求管理 |
| **Server** | **Next.js Route Handlers** | 不拆微服务 |
| **Agent Runtime** | **DeepSeek Harness** | Agent loop / session / tool call / trace |
| **Agent** | **1 个 Coach Agent** | 单 Agent + 多 Skill |
| **Skills** | **SKILL.md** | 渐进式披露，程序性知识 |
| **Tools** | **TypeScript Functions** | 10~15 个核心 Tool |
| **LLM** | **ModelProvider 统一抽象** | DeepSeek / Claude / GPT / Qwen 可切换 |
| **数据库** | **SQLite (better-sqlite3)** | 轻量、零配置、嵌入式 |
| **ORM** | **Drizzle ORM** | 类型安全、迁移友好 |
| **全文搜索** | **SQLite FTS5** | 人名、项目、事件检索 |
| **Memory** | **自研 World Model** | Episodic + Semantic + Relationship |
| **Event** | **SQLite Event Log** | 所有工作事件可追溯 |
| **Reflection** | **TypeScript + LLM 调用** | 从 Event → Evidence → Pattern |
| **Scheduler** | **Harness Scheduler / Cron** | 定时检查、主动提醒 |
| **Background** | **Harness Loop / Worker** | 异步 reflection、proactive |
| **Trace** | **Harness Trace** | 开发调试必备 |
| **Eval** | **自建 Eval Dataset** | 50~100 个真实场景 |
| **单测** | **Vitest** | |
| **E2E** | **Playwright** | |
| **部署** | **Vercel（首选）/ Docker** | |
| **生产数据库（后期）** | **PostgreSQL** | |
| **向量搜索（后期）** | **pgvector** | |
| **可观测性（后期）** | **OpenTelemetry / Langfuse** | |

---

## 三、各层详细设计

### 3.1 前端

```
src/app/
├── layout.tsx
├── page.tsx                    # Chat（入口）
├── chat/
│   └── [sessionId]/
├── people/
│   ├── page.tsx                # 人物列表
│   └── [personId]/
│       ├── page.tsx            # 人物详情
│       ├── evidence/           # 行为证据
│       └── timeline/           # 互动时间线
├── projects/
│   ├── page.tsx
│   └── [projectId]/
├── relationships/
├── meetings/
├── memories/
├── growth/                     # 我的成长
└── settings/
```

**核心原则：Chat 只是入口，不是全部。**

前端要呈现的是一个 **持续理解你的工作环境的 AI**，所以：
- People 页面展示 AI 建立的人物画像 + 证据链
- Project 页面展示项目风险、参与者关系
- Growth 页面展示 AI 对你的建议和成长轨迹
- Memories 页面可以查看、编辑、删除 AI 记住的内容

---

### 3.2 后端

```
src/
├── app/
│   └── api/
│       ├── chat/               # 对话入口
│       ├── people/
│       ├── projects/
│       ├── relationships/
│       ├── memories/
│       └── events/
│
├── agent/
│   ├── coach.ts                # Coach Agent 主体
│   ├── skills/
│   │   ├── workplace-coach/
│   │   │   ├── SKILL.md
│   │   │   ├── reference.md
│   │   │   └── scripts/
│   │   ├── people-model/
│   │   │   └── SKILL.md
│   │   ├── relationship-coach/
│   │   │   └── SKILL.md
│   │   ├── meeting-coach/
│   │   │   └── SKILL.md
│   │   ├── difficult-conversation/
│   │   │   └── SKILL.md
│   │   ├── memory-reflection/
│   │   │   └── SKILL.md
│   │   └── human-response/
│   │       └── SKILL.md
│   ├── tools/
│   │   ├── people.ts
│   │   ├── projects.ts
│   │   ├── relationships.ts
│   │   ├── events.ts
│   │   ├── memory.ts
│   │   └── evidence.ts
│   └── prompts/
│       └── system.ts
│
├── domain/
│   ├── people/
│   ├── projects/
│   ├── relationships/
│   ├── memories/
│   ├── events/
│   └── evidence/
│
├── db/
│   ├── schema.ts               # Drizzle schema
│   ├── client.ts               # SQLite connection
│   ├── queries/
│   └── migrations/
│
├── model/
│   ├── provider.ts             # ModelProvider 统一接口
│   ├── deepseek.ts
│   ├── claude.ts
│   └── openai.ts
│
├── reflection/
│   ├── engine.ts               # Reflection 主流程
│   ├── evidence-extractor.ts   # 提取证据
│   └── pattern-detector.ts     # 发现规律
│
└── jobs/
    ├── scheduler.ts
    ├── reflection.ts           # 定期 Memory Reflection
    ├── reminders.ts            # 会议/截止日提醒
    └── proactive.ts            # 主动建议
```

---

### 3.3 Agent Runtime — DeepSeek Harness

**定位：Harness 是 Agent 的运行时，不是你的产品架构。**

Harness 负责：
| 能力 | 说明 |
|:---|:---|
| Agent loop | 多轮推理、自主决定调用什么 |
| Session | 会话管理 |
| Context | 上下文组装（Skill + Memory + History） |
| Tool calling | 执行 Tools |
| Skill loading | 渐进式加载 SKILL.md |
| Execution trace | 全链路追踪 |
| State | Agent 中间状态 |
| Long-running tasks | 长任务支持 |
| Replay / Debug | 回放调试 |

**关键隔离原则：**

```text
你的代码永远通过自己的抽象层访问 Harness：

src/agent/
  ├── coach.ts          ← 你的业务逻辑
  ├── skills/           ← 你的 Skill
  ├── tools/            ← 你的 Tool
  └── runtime.ts        ← 唯一接触 Harness API 的地方
```

以后换 Runtime（OpenAI Agents SDK / Claude Agent SDK / 自研）**不影响任何业务代码**。

---

### 3.4 Model Provider 抽象

```typescript
// src/model/provider.ts
interface ModelProvider {
  generate(messages: Message[], options?: GenerateOptions): Promise<Response>;
  stream(messages: Message[], options?: GenerateOptions): AsyncIterator<Chunk>;
  toolCall(messages: Message[], tools: Tool[]): Promise<ToolCall[]>;
}

// 实现
class DeepSeekProvider implements ModelProvider { ... }
class ClaudeProvider implements ModelProvider { ... }
class OpenAIProvider implements ModelProvider { ... }
```

你的 Agent 只关心 `generate() / stream() / toolCall()`，**绝不写 `if model === "deepseek"`**。

---

### 3.4.1 单次对话交互的完整后端管线（从输入到流式 Block）

每次用户发送一条消息，后端经历标准的 **4 步流水线**，既保证了如 ChatGPT 般的即时流式自然感，又能直接驱动前端呈现杂志级的结构化组件（建议话术卡片、实体超链接、折叠证据）：

```text
[用户输入: "王总刚才在群里问为什么还没做完..."]
    │
    ▼
【Step 1: 实体识别与意图提取 (Entity & Intent Extraction)】
  • 抽取涉事人物（王总）、当前项目（招聘 Agent v2）、情境（群聊公开质询 / 延期冲突）
    │
    ▼
【Step 2: 职场世界模型检索 (World Model Retrieval)】
  • 本地 SQLite 查询人物偏好与历史证据：
    - 王总模式：偏好提前同步风险（置信度 82%）
    - 历史证据：7月8日延期事件、当前张力 65
    │
    ▼
【Step 3: 职场导师技能推理 (Coach Skill & Prompt Orchestration)】
  • 挂载 Coach SOP 提示词，按职场教练认知框架推理：
    1. 【共情定心】：剖析领导本质在意的并非进度本身，而是未知风险暴露时的失控感；
    2. 【事实支撑】：关联历史证据模式，建立认知可信度；
    3. 【破局话术】：生成可直接一键复制发出的结构化回复（认问题 + 明确交付时间线 + 后续同步机制）；
    4. 【闭环准备】：引导后续追问与场景演练。
    │
    ▼
【Step 4: 流式输出与 Block 实时解析 (Streaming Blocks)】
  • 后端通过 SSE 输出带轻量标记的 Markdown：
    - 段落文字（识别 `[王总](person:wang)` 自动高亮为可打开侧栏的实体超链接）
    - 引用块（`> ...` 自动渲染为带一键复制的建议话术卡片 PullQuote）
    - 动作项（自动附加建议、案例、演练快捷按钮）
  • 前端接收流式文本并实时解析为 Editorial Blocks，彻底解决“排版太重导致后端难以落地”的顾虑。
```

---

### 3.4.2 模型服务接入与 Working Document 上下文感知协议

系统采用行业标准的 OpenAI 兼容协议接入主流模型服务（默认接入 SiliconFlow 云端托管的 DeepSeek 系列大模型）：

```typescript
// .env.local 规范
SILICONFLOW_API_KEY="sk-..."
SILICONFLOW_BASE_URL="https://api.siliconflow.cn/v1"
DEFAULT_MODEL="deepseek-ai/DeepSeek-V3" // 或 Pro/deepseek-ai/DeepSeek-R1 / DeepSeek-V4-Flash

// 请求 payload 包含项目与 Canvas 实时状态
interface ChatRequestBody {
  conversationId: string;
  message: string;
  projectId?: string; // 挂载的项目上下文
  activeCanvas?: {
    filename: string;
    content: string; // 用户当前正在编辑的 PRD/方案/会议纪要 Markdown 内容
  };
}
```

**双向感知链路：**
1. 用户在 Canvas 中修改 Markdown 或切换文档；
2. 发送对话时，前端自动携带 `activeCanvas.content`；
3. 后端 Agent 将当前文档内容作为局部工作区上下文（Working Document Context）注入 System Prompt；
4. Agent 据此给出针对性的章节润色、冲突预警、方案拆解及修改建议；
5. Agent 若在对话中输出文档骨架或更新建议（`artifact_suggestion`），前端自动在右侧展开 Canvas，并支持一键载入就绪。

---

### 3.4.3 项目产物挂载与 YAML Frontmatter 结构化检索规范

产品经理的核心产出是文档（竞品分析报告、PRD 文档、复盘报告、排期方案）。所有挂载在项目下的文档均以标准 Markdown 存储，头部强制声明结构化 YAML Frontmatter，以便检索、模型感知与可视化卡片解析：

```yaml
---
title: 招聘 Agent v2 核心排期与风险兜底方案
doc_type: prd # prd | tech_spec | competitive_analysis | meeting_notes | retrospective
progress: 75%
version: v1.2
date: 2025-01-15
stakeholders:
  - 王总 (CEO)
  - 李总 (VP 研发)
expected_solution: 先以核心初筛打通为交付标准，周五前完成联调；数据标注延期部分采用静态规则兜底，确保对客户交付底线
note: 周四需与李总对齐降级方案接口
# retrospective 仅复盘报告使用
retrospective:
  successes: 核心链路按时保质打通
  improvements: 前端与后端接口协议未能提前 3 天冻结
---
```

**结构化字段定义：**
- `title`：文档正式标题；
- `doc_type`：文档类型（`prd` 产品需求、`tech_spec` 技术方案、`competitive_analysis` 竞品分析、`meeting_notes` 会议纪要、`retrospective` 项目复盘）；
- `progress`：当前需求或方案落地进度；
- `version`：版本迭代号；
- `date`：最近更新或定稿日期；
- `stakeholders`：关联的关键干系人（关联 World Model 中的 `people` 实体）；
- `expected_solution`：**方案预期（预期做成什么方案）**，供 AI 在生成大体架构时明确目标、辅助用户快速补齐细节；
- `note`：备忘与特殊注意点；
- `retrospective`：复盘专有总结（仅复盘类文档具备）。

**文档管理与检索协议：**
- **零弹窗横向常驻**：彻底摒弃打断心流的弹窗 Modal，文档列表平铺在主顶栏右侧（`文档: [📄 ...] [📄 ...]`），随点随在右侧 Canvas 切换；
- **跨会话感知**：同一个项目下的任意对话，Agent 均可通过 `get_project_artifacts` 工具检索已挂载的文档元数据与正文，用户跨会话提问时，Agent 始终拥有完整的项目上下文记忆。


---

### 3.5 Skills — 核心设计

> **Skill 是核心，但不是全部。**
> Skill 负责「怎么思考」，Tool 负责「能看到和改变什么」，Memory 负责「记住什么」。

**每个 Skill 遵循 Anthropic Agent Skills 规范（渐进式披露）：**

```yaml
# skills/workplace-coach/SKILL.md
---
name: workplace-coach
description: |
  职场导师核心技能。识别工作场景、理解上下文、读取相关人物/
  项目/关系、判断真正的问题、选择行动策略、生成自然语言建议。
---

## 第一层：启动时加载 name + description（已在系统提示词中）

## 第二层：SKILL.md 主体（Agent 判断相关时读取）

你是用户的职场教练。收到用户的工作场景描述时：

1. **识别场景类型**：向上管理 / 跨部门协作 / 项目风险 / 向下管理 / 会议沟通
2. **理解上下文**：调用 get_person、get_project、search_events 获取相关信息
3. **判断真正的问题**：不要直接给教科书式建议，先想清楚用户真正面临的是什么
4. **选择行动策略**：参考 relationship-coach / meeting-coach / difficult-conversation
5. **生成自然语言**：像一个懂你的老同事在聊天，不要像 AI 在上课

详细场景判断标准见 [reference.md](./reference.md)
高难度对话话术见 [difficult-conversation.md](./difficult-conversation.md)
```

**6 个核心 Skill：**

| Skill | 职责 |
|:---|:---|
| `workplace-coach` | 核心判断与策略 |
| `people-model` | 从事件提取行为证据，更新人物模型 |
| `relationship-coach` | 理解和优化人际关系 |
| `meeting-coach` | 会议前准备、会议中建议、会议后复盘 |
| `difficult-conversation` | 高难度对话的策略与话术 |
| `memory-reflection` | 判断什么值得记住，如何更新 Memory |
| `human-response` | 确保回复自然、不像 AI |

---

### 3.6 Tools — 10~15 个核心 Tool

```
People
├── get_person              # 获取人物模型
├── update_person_model     # 更新人物画像
│
Projects
├── get_project
├── update_project
│
Relationship
├── get_relationship
├── update_relationship
│
Events
├── create_event
├── search_events           # FTS5 全文搜索
├── get_recent_events
│
Memory
├── search_memory
├── create_memory
├── update_memory
│
Evidence
├── get_evidence
└── create_evidence
```

**关键：一个 Coach Agent 直接调用 Tools，不做 Router Agent → Sub Agent 的多层编排。**

```text
"王总刚刚问我为什么项目还没做完"

        Coach Agent
            │
  ┌─────────┼─────────┐
  ↓         ↓         ↓
get_person get_project search_events
  │         │         │
  └─────────┼─────────┘
            ↓
       Coach 判断
            ↓
       最终回答
```

---

### 3.7 数据库设计

**SQLite + Drizzle ORM + FTS5**

```sql
-- users
users(id, name, email, role, created_at, updated_at)

-- people：人物基础信息
people(id, user_id, name, role, department, organization, created_at, updated_at)

-- person_model：人物画像（不是直接贴标签！）
person_model(id, person_id, pattern, confidence, evidence_count, last_observed_at)

-- projects
projects(id, user_id, name, status, description, created_at, updated_at)

-- relationships
relationships(id, user_id, person_id, type, quality, notes, created_at, updated_at)

-- events：所有工作事件
events(id, user_id, type, content, person_id, project_id, metadata, created_at)

-- evidence：行为证据（支撑 person_model）
evidence(id, person_id, event_id, observation, source, created_at)

-- memories：长期记忆
memories(id, user_id, type, content, source_event_id, importance, created_at, updated_at)

-- situations：场景
situations(id, user_id, type, context, resolution, created_at)

-- strategies：策略
strategies(id, situation_id, approach, reasoning, created_at)

-- feedback：用户反馈
feedback(id, user_id, situation_id, rating, comment, created_at)
```

**人物画像设计原则：**

```text
❌ 不要这样：
  person.style = "强势"

✅ 要这样：
  person_model:
    pattern: "倾向于提前知道项目风险"
    confidence: 0.82
    evidence_count: 4
    last_observed_at: "2025-01-15"

  evidence:
    - event_id: 001
      observation: "王总在周会上追问项目延期原因"
    - event_id: 002
      observation: "王总要求下次提前汇报风险"
    - event_id: 003
      observation: "王总对临时暴露风险表示不满"
    - event_id: 004
      observation: "王总主动询问项目进度，不等汇报"
```

这样 AI 不会因为一次对话给一个人贴标签。

---

### 3.8 Memory Architecture

```
                 Memory
                    │
        ┌───────────┼────────────┐
        ↓           ↓            ↓
    Episodic     Semantic     Relationship
    Memory       Memory        Memory
        │           │            │
     发生了什么    什么规律      我和他是什么关系
```

**完整记忆演化链路：**

```text
Event
 ↓
Evidence
 ↓
Memory
 ↓
Pattern
 ↓
People / Relationship Model
 ↓
Strategy
 ↓
User Outcome
 ↓
Feedback
 ↓
Memory 更新
```

这才是产品真正的「智能」。

---

### 3.9 Reflection Engine — AI 预填记忆反思与人机协同单键确认机制

```text
用户与 Coach 对话 / 发生工作事件
       ↓
Coach 给出专业回复与策略
       ↓
Reflection Engine 后台反思：是否捕捉到值得沉淀的关键人物行为模式？
       ↓
【AI 提前预填充好全部字段】
生成 Memory Candidate 卡片（提取相关人物、原始观察、提炼 Pattern、初始置信度与依据）
       ↓
在对话流中展示人机协同确认卡片：
┌────────────────────────────────────────────────────────────┐
│ 🧠 发现可沉淀的职场规律 · MEMORY REFLECTION                 │
│ 针对人物：王总 (CEO)                                       │
│ 观察：在多次排期延期时，最看重周五客户演示交付的保底可用性 │
│ 提炼 Pattern：极其看重对外交付的保底方案 (Plan B)          │
│ 置信度：85% · 基于 4 条交叉证据                            │
│                                                            │
│     [ ✓ 确认存入档案 ]            [ ✕ 忽略本次 ]           │
└────────────────────────────────────────────────────────────┘
       ↓
用户点击 [✓ 确认存入档案]
       ↓
立即原子化写入 person_model 与 evidence 表
实时触发前端人物画像与 World Model 状态刷新！
```

**为什么必须采用「AI 预填 + 用户单键确认」？**
1. **杜绝 AI 幻觉篡改世界模型**：职场人际关系与性格判断极度敏感，不能让 AI 静默贴标签导致误判；
2. **极低认知负荷（极致交互体验）**：AI 已经把分析、事实佐证、置信度全部填好，用户不需要手动打字记录，只需要扫一眼、点一下即可完成知识库和记忆沉淀；
3. **即时闭环**：确认后立即同步到侧滑的人物画像中，用户拥有对自身职场数据的 100% 掌控权。

---

### 3.10 Proactive Coach & 会议多方连环追问模拟引擎

#### 3.10.1 Proactive 主动提醒
```text
Scheduler（定时触发）
   ↓
检查工作状态
   ↓
发现值得提醒的事情
   ↓
触发 Coach Agent
   ↓
主动建议

示例：
明天 10:00 和王总开会
→ 项目 X 最近有两个风险
→ 王总对「临时暴露风险」比较敏感（pattern: 0.82）
→ AI 主动提醒：
  "明天和王总开会，我建议你提前准备一下项目 X。
   上次类似情况你是在会上才提风险，这次最好提前同步。"
```

#### 3.10.2 会议多方连环追问模拟（Multi-Stakeholder Q&A Drill）

产品经理开会往往面对不同诉求的各方角色（领导/CEO 看重业务与交付确定性，研发 VP 看重技术架构负荷与取舍，业务方看重功能上线时间）。

系统在会议面板中，基于已建立的**多人物真实世界模型**，自动推演会议中可能遭遇的尖锐连环追问，并提供破局对策与一键实战演练：

```text
会议筹备（如：项目评审会）
       ↓
读取参会人画像：
- 王总 (CEO)：风格果断、极度关注确定性与对外交付承诺 (82%)
- 李总 (VP 研发)：重视技术架构负荷与系统稳定性、警惕突击上线 (88%)
       ↓
连环追问推演（Multi-Stakeholder Drill）：
  ▸ 追问 1（王总发难）："周五前要是联调出问题，你打算怎么向客户交代？有没有最坏打算的保底版本？"
    → 导师破局解法：先承认对齐风险，拿出 Plan B（核心初筛功能先行保底，静态规则降级），给出确定性交付承诺。
    → [🎭 模拟演练此题]
  ▸ 追问 2（李总发难）："你提的实时状态同步会不会拖垮主库性能？如果研发评估要增加两周工期，你怎么砍功能？"
    → 导师破局解法：主动提出异步轮询替代方案，圈定 MVP 最小闭环，暂缓非核心看板统计。
    → [🎭 模拟演练此题]
       ↓
点击 [🎭 模拟演练此题]
       ↓
对话流无缝切入沉浸式 Rehearsal 演练模式（Coach 扮演提问领导，用户实操对答复盘）
```


---

### 3.11 Event System

**第一版不需要 Kafka / Redis / 消息队列。**

```text
events table + background worker + scheduler
```

所有事情都记录为 Event：

```json
{
  "type": "leader_question",
  "person_id": "xxx",
  "project_id": "yyy",
  "content": "为什么还没完成",
  "metadata": { "tone": "urgent", "context": "weekly_meeting" },
  "created_at": "2025-01-15T14:30:00Z"
}
```

之后：

```text
Event → Reflection → Memory → Relationship → Future Strategy
```

---

### 3.12 Evals

**这个项目必须有 Eval，甚至比漂亮 UI 更重要。**

```
src/evals/
├── leadership/
├── difficult-conversation/
├── project-management/
├── meeting/
├── memory/
└── natural-response/
```

每个测试用例：

```typescript
{
  id: "case-001",
  category: "leadership",
  input: "王总刚刚问我为什么还没做完。",
  memory_context: {
    people: [{ name: "王总", pattern: "偏好提前同步风险", confidence: 0.82 }],
    events: [...],
  },
  expectations: {
    must_not: ["教科书式回答", "直接给建议"],
    should: ["先询问延期原因", "是否提前知道风险", "建议提前同步"],
    tone: "像懂你的老同事",
  },
}
```

**量化维度：**

| 维度 | 评估标准 |
|:---|:---|
| 场景理解 | 是否识别出真正的职场问题 |
| 上下文调用 | 是否正确检索了相关 Memory |
| Memory 使用 | 是否利用了历史证据 |
| 建议合理性 | 建议是否可执行、有针对性 |
| 自然程度 | 是否像真人聊天 |
| 幻觉 | 是否编造不存在的事件 |
| 过度总结 | 是否把一句话总结成一堆结论 |
| AI 感 | 是否让人觉得「这不像 AI」 |

---

### 3.13 Observability

**开发期直接用 Harness Trace，不做复杂 tracing 平台。**

```text
User Input
  ↓
Agent（Harness）
  ↓
Skill 加载（SKILL.md）
  ↓
Tool 调用（get_person / search_events）
  ↓
Memory 检索
  ↓
Model 调用
  ↓
Response 生成
  ↓
Memory 更新（Reflection）
```

后期按需接 **Langfuse / OpenTelemetry / Sentry**。

---

## 四、渐进式架构演进路线

```text
Phase 1（MVP）
─────────────────────────────
✅ Next.js 全栈
✅ 1 个 Coach Agent
✅ 3~5 个 Skill
✅ 10 个 Tool
✅ SQLite + Drizzle + FTS5
✅ Memory（Episodic + People Model）
✅ Event Log
✅ 基础 Reflection
✅ 30 个 Eval Case
✅ Harness Trace

Phase 2（增强）
─────────────────────────────
✅ 6~7 个 Skill 全面覆盖
✅ Relationship Memory
✅ Background Scheduler
✅ Proactive 主动提醒
✅ 100 个 Eval Case
✅ 量化 A/B 对比

Phase 3（规模化）
─────────────────────────────
→ PostgreSQL + pgvector
→ 向量搜索（语义检索）
→ OpenTelemetry / Langfuse
→ 多用户 / 团队版
→ 多 Agent（如果真的需要）
→ 消息队列（如果真的需要）
```

---

## 五、最终 7 个核心概念

```text
             AI 职场导师
                  │
          ┌───────┴───────┐
          │               │
       Coach           World Model
          │               │
      ┌───┼───┐       ┌───┼────┐
      │   │   │       │   │    │
    Skill Tool Memory People Project
          │               │
          └───────┬───────┘
                  ↓
              Event Log
                  ↓
             Reflection
                  ↓
           Memory Evolution
                  ↓
            Proactive Coach
```

| 概念 | 职责 |
|:---|:---|
| **Coach** | 唯一的 Agent，负责判断和行动 |
| **Skill** | 教 Coach「怎么思考」（渐进式程序性知识） |
| **Tool** | 教 Coach「能看到和改变什么」（10~15 个函数） |
| **Memory** | 教 Coach「记住什么」（Episodic + Semantic + Relationship） |
| **World Model** | Coach 对「我—领导—项目—关系—事件」的持续理解 |
| **Event + Reflection** | 教 Coach「如何不断进化」 |
| **Proactive Coach** | AI 主动参与你的工作 |

---

## 六、最重要的一句话

> **你现在真正应该开发的不是「一个 Multi-Agent 系统」，而是「一个能够持续建立『我—领导—项目—关系—事件』世界模型的 Coach Agent」。**

Harness 只是让 Agent 跑起来；
Skill 负责它**怎么思考**；
Tool 负责它**能看到和改变什么**；
Memory 负责它**记住什么**；
Event + Reflection 负责它**如何不断进化**。

**第一版就已经可以是一个完整产品，而不是 Demo。**
之后增加多 Agent、向量库、Postgres、消息队列，都应该是**被真实场景逼出来的**，而不是架构先行。



# 前端页面示意图
# 旁白（PANGBAI）— 重设计版线稿图

> **设计哲学：对话即产品。其余一切，都是恰好在此刻浮现的上下文。**
>
> 参考气质：Linear × Arc × Raycast —— 轻、净、快、有呼吸感

---

## 核心交互原则

```text
❌ 之前：顶部全屏通栏横条 + 下方左右分栏（生硬的三方布局，右侧对话被严重压低）
✅ 现在：纯粹的左右两栏现代架构（左侧整高 Sidebar 贯穿，右侧主对话区居顶舒展）

❌ 之前：所有东西都堆在主页面里，或开篇大题记/大卡片撑出滚动条
✅ 现在：一屏完整尽收（紧凑开篇引导 + 输入框）；弹窗 / 侧滑面板按需唤起，用完即收

❌ 之前：像后台管理系统
✅ 现在：像和一个聪明、克制、富有同理心的职场教练对话（Editorial 杂志美学）
```

---

## 页面 1 · 主界面 — 左右双栏纯净架构

**这是唯一常驻的主视图。左侧品牌与导航贯穿，右侧对话区居顶开阔。**

```text
┌──────────────────────────┬────────────────────────────────────────────────────────────────────────┐
│  旁白。  AI 职场导师  ◨ │   当前对话标题 [招聘 Agent v2]  文档: [📄 核心方案] [📄 降级方案] [📄 Canvas ◨] 🔔 3 │
├──────────────────────────┼────────────────────────────────────────────────────────────────────────┤
│  [ ＋ 新对话 ] (幂等)    │                                                                        │
│  [ 🔍 检索记录 ⌘K ]      │  ┌─┐                                                                   │
│                          │  │旁│  旁白                                                            │
│  今天                    │  └─┘  刚刚  [📁 招聘 Agent v2]                                          │
│  · 王总问「为什么还没…」 │       今天王总有点不开心，对吧。                                       │
│    [招聘 Agent v2]       │       他问「为什么还没做完」时，其实在意的不是进度——                   │
│                          │       是他今天才知道有风险。这件事[7月8日]也发生过一次。               │
│  本周                    │                                                                        │
│  · 和李总对接口排期      │       ┌────────────────────────────────────────────────────────────┐   │
│    [招聘 Agent v2]       │       │ 💡 建议回复话术 · SUGGESTED REPLY                          │   │
│                          │       │ "王总，这块我没提前同步是我的问题。                        │   │
│  更早                    │       │  目前卡在数据标注，预计周四出初版。                        │   │
│  · 方案评审复盘          │       │  之后我每天同步一次进度。"                                 │   │
│    [内部知识库改版]      │       └────────────────────────────────────────────────────────────┘   │
│  ──────────────────────  │       [💡建议]   [📖类似案例]   [🎭来演练一下]                         │
│  项目 · PROJECTS         │                                                                        │
│  📁 招聘 Agent v2  ⚠2    │  ────────────────────────────────────────────────────────────────────  │
│  📁 内部知识库改版       │  ┌──────────────────────────────────────────────────────────────────┐  │
│  [ ＋ 新建项目 ]         │  │ 写给旁白 · TO THE COACH                           ⏎ 发送 · ⇧⏎ 换行│  │
│                          │  │ 跟旁白说点什么，像写日记一样……                            [发送] │  │
│                          │  └──────────────────────────────────────────────────────────────────┘  │
│                          │        01 对话   02 人物   03 项目   04 成长   05 设置                 │
└──────────────────────────┴────────────────────────────────────────────────────────────────────────┘
```

**设计要点：**

```text
✦ 左右双线并行架构 — 左侧整高 Sidebar 与单层时间流对话，右侧对话区居顶开阔，按需与 Canvas / 世界模型并行
✦ 单层时间流贴项目徽标 — 对话列表依然保持扁平直观的时间流（今天/本周/更早），每条对话自动挂载所属项目徽章，避免复杂多级树状嵌套导致视觉杂乱
✦ 零弹窗横向文档平铺 — 彻底摒弃反人性的弹窗管理。当前项目关联文档直接横向平铺在顶栏右侧（文档: [📄 ...] [📄 ...]），一键在右侧 Canvas 切换
✦ 画布快捷切换 [📄 Canvas ◨] — 随时一键展开/收起右侧工作区 Canvas 画布，不遮挡主对话
✦ 检索入口常驻 — ⌘K 快捷搜索内嵌于侧边栏，随时键盘或点击唤起全局浮层
✦ 新建对话幂等 — 若当前会话为空，点击「新对话」直接复用聚焦，绝不重复生成冗余 Tab
✦ 杂志风排版（Editorial）— 首字下沉（Dropcap）、建议话术卡片（PullQuote）、人物实体超链接下钻
```

---

## 页面 2 · 侧滑面板 — 人物画像（从对话中唤起）

**不是跳转到新页面，而是从右侧滑出。对话不消失。**

```text
┌──────────────────────────────────────────────────────────────────────────┐
│                        ⌘K 搜索                    🔔 2   [我 ▾]         │
│                                                                          │
│ ┌───────────────────────────────────┐ ┌──────────────────────────────┐   │
│ │                                   │ │              ✕              │   │
│ │  旁白                             │ │                              │   │
│ │  ┌─────────────────────────────┐  │ │         👤                   │   │
│ │  │                             │  │ │                              │   │
│ │  │  今天王总有点不开心对吧。    │  │ │        王 总                  │   │
│ │  │  他问"为什么还没做完"的时候, │  │ │      CEO · 产品部            │   │
│ │  │  其实在意的不是进度——       │  │ │                              │   │
│ │  │  是他今天才知道有风险。     │  │ │  ┌──────────────────────┐    │   │
│ │  │                             │  │ │  │直属领导 · 关系偏紧绷  │    │   │
│ │  │  💬 你可以这样回复他：       │  │ │  └──────────────────────┘    │   │
│ │  │  > "王总，这块我没提前..."  │  │ │                              │   │
│ │  │                             │  │ │  ── AI 学到的 ──              │   │
│ │  │  [📄 查看王总画像 ↗]        │  │ │                              │   │
│ │  │                             │  │ │  ● 偏好提前同步风险           │   │
│ │  └─────────────────────────────┘  │ │    ●●●●○  82%  4条证据       │   │
│ │                                   │ │                              │   │
│ │  ┌─────────────────────────────┐  │ │  ● 决策风格果断直接           │   │
│ │  │  跟旁白说点什么…     发送 ⏎ │  │ │    ●●●●●  91%  7条证据       │   │
│ │  └─────────────────────────────┘  │ │                              │   │
│ │                                   │ │  ● 对数据和时间线敏感         │   │
│ │  ●  对话  人物  项目  成长  ⚙️     │ │    ●●●●○  76%  3条证据       │   │
│ └───────────────────────────────────┘ │                              │   │
│                                       │  ── 最近互动 ──              │   │
│                                       │                              │   │
│                                       │  ● 今天   "为什么没做完"     │   │
│                                       │  ○ 3天前   项目周报          │   │
│                                       │  ○ 1周前   方案讨论          │   │
│                                       │  ○ 2周前   数据确认          │   │
│                                       │                              │   │
│                                       │  ── 关系 ──                   │   │
│                                       │                              │   │
│                                       │  📊 紧张度 ▓▓▓▓▓▓░░░░  65%   │   │
│                                       │                              │   │
│                                       │  💡 旁白建议                   │   │
│                                       │  "和王总沟通，先说结论再       │   │
│                                       │   说过程。有风险主动提。"      │   │
│                                       │                              │   │
│                                       │  [展开证据链 →] ●  对话


## 续 · 页面 2 — 侧滑面板 · 人物画像（完整）

```text
│                                       │  ── 关系 ──                   │   │
│                                       │                              │   │
│                                       │  📊 紧张度 ▓▓▓▓▓▓░░░░  65%   │   │
│                                       │                              │   │
│                                       │  💡 旁白建议                   │   │
│                                       │  "和王总沟通，先说结论再       │   │
│                                       │   说过程。有风险主动提。"      │   │
│                                       │                              │   │
│                                       │  ┌──────────────────────┐    │   │
│                                       │  │ 展开证据链 (4)    ▾   │    │   │
│                                       │  ├──────────────────────┤    │   │
│                                       │  │ 📄 今天 14:30 群聊    │    │   │
│                                       │  │ "为什么还没做完"      │    │   │
│                                       │  │                      │    │   │
│                                       │  │ 📄 7月8日  项目评审   │    │   │
│                                       │  │ 对临时通知表示不满     │    │   │
│                                       │  │                      │    │   │
│                                       │  │ 📄 5月20日  1:1      │    │   │
│                                       │  │ 下次有风险提前说      │    │   │
│                                       │  │                      │    │   │
│                                       │  │ 📄 3月12日  周会      │    │   │
│                                       │  │ 追问延期原因 语气严肃  │    │   │
│                                       │  └──────────────────────┘    │   │
│                                       │                              │   │
│                                       │  [💬 问旁白关于王总]          │   │
│                                       │                              │   │
│                                       └──────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────┘
```

**设计要点：**

```text
✦ 侧滑面板从右侧滑入，宽度约 380px，带轻微阴影
✦ 对话区域自动压缩 / 变暗，但不消失 — 你知道自己从哪来
✦ 证据链默认折叠，点开后向下展开（手风琴式）
✦ 底部始终有一个 [💬 问旁白关于王总] — 跳回对话
✦ 置信度用圆点进度条，不用数字堆砌
✦ 每条证据一行就能看懂，点进去才是详情
```

---

## 页面 3 · 证据详情弹窗（点击某条证据时）

**浮在侧滑面板之上，极轻的模态。**

```text
┌──────────────────────────────────────────────────────────────────────────┐
│                        ⌘K 搜索                    🔔 2   [我 ▾]         │
│                                                                          │
│ ┌───────────────────────────────────┐ ┌──────────────────────────────┐   │
│ │                                   │ │            侧滑面板         │   │
│ │   对话区（变暗）                  │ │   （也变暗）                 │   │
│ │                                   │ │                              │   │
│ │                                   │ │                              │   │
│ │                                   │ └──────────────────────────────┘   │
│ │                                                                          │
│ │                          ┌──────────────────────────────────────┐      │
│ │                          │                              ✕       │      │
│ │                          │                                      │      │
│ │                          │  📄 证据详情                         │      │
│ │                          │                                      │      │
│ │                          │  日期：7月8日 15:20                   │      │
│ │                          │  场景：项目评审会                     │      │
│ │                          │  人物：王总                           │      │
│ │                          │  项目：招聘 Agent                     │      │
│ │                          │                                      │      │
│ │                          │  ── 原始事件 ──                       │      │
│ │                          │                                      │      │
│ │                          │  "在评审会上，王总得知前端方案还没    │      │
│ │                          │   和后端对齐。他的表情明显沉下来，    │      │
│ │                          │   说了句'为什么这种事现在才说？'     │      │
│ │                          │   之后整场会议语气都比较紧。"         │      │
│ │                          │                                      │      │
│ │                          │  ── AI 提取的观察 ──                  │      │
│ │                          │                                      │      │
│ │                          │  观察：王总对"临时暴露风险"的反应是   │      │
│ │                          │  明显不满，不仅仅是生气，而是失望。   │      │
│ │                          │                                      │      │
│ │                          │  支撑的 Pattern：                     │      │
│ │                          │  ▸ 偏好提前同步风险 (82%)             │      │
│ │                          │                                      │      │
│ │                          │  [引用这段对话到旁白]                 │      │
│ │                          │                                      │      │
│ │                          └──────────────────────────────────────┘      │
│ │                                                                          │
│ └─────────────────────────────────────────────────────────────────────────┘
└──────────────────────────────────────────────────────────────────────────┘
```

**设计要点：**

```text
✦ 背景全部轻微变暗（blur overlay），弹窗居中
✦ 弹窗宽度约 520px，不是全屏
✦ 原始事件用引文样式，一眼看出"这是记录"
✦ AI 观察和原始事件明确分开 — 让用户知道哪个是事实，哪个是 AI 推断
✦ 底部 [引用这段对话到旁白] — 一键回到对话
✦ ✕ 点击或 Esc 即时关闭，丝滑回到之前状态
```

---

## 页面 4 · 项目面板（侧滑唤起）

**从对话 / 通知 / 搜索中触发，同样右侧滑出。**

```text
│ ┌───────────────────────────────────┐ ┌──────────────────────────────┐   │
│ │                                   │ │              ✕              │   │
│ │   对话区                          │ │                              │   │
│ │                                   │ │  📁 招聘 Agent v2            │   │
│ │                                   │ │  进行中 · 截止 1月31日       │   │
│ │                                   │ │                              │   │
│ │                                   │ │  ████████░░░░░░░░  65%      │   │
│ │                                   │ │                              │   │
│ │                                   │ │  ⚠️ 2 个风险待处理            │   │
│ │                                   │ │  ┌──────────────────────┐    │   │
│ │                                   │ │  │ ⚠ 数据标注进度慢 3 天 │    │   │
│ │                                   │ │  │   尚未同步给王总      │    │   │
│ │                                   │ │  ├──────────────────────┤    │   │
│ │                                   │ │  │ ⚠ 后端 schema 未确认  │    │   │
│ │                                   │ │  │   尚未同步给李总      │    │   │
│ │                                   │ │  └──────────────────────┘    │   │
│ │                                   │ │                              │   │
│ │                                   │ │  ── 里程碑 ──                │   │
│ │                                   │ │                              │   │
│ │                                   │ │  ● 需求确认      ✅ 1月5日   │   │
│ │                                   │ │  ● 技术方案      ✅ 1月10日  │   │
│ │                                   │ │  ● 数据标注      ⚠ 延期3天  │   │
│ │                                   │ │  ○ 模型训练      1月25日    │   │
│ │                                   │ │  ○ 上线交付      1月31日    │   │
│ │                                   │ │                              │   │
│ │                                   │ │  ── 成员 ──                   │   │
│ │                                   │ │                              │   │
│ │                                   │ │  [👤王总] [👤李总] [👤张哥] [👤我]│   │
│ │                                   │ │                              │   │
│ │                                   │ │  💡 旁白                      │   │
│ │                                   │ │  "两个风险都没同步。          │   │
│ │                                   │ │   建议今晚先发条消息。"       │   │
│ │                                   │ │                              │   │
│ │                                   │ │  [💬 问旁白]  [生成同步话术]  │   │
│ │                                   │ │                              │   │
│ └───────────────────────────────────┘ └──────────────────────────────┘   │
```

**设计要点：**

```text
✦ 同样的侧滑交互 — 不跳页，不打断
✦ 风险卡片用 ⚠ 红色点缀，一眼看到
✦ 里程碑用垂直时间线，极简圆点 + 线
✦ 成员用头像标签，点进去打开对应人物面板
✦ 💡 旁白建议固定在底部 — 永远有下一步
✦ [生成同步话术] 一键跳回对话并自动输入
```

---

## 页面 5 · 会议面板（侧滑唤起）

```text
│ ┌───────────────────────────────────┐ ┌──────────────────────────────────────────┐   │
│ │                                   │ │                    ✕                     │   │
│ │   对话区                          │ │  📅 明天 10:00  项目评审 · 30min          │   │
│ │                                   │ │  腾讯会议  [📁 招聘 Agent v2]              │   │
│ │                                   │ │                                          │   │
│ │                                   │ │  👥 [👤王总主持] [👤李总] [👤张哥] [👤我] │   │
│ │                                   │ │                                          │   │
│ │                                   │ │  ┌────────────────────────────────────┐  │   │
│ │                                   │ │  │ 💡 导师会前核心建议                 │  │   │
│ │                                   │ │  │ 王总主持，当前项目有2个风险未同步。│  │   │
│ │                                   │ │  │ 重点：先认错预警风险，拿出保底方案。│  │   │
│ │                                   │ │  │ [生成预告消息]    [📋 打开准备清单] │  │   │
│ │                                   │ │  └────────────────────────────────────┘  │   │
│ │                                   │ │                                          │   │
│ │                                   │ │  ── 多方尖锐连环追问模拟 ──              │   │
│ │                                   │ │                                          │   │
│ │                                   │ │  ┌────────────────────────────────────┐  │   │
│ │                                   │ │  │ ❓ 王总 (CEO) 追问 · 确定性与风险    │  │   │
│ │                                   │ │  │ "周五前要是联调出问题，你打算怎么向│  │   │
│ │                                   │ │  │  客户交代？有没有最坏打算保底版本？"│  │   │
│ │                                   │ │  │ 💡 Coach 破局：                      │  │   │
│ │                                   │ │  │ 先认错未提前同步；亮出 Plan B 兜底  │  │   │
│ │                                   │ │  │ 交付标准，锁定核心初筛不延期。      │  │   │
│ │                                   │ │  │ [🎭 模拟演练此题 ↗]                 │  │   │
│ │                                   │ │  └────────────────────────────────────┘  │   │
│ │                                   │ │  ┌────────────────────────────────────┐  │   │
│ │                                   │ │  │ ❓ 李总 (VP 研发) 追问 · 架构与负荷 │  │   │
│ │                                   │ │  │ "实时状态同步会不会拖垮主库性能？  │  │   │
│ │                                   │ │  │  如果研发评估加两周工期你怎么砍？" │  │   │
│ │                                   │ │  │ 💡 Coach 破局：                      │  │   │
│ │                                   │ │  │ 提出异步轮询替代方案，圈定 MVP 最小 │  │   │
│ │                                   │ │  │ 闭环，暂缓非核心看板统计。          │  │   │
│ │                                   │ │  │ [🎭 模拟演练此题 ↗]                 │  │   │
│ │                                   │ │  └────────────────────────────────────┘  │   │
│ │                                   │ │                                          │   │
│ │                                   │ │  ── 参会人世界模型 ──                    │   │
│ │                                   │ │  [👤王总] 偏好提前同步 (82%) · 决策果断   │   │
│ │                                   │ │  [👤李总] 重视技术完整 (88%) · 警惕突击   │   │
│ │                                   │ │                                          │   │
│ │                                   │ │  [💬 问旁白准备这会]                     │   │
│ └───────────────────────────────────┘ └──────────────────────────────────────────┘   │
```

---

## 页面 6 · 成长（弹窗唤起）

**轻量弹窗，居中浮出。不是一整个页面。**

```text
┌──────────────────────────────────────────────────────────────────────────┐
│                        ⌘K 搜索                    🔔 2   [我 ▾]         │
│                                                                          │
│ ┌───────────────────────────────────┐                                    │
│ │                                   │                                    │
│ │   对话区（变暗）                  │   ┌──────────────────────────────┐ │
│ │                                   │   │              ✕              │ │
│ │                                   │   │                              │ │
│ │                                   │   │  📈 这个月的你               │ │
│ │                                   │   │                              │ │
│ │                                   │   │  ┌────────────────────────┐  │ │
│ │                                   │   │  │                        │  │ │
│ │                                   │   │  │   向上管理              │  │ │
│ │                                   │   │  │     ★★★★☆             │  │ │
│ │                                   │   │  │    /        \           │  │ │
│ │                                   │   │  │   /          \          │  │ │
│ │                                   │   │  │ 沟通 ★★★★★ ★★★☆☆ 执行 │  │ │
│ │                                   │   │  │   \          /          │  │ │
│ │                                   │   │  │    \        /           │  │ │
│ │                                   │   │  │     ★★★★☆             │  │ │
│ │                                   │   │  │   项目管理              │  │ │
│ │                                   │   │  │                        │  │ │
│ │                                   │   │  │  ┈┈┈ 上月               │  │ │
│ │                                   │   │  │  ─── 本月               │  │ │
│ │                                   │   │  │                        │  │ │
│ │                                   │   │  └────────────────────────┘  │ │
│ │                                   │   │                              │ │
│ │                                   │   │  ── 亮点 ──                   │ │
│ │                                   │   │                              │ │
│ │                                   │   │  🟢 首次主动向王总同步风险    │ │
│ │                                   │   │  🟢 会议中主动提备选方案      │ │
│ │                                   │   │  🟢 需求确认会表达清晰       │ │
│ │                                   │   │                              │ │
│ │                                   │   │  ── 待改进 ──                 │ │
│ │                                   │   │                              │ │
│ │                                   │   │  🟡 与李总的跨部门沟通不够及时 │ │
│ │                                   │   │  🔴 紧急情况下忘了先汇报     │ │
│ │                                   │   │                              │ │
│ │                                   │   │  ── 下月练习 ──               │ │
│ │                                   │   │                              │ │
│ │                                   │   │  🎯 高难度对话·先认错再给方案 │ │
│ │                                   │   │     [开始演练]                │ │
│ │                                   │   │                              │ │
│ └───────────────────────────────────┘   └──────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 页面 7 · 通知（顶部下拉，极轻）

**不是页面，不是弹窗 — 是顶部的一个轻浮层。**

```text
┌──────────────────────────────────────────────────────────────────────────┐
│                        ⌘K 搜索                    🔔 2   [我 ▾]         │
│                                     ┌────────────────────────────────┐   │
│                                     │  通知                  全部已读 │   │
│                                     │                                │   │
│                                     │  ┌──────────────────────────┐ │   │
│                                     │  │ ⚠️ 项目X风险未同步        │ │   │
│                                     │  │ 王总明天主持项目评审，     │ │   │
│                                     │  │ 你有2个风险没提前说。      │ │   │
│                                     │  │        [查看]  [问旁白]   │ │   │
│                                     │  ├──────────────────────────┤ │   │
│                                     │  │ 💬 李总 2小时前问了问题    │ │   │
│                                     │  │ "客户那边怎么说"           │ │   │
│                                     │  │        [去回复]  [问旁白]  │ │   │
│                                     │  ├──────────────────────────┤ │   │
│                                     │  │ 📅 明天 2 个会议            │ │   │
│                                     │  │ 10:00 评审 · 16:00 1:1    │ │   │
│                                     │  │        [查看]  [知道了]    │ │   │
│                                     │  └──────────────────────────┘ │   │
│                                     └────────────────────────────────┘   │
│                                                                     │
│ ┌─────────────────────────────────────────────────────────────────┐     │
│ │                                                                 │     │
│ │   对话区（不变暗，通知只是浮层）                                 │     │
│ │                                                                 │     │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 页面 8 · 快速搜索（⌘K）

**全局入口，万物可搜，搜到即打开对应面板。**

```text
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│                     ┌──────────────────────────────────────┐            │
│                     │ 🔍 王总 相关                   Esc ✕  │            │
│                     ├──────────────────────────────────────┤            │
│                     │                                      │            │
│                     │  👤 人物                              │            │
│                     │  ┌────────────────────────────────┐  │            │
│                     │  │ 👤 王总 · CEO · 产品部           │  │            │
│                     │  │    偏好提前同步风险 (82%)       │  │            │
│                     │  └────────────────────────────────┘  │            │
│                     │                                      │            │
│                     │  📁 项目                              │            │
│                     │  ┌────────────────────────────────┐  │            │
│                     │  │ 📁 招聘 Agent v2 · 王总发起     │  │            │
│                     │  │    2 个风险 · 进度 65%          │  │            │
│                     │  └────────────────────────────────┘  │            │
│                     │                                      │            │
│                     │  📅 会议                              │            │
│                     │  ┌────────────────────────────────┐  │            │
│                     │  │ 📅 明天 10:00 项目评审 · 王总主持 │  │            │
│                     │  └────────────────────────────────┘  │            │
│                     │  ┌────────────────────────────────┐  │            │
│                     │  │ 📅 1月10日 方案讨论 · 有王总     │  │            │
│                     │  └────────────────────────────────┘  │            │
│                     │                                      │            │
│                     │  🧠 记忆                              │            │
│                     │  ┌────────────────────────────────┐  │            │
│                     │  │ "王总偏好提前同步风险"          │  │            │
│                     │  │ 置信度 82% · 4条证据            │  │            │
│                     │  └────────────────────────────────┘  │            │
│                     │                                      │            │
│                     │  💬 问旁白                            │            │
│                     │  ┌────────────────────────────────┐  │            │
│                     │  │ 💬 "王总最近怎么样？"            │  │            │
│                     │  │ 💬 "和王总的关系怎么修复？"       │  │            │
│                     │  └────────────────────────────────┘  │            │
│                     │                                      │            │
│                     │  ↑↓ 选择  ↵ 打开  ⌘↵ 问旁白          │            │
│                     │                                      │            │
│                     └──────────────────────────────────────┘            │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

**设计要点：**

```text
✦ 全局搜索可以搜人物、项目、会议、记忆、对话
✦ 选中任意结果 → 打开对应侧滑面板（不跳页）
✦ ⌘↵ → 不打开面板，直接在对话里"问旁白关于XXX"
✦ 这是真正的万物入口 — 用户永远只需要 ⌘K + 回车
✦ 搜索结果分组，每组最多 3 条，避免信息过载
```

---

## 页面 9 · 设置（侧滑面板，复用同一模式）

```text
│ ┌───────────────────────────────────┐ ┌──────────────────────────────┐   │
│ │                                   │ │              ✕              │   │
│ │   对话区                          │ │                              │   │
│ │                                   │ │  ⚙️ 设置                     │   │
│ │                                   │ │                              │   │
│ │                                   │ │  ── 我 ──                    │   │
│ │                                   │ │  张明 · 前端开发 · 产品部     │   │
│ │                                   │ │  [编辑资料]                   │   │
│ │                                   │ │                              │   │
│ │                                   │ │  ── 记忆 ──                   │   │
│ │                                   │ │  自动记录事件        ✅       │   │
│ │                                   │ │  Reflection 自动     ✅       │   │
│ │                                   │ │  重要度阈值          ★★★☆☆   │   │
│ │                                   │ │  记忆保留            6个月    │   │
│ │                                   │ │                              │   │
│ │                                   │ │  ── 通知 ──                   │   │
│ │                                   │ │  会议提醒            ✅       │   │
│ │                                   │ │  风险预警            ✅       │   │
│ │                                   │ │  待办提醒            ✅       │   │
│ │                                   │ │  关系提醒            ✅       │   │
│ │                                   │ │  静默时间        21:00-9:00  │   │
│ │                                   │ │                              │   │
│ │                                   │ │  ── 模型 ──                   │   │
│ │                                   │ │  当前 [DeepSeek ▾]            │   │
│ │                                   │ │                              │   │
│ │                                   │ │  ── 数据 ──                   │   │
│ │                                   │ │  [导出记忆]  [导出事件]       │   │
│ │                                   │ │                              │   │
│ │                                   │ │  ── 危险 ──                   │   │
│ │                                   │ │  [清空全部记忆]               │   │
│ │                                   │ │                              │   │
│ └───────────────────────────────────┘ └──────────────────────────────┘   │
```

---

## 页面 10 · 对话中的引用展开（行内展开，不是弹窗）

**对话里提到某个细节时，点击行内引用，直接在对话里展开，不跳走。**

```text
│ ┌──────────────────────────────────────────────────────────────────┐  │
│ │                                                                  │  │
│ │  旁白                                                            │  │
│ │                                                                  │  │
│ │  今天王总有点不开心对吧。                                        │  │
│ │                                                                  │  │
│ │  他问"为什么还没做完"的时候，                                    │  │
│ │  其实在意的不是进度——                                            │  │
│ │  是他今天才知道有风险。                                          │  │
│ │                                                                  │  │
│ │  ┌──────────────────────────────────────────────────────────┐    │  │
│ │  │  📄 王总 · 偏好提前同步风险                                │    │  │
│ │  │     置信度 82% · 4条证据                            ▾ 展开 │    │  │
│ │  └──────────────────────────────────────────────────────────┘    │  │
│ │  ═══════════════════════════════════════════════════════════     │  │
│ │  │  📄 今天 14:30 群聊                                         │    │  │
│ │  │  "王总问为什么还没做完"                                     │    │  │
│ │  │                                                              │    │  │
│ │  │  📄 7月8日 项目评审                                          │    │  │
│ │  │  对临时通知表示不满                                          │    │  │
│ │  │                                                              │    │  │
│ │  │  📄 5月20日 1:1                                              │    │  │
│ │  │  下次有风险提前说                                            │    │  │
│ │  │                                                              │    │  │
│ │  │  📄 3月12日 周会                                             │    │  │
│ │  │  追问延期原因                                                │    │  │
│ │  │                                                    ▴ 收起     │    │  │
│ │  ═══════════════════════════════════════════════════════════     │  │
│ │                                                                  │  │
│ │  我建议你现在这样做：                                            │  │
│ │                                                                  │  │
│ │  💬 你可以这样回复他：                                            │  │
│ │                                                                  │  │
│ │  > "王总，这块我没提前同步是我的问题。                           │  │
│ │  >  目前卡在数据标注，预计周四能出初版。                         │  │
│ │  >  之后我每天同步进度。"                                        │  │
│ │                                                                  │  │
│ │  [💡 建议] [📖 类似案例] [🎭 来演练一下]                          │  │
│ │                                                                  │  │
│ └──────────────────────────────────────────────────────────────────┘  │
```

**设计要点：**

```text
✦ 引用块在对话流内部展开，像折叠卡片
✦ 展开时对话不跳走 — 你还在同一个位置
✦ 收起时一行收回去，干净利落
✦ 每条证据一行摘要，点进去才看详情（弹窗）
✦ 这样用户 90% 的时间只看对话流，需要深看时才展开
```

---

## 页面 10.1 · AI 预填记忆反思卡片（人机协同单键沉淀）

**在对话分析出新的干系人行为规律时，AI 提前填充好全部内容，用户一键确认即可存入世界模型，或选择忽略。**

```text
│ ┌──────────────────────────────────────────────────────────────────┐  │
│ │                                                                  │  │
│ │  ┌──────────────────────────────────────────────────────────┐    │  │
│ │  │ 🧠 发现可沉淀的职场规律 · MEMORY REFLECTION              │    │  │
│ │  │                                                          │    │  │
│ │  │ 针对人物：王总 (CEO)                                     │    │  │
│ │  │ 观察：在多次排期延期时，最看重周五客户演示交付的保底可用 │    │  │
│ │  │ 提炼 Pattern：极其看重对外交付的保底方案 (Plan B)        │    │  │
│ │  │                                                          │    │  │
│ │  │ 置信度：85% · 基于 4 条交叉证据                          │    │  │
│ │  │                                                          │    │  │
│ │  │  [✓ 确认存入档案]            [✕ 忽略本次]                │    │  │
│ │  └──────────────────────────────────────────────────────────┘    │  │
│ │                                                                  │  │
│ └──────────────────────────────────────────────────────────────────┘  │
```

**设计要点：**

```text
✦ AI 预填先行 — AI 将相关人物、细致观察、归纳的 Pattern 及置信度一揽子预先填好，用户零录入成本
✦ 决定权在人（Human-in-the-loop）— 点击 [✓ 确认存入档案] 立即原子化落库并刷新人物模型与画像；点击 [✕ 忽略本次] 平滑折叠卡片
✦ 杜绝数据污染 — 严格保障职场记忆资产的客观性与用户控制权
```

---

## 页面 10.2 · 高质量 PRD / 方案架构建议卡片（大体骨架先行）

**用户提出产出文档意图时，AI 先在对话中给出文档骨架与方案预期，一键直通 Canvas 展开细化。**

```text
│ ┌──────────────────────────────────────────────────────────────────┐  │
│ │                                                                  │  │
│ │  ┌──────────────────────────────────────────────────────────┐    │  │
│ │  │ 📄 推荐产出方案文档 · ARTIFACT SKELETON                  │    │  │
│ │  │                                                          │    │  │
│ │  │ 《招聘 Agent v2 核心排期与风险兜底方案》                 │    │  │
│ │  │ 类型：PRD 需求与方案  ·  进度：75%                       │    │  │
│ │  │                                                          │    │  │
│ │  │ 🎯 预期方案：                                            │    │  │
│ │  │ 先以核心初筛打通为交付标准，周五前完成联调；数据标注延期 │    │  │
│ │  │ 部分采用静态规则兜底，确保对外演示交付底线。              │    │  │
│ │  │                                                          │    │  │
│ │  │ 📋 大体架构：                                            │    │  │
│ │  │ 1. 交付目标与排期底线                                     │    │  │
│ │  │ 2. 方案取舍与 Plan B 兜底策略                            │    │  │
│ │  │ 3. 跨部门联调接口协议冻结清单                            │    │  │
│ │  │                                                          │    │  │
│ │  │  [📝 载入到 Canvas 补充细节 ↗]                           │    │  │
│ │  └──────────────────────────────────────────────────────────┘    │  │
│ │                                                                  │  │
│ └──────────────────────────────────────────────────────────────────┘  │
```

**设计要点：**

```text
✦ 骨架结构先行 — 不让用户面对空白文档抓瞎；AI 先搭好契合职场博弈与技术交付的高质量框架与方案预期
✦ 一键直通 Canvas — 点击 [📝 载入到 Canvas 补充细节 ↗] 自动在右侧展开 Canvas 并载入 Markdown，用户专注补充细节
✦ 自动唤起感知 — 当 Agent 检测到文档生成动作时，Canvas 侧边栏亦可自动平滑展开协同
```

---

## 页面 11 · 对话中的场景演练（行内展开）

**旁白建议演练时，直接在对话里生成一个角色扮演练习。**

```text
│ ┌──────────────────────────────────────────────────────────────────┐  │
│ │                                                                  │  │
│ │  🎭 演练模式                                    [退出演练 ✕]     │  │
│ │  ═══════════════════════════════════════════════════════════     │  │
│ │                                                                  │  │
│ │  场景：向王总汇报项目延期                                        │  │
│ │                                                                  │  │
│ │  ┌──────────────────────────────────────────────────────────┐    │  │
│ │  │                                                          │    │  │
│ │  │  🎭 王总（扮演）                                           │    │  │
│ │  │                                                          │    │  │
│ │  │  "这个项目怎么回事？怎么还没做完？                        │    │  │
│ │  │   周五就要给客户看了。"                                   │    │  │
│ │  │                                                          │    │  │
│ │  └──────────────────────────────────────────────────────────┘    │  │
│ │                                                                  │  │
│ │  ┌──────────────────────────────────────────────────────────┐    │  │
│ │  │  你的回复…                                      发送 ⏎   │    │  │
│ │  └──────────────────────────────────────────────────────────┘    │  │
│ │                                                                  │  │
│ │  💡 提示：先承认没同步的问题，再给时间线                         │  │
│ │                                                                  │  │
│ └──────────────────────────────────────────────────────────────────┘  │
```

**设计要点：**

```text
✦ 演练是对话的"行内模式"，不是弹窗，不是新页面
✦ 顶部有明确的 [退出演练] — 你不会迷路
✦ 旁白扮演对方角色，根据你的历史数据生成逼真反应
✦ 💡 提示在底部，不抢主角
✦ 演练完可以一键生成总结，写入 Growth
```

---

## 页面 12 · 主动提醒（悬浮卡片）

**不弹窗，不打断 — 在角落浮出一张小卡片，像 Raycast 风格。**

```text
┌──────────────────────────────────────────────────────────────────────────┐
│                        ⌘K 搜索                    🔔 2   [我 ▾]         │
│                                                                          │
│                                                                          │
│ ┌─────────────────────────────────────────────────────────────────┐     │
│ │                                                                 │     │
│ │                                                                 │     │
│ │   对话区（完全不受影响）                                        │     │
│ │                                                                 │     │
│ │                                                                 │     │
│ │                                                                 │     │
│ │                                                                 │     │
│ └─────────────────────────────────────────────────────────────────┘     │
│                                                                          │
│                                      ┌─────────────────────────────┐    │
│                                      │ 🌤️ 旁白 · 刚刚              ✕ │    │
│                                      │                             │    │
│                                      │ 明天 10:00 和王总开项目评审。  │    │
│                                      │ 项目X有 2 个风险还没同步。     │    │
│                                      │                             │    │
│                                      │ 考虑到他偏好提前同步…          │    │
│                                      │                             │    │
│                                      │ [💬 问旁白]  [稍后再说]      │    │
│                                      └─────────────────────────────┘    │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  跟旁白说点什么…                                       发送 ⏎   │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

**设计要点：**

```text
✦ 右下角浮出，不遮挡对话，不弹窗
✦ 像 macOS 通知，安静地出现
✦ [💬 问旁白] 点击后卡片消失，对话框自动输入相关问题
✦ [稍后再说] 点击后淡出，存入通知中心
✦ 不会连续弹出多张 — 一条一条来
✦ 3 秒后自动变淡，但不会消失
```

---

## 页面 1.1 / 页面 16 · 双模态 Markdown Canvas 画布与杂志风渲染排版

> **哲学：平时不喧宾夺主，只有写 PRD、撰写方案、整理复盘等必要场景时平滑展开双线分屏。**
>
> 解决痛点：拒绝毫无层级的单调等宽代码感，呈现杂志级 Markdown 排版；杜绝弹窗打断，实现横向多文档平铺与划词即时引用。

```text
┌──────────────────────┬──────────────────────────────┬────────────────────────────────────────────────────────┐
│  旁白。 AI 职场导师  │   与王总对齐招聘 Agent v2   │ 📄 [核心方案] [📄 降级方案] [+ 方案骨架] [👁预览][✏编辑] ✕│
├──────────────────────┼──────────────────────────────┼────────────────────────────────────────────────────────┤
│  [ ＋ 新对话 ]       │                              │ ┌────────────────────────────────────────────────────┐ │
│  [ 🔍 检索记录 ⌘K ]  │ 旁白：                       │ │ 📋 PRD · 75% 落地中 · v1.2 · 2025-01-15            │ │
│                      │ 我已经为你拉出了核心方案骨架 │ │ 👥 涉及人：王总 (CEO)、李总 (VP 研发)              │ │
│  今天                │ 并标出了风险点。预期方案是先 │ │ 🎯 预期方案：                                      │ │
│  · 招聘 Agent v2 PRD │ 拿核心初筛保住周五交付底线， │ │ 先以核心初筛打通为交付标准，周五前完成联调；数据标 │ │
│    [招聘 Agent v2]   │ 延期的数据标注用静态规则替代 │ │ 注延期部分采用静态规则兜底，确保对客户交付底线。   │ │
│                      │                              │ └────────────────────────────────────────────────────┘ │
│  本周                │ ──────────────────────────── │                                                        │
│  · 方案评审复盘      │ [📝载入 Canvas][🎭模拟追问]   │ # 招聘 Agent v2 核心排期与风险兜底方案                 │
│                      │                              │                                                        │
│  项目 · PROJECTS     │ ┌──────────────────────────┐ │ ▌ 1. 背景与交付底线                                    │
│  📁 招聘 Agent v2    │ │ 引用："最坏打算的保..."  │ │ 针对当前数据标注卡点，核心策略为保证周五客户联调。   │
│                      │ │ 针对这段话，该怎么向李总 │ │ 核心底线是 [保期交付核心流程] (琥珀高亮加粗)。       │
│                      │ │ 汇报技术取舍？    发送 ⏎ │ │                                                        │
│                      │ └──────────────────────────┘ │ ▌ 2. 方案与取舍（Trade-off）                           │
│                      │                              │ - 方案 A（全量上线）：需延期 3 天                      │
│                      │                              │ - 方案 B（核心先行）：保期上线，标注规则静态兜底       │
│                      │                              │                                                        │
│                      │                              │ > 💡 向上管理提示：先承认未提前对齐风险，拿出 Plan B。 │
│                      │                              │                                                        │
│                      │                              │ 选中文本后悬浮： [ 引用 ⌘L ] (紧贴光标，取前10字+...)  │
└──────────────────────┴──────────────────────────────┴────────────────────────────────────────────────────────┘
```

**设计与联动要点：**

```text
✦ 零弹窗横向多文档平铺 — 顶部以 Tab 形式平铺当前项目的所有产物（[核心方案] [降级方案]），可一键点击无缝切换，并提供 [+ 方案骨架] 快捷模板，彻底消灭弹窗 Modal
✦ 双模态编辑与预览（Dual-mode）— 
  · [👁 预览] 模式：呈现高精细度杂志风 Markdown 排版；双击正文任意区域可直接就地无缝切换至编辑模式
  · [✏ 编辑] 模式：原汁原味 Markdown 源码编写，快捷键 ⌘S 即时保存
✦ 杂志风排版美学（Magazine Typography）— 彻底告别“像代码一样冰冷单调”的等宽纯文本：
  · 一级标题（H1）：沉静深绿品牌色下划线边框，庄重大气
  · 二级标题（H2）：沉静绿粗竖条（Accent Bar）强调，层次分明
  · 重点加粗高亮：加粗文字自动赋予温暖琥珀色背景（bg-amber-500/15），一眼看清排期与风险抓手
  · 优雅引用块与圆点列表：定制字距与行高（line-height: 1.75），长时间阅读不疲劳
✦ YAML Frontmatter 结构化元数据卡片 — 自动解析文档头部 YAML，以精致卡片呈现类型、进度徽章、干系人标签及「预期方案（expected_solution）」呼应框
✦ 划词精准引用（Quote-to-Chat）— 
  · 在预览或编辑区选中任意文字，紧贴鼠标选区边缘立即浮出轻巧极简的 [ 引用 ⌘L ] 胶囊按钮
  · 点击或按下 ⌘L，自动截取前 10 个字符加省略号（如：“引用：‘最坏打算的保...’ \n”）填入左侧对话输入框，光标自动后置聚焦，极大降低针对性提问修改的交互阻力
✦ 高质量 PRD 骨架先行与 Canvas 自动唤起 — 
  · 用户要求写 PRD 或出方案时，AI 绝不抛出大段单薄文字，而是先在对话中生成带有预期方案与三级大纲的骨架卡片
  · 检测到文档生成意图时，Canvas 自动在右侧展开载入，方便用户直接在架构骨架上补充细节，数倍提升工作效率
✦ 实时双向感知 — Canvas 的最新改动自动作为 activeCanvas 注入下一次提问，Agent 能精准获悉用户正在修改哪一章节并协同精修
```

---

## 13. 全局交互系统总结

### 内容层级体系（双线并行 + 侧滑 + 浮层）

```text
┌────────────────────────────────────────────────────────────────────────┐
│                                                                        │
│  Layer 3 · 极轻弹窗 (Modal)                                            │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │  证据原始详情、每月成长报告                                    │   │
│  │  用完即关，Esc 可退                                            │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                        │
│  Layer 2 · 侧滑面板 (Slide Panel)                                     │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │  人物画像、项目详情、会议连环追问、设置                        │   │
│  │  对话不消失，面板可叠加（人物 → 证据 → 项目）                  │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                        │
│  Layer 1 & 1.5 · 双线并行主区 (Dual-line Main Workspace) ← 核心工作区 │
│  ┌────────────────────────────────┬───────────────────────────────┐   │
│  │ Layer 1 · 单层时间流对话流     │ Layer 1.5 · 产物画布 (Canvas) │   │
│  │ · 扁平时间流 + 贴项目徽标      │ · 双模态预览/编辑 (Markdown)  │   │
│  │ · 杂志风排版、人物实体超链接   │ · YAML Frontmatter 卡片       │   │
│  │ · 建议话术、AI预填记忆确认卡片 │ · 划词 [引用 ⌘L] 直达对话框   │   │
│  │ · 产物大体骨架先行推荐         │ · 顶栏横向多文档平铺零弹窗    │   │
│  └────────────────────────────────┴───────────────────────────────┘   │
│                                                                        │
│  Layer 0 · 浮层 (Float)                                               │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │  通知卡片、主动提醒、⌘K 搜索、划词引用胶囊                     │   │
│  │  轻到极致，用完即散                                            │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

### 内容进入方式

```text
┌────────────────┬──────────────┬────────────────────────────────────────┐
│ 内容           │ 进入方式      │ 为什么                                 │
├────────────────┼──────────────┼────────────────────────────────────────┤
│ 人物画像       │ 侧滑面板      │ 需要对照对话看，点击实体下钻           │
│ 项目详情       │ 侧滑面板      │ 查看风险、里程碑与成员世界模型         │
│ 会议连环追问   │ 侧滑面板      │ 针对 CEO/VP 尖锐发难提前演练对策       │
│ PRD / 方案产物 │ Canvas 工作区 │ 边聊边改，AI 骨架先行，划词即时引用    │
│ 设置           │ 侧滑面板      │ 偶尔用，不影响对话心流                 │
│ 证据详情       │ 弹窗          │ 看完就走，核对事实证据链               │
│ 成长报告       │ 弹窗          │ 每月看一次复盘                         │
│ 通知           │ 顶部下拉      │ 扫一眼就走                             │
│ 主动提醒       │ 悬浮卡片      │ 不打断主线工作                         │
│ 全局搜索       │ ⌘K 浮层       │ 万物入口，一键直达任意实体与对话       │
│ 对话内引用展开 │ 行内展开      │ 不离开对话主干                         │
│ 场景演练       │ 行内模式      │ 沉浸在对话里进行角色扮演               │
│ 记忆沉淀确认   │ 行内卡片      │ AI 预填好全部字段，用户单键确认存入    │
└────────────────┴──────────────┴────────────────────────────────────────┘
```

### 导航系统

```text
❌ 不要：侧边栏 8 个菜单 + 顶部搜索 + 页面跳转

✅ 要：
  · 对话就是主页
  · ⌘K 是万物入口
  · 对话里的实体（人名、项目名）可点击 → 侧滑面板
  · 底部 4 个轻导航（对话 · 人物 · 项目 · 成长）
  · 其余全部通过对话 / 搜索 / 通知到达
```

---

## 14. 视觉气质参考

```text
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  色彩                                                        │
│  ────                                                       │
│  背景：#FAFAF8（温暖白）                                      │
│  文字：#1A1A1A（近黑）                                       │
│  辅助：#8B8B8B（灰）                                         │
│  强调：#2D6A4F（沉静绿 — 不是蓝色）                          │
│  警告：#E76F51（温和橙红）                                   │
│  气泡：#F0EFEB（对话框底色）                                  │
│                                                              │
│  字体                                                        │
│  ────                                                       │
│  中文：思源黑体 / 苹方                                        │
│  英文：Inter / SF Pro                                        │
│  强调：等宽 —— 用于证据、引用                                │
│                                                              │
│  圆角                                                        │
│  ────                                                       │
│  卡片：12px                                                  │
│  气泡：16px（对话感觉柔和）                                   │
│  按钮：8px                                                   │
│  弹窗：16px                                                  │
│                                                              │
│  动效                                                        │
│  ────                                                       │
│  侧滑面板：ease-out 200ms 从右侧滑入                          │
│  弹窗：scale 0.95 → 1.0 + fade 150ms                         │
│  浮层通知：fade + slide-up 200ms                             │
│  行内展开：height auto + fade 150ms                          │
│  全部用 spring physics（自然弹性）                             │
│                                                              │
│  阴影                                                        │
│  ────                                                       │
│  侧滑面板：-4px 0 24px rgba(0,0,0,0.06)                     │
│  弹窗：0 8px 32px rgba(0,0,0,0.08)                           │
│  浮层卡片：0 4px 16px rgba(0,0,0,0.06)                       │
│  极轻 — 不是 Material Design 的重阴影                         │
│                                                              │
│  留白                                                        │
│  ────                                                       │
│  对话内容最大宽度 640px                                       │
│  页面内边距 32px                                              │
│  段落间距 16px                                                │
│  卡片间距 12px                                                │
│  整体留白率 35-45%                                            │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 15. 一图看全局（双线并行现代工作台）

```text
                        ┌──────────┐
                        │  ⌘K 搜索  │  ← 万物入口（直达人物、项目、文档、会议）
                        └────┬─────┘
                             │
              ┌──────────────┼──────────────┬──────────────┐
              ↓              ↓              ↓              ↓
        打开侧滑画像    跳回对话提问    展开 Canvas 产物   直接预览
              │              │              │              │
              ↓              ↓              ↓              │
┌────────────────────────────────────────────────────────────────────────┐
│                                                                        │
│    双线并行工作主区（Dual-line Workspace）                             │
│    ┌─────────────────────────────────┬────────────────────────────┐    │
│    │ Layer 1 · 单层时间流对话流      │ Layer 1.5 · Canvas 产物画布│    │
│    │                                 │ (边聊边写 · 零弹窗 Tab)    │    │
│    │ 旁白 ────────────────────────   │ ┌────────────────────────┐ │    │
│    │ "今天王总有点不开心对吧。       │ │ PRD · 75% · 方案预期   │ │    │
│    │  这是为项目拉出的方案骨架："    │ └────────────────────────┘ │    │
│    │ ┌─────────────────────────────┐ │ ▌ 1. 背景与交付底线      │ │    │
│    │ │ 📄 招聘 Agent v2 核心方案   │ │ ▌ 2. 方案与取舍 (Tradeoff│ │    │
│    │ │ [📝 载入到 Canvas 补充细节] │ │                          │ │    │
│    │ └─────────────────────────────┘ │ 划词悬浮: [引用 ⌘L] ────┐│ │    │
│    │ ┌─────────────────────────────┐ │                          ││ │    │
│    │ │ 🧠 发现可沉淀规律 (王总)    │ │                          ││ │    │
│    │ │ [✓ 确认存入]   [✕ 忽略]     │ │                          ││ │    │
│    │ └─────────────────────────────┘ │                          ││ │    │
│    │                                 │                          ││ │    │
│    │ ┌─────────────────────────────┐ │                          ││ │    │
│    │ │ 引用："最坏打算的保..." ◄───┼─┼──────────────────────────┘│ │    │
│    │ │ 跟旁白讨论…         发送 ⏎ │ │                          │ │    │
│    │ └─────────────────────────────┘ │                          │ │    │
│    └─────────────────────────────────┴────────────────────────────┘    │
│                                                                        │
│    Layer 2 · 侧滑面板 ───────────────────────────────────────────►     │
│    ┌──────────────────────────────────┐                                │
│    │ 人物画像 (82% 证据链) / 项目详情 │                                │
│    │ / 会议尖锐追问模拟 / 设置        │  ← 需要时滑出，用完即收        │
│    │ [🎭 模拟演练此题 ↗]              │                                │
│    └──────────────────────────────────┘                                │
│                                                                        │
│    Layer 3 · 极轻弹窗 ───────────────────────────────────────────►     │
│              ┌────────────────────────┐                                │
│              │ 证据详情 / 每月成长报告│  ← 看完就走，Esc 即关          │
│              └────────────────────────┘                                │
│                                                                        │
│    Layer 0 · 浮层                                                      │
│         🔔 主动提醒卡片      ⌘K 全局搜索框      划词 [引用 ⌘L] 胶囊     │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

> **一句话总结这版设计：**
>
> **对话是贯穿心流的主干，Canvas 与世界模型是并肩作战的双手。其余一切——人物、项目、追问、证据、成长——都是恰好在此刻浮现的上下文，来去自如，用完即散。**