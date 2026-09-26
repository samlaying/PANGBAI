# PANGBAI · Agent Harness 架构分析

> 每一轮对话，Harness 都在回答同一个问题：
> **这一步，模型需要知道什么、能做什么、怎么评判好坏、不对时怎么办？**

---

## 全局视角：一次对话的完整生命周期

```
用户输入
   │
   ▼
[AgentSession.send()]          ← 业务层：历史压缩 + 上下文收集
   │
   ▼
[context-assembler.ts]         ← Harness 核心：动态装配 System Prompt
   │  Drawer 0：WorkspaceProfile（名称·风格·行业）
   │  Drawer 1：干系人 + 行为模式 + 因果证据链（JIT 按需）
   │  Drawer 2：项目空间（状态·风险·活文档）
   │  Drawer 3：Canvas 工作文档（TOC + 内容切片）
   ▼
[POST /api/chat]               ← 传输层：流式 SSE → 前端实时渲染
   │
   ▼
[LLM 生成 · DeepSeek-V3]      ← 模型推理
   │
   ▼
[TransformStream / flush()]    ← 流结束后异步落库
   │  ① session + messages 持久化
   │  ② LLM Trace 记录（TTFT · tokens · latency）
   │  ③ 因果演进：person pattern confidence +0.02
   │  ④ 自动写入新 evidence 条目
   ▼
[block-parser.ts]              ← 输出解析：Markdown → 结构化 Parts
   │  text / quote / artifact(YAML) / memory_candidate
   ▼
[AgentBus → UI]                ← 前端响应：PersonPanel 实时刷新
```

---

## 四个核心问题 × Harness 的回答

---

### ① 模型需要知道什么？
**Harness 提供：目标 · 约束 · 相关资料 · 当前状态**

| Harness 层 | 代码位置 | 注入的内容 |
|---|---|---|
| **基础人格与约束** | `COACH_BASE_PHILOSOPHY` | 角色定义、格式契约（禁止口头伪动作）、实体引用规范 `[姓名](person:id)` |
| **用户画像（Drawer 0）** | `workspace-profile.ts` → `assembleCoachContext` | 工作区名称、行业 contextNote、辅导风格 promptGuidance |
| **干系人世界模型（Drawer 1）** | `people + personModels + evidence` 表 | 每个相关人的：角色·部门·关系·行为模式(置信度%)·最近3条因果证据 |
| **项目空间（Drawer 2）** | `projects + projectArtifacts` 表 | 项目状态·进度·风险清单·旁白备忘·活文档 TOC |
| **Canvas 双线协作（Drawer 3）** | `activeCanvas` 参数 | 当前正在编辑的文档全文（>3000字时截断+TOC） |
| **对话历史** | `AgentSession.send()` L79-85 | 历史消息压缩（assistant 侧统一为"已提供建议"，节省 token） |

**关键设计**：JIT（Just-In-Time）按需供给 —— 不是把所有人/项目全倾倒给模型，而是：
- 有 `projectId` → 只加载该项目干系人
- 有 `focusedPersonId` → 追加聚焦人
- 都没有 → 兜底前 6 位
- Token 预算约 **~2000** tokens（不含对话历史）

---

### ② 模型可以做什么？
**Harness 提供：工具 · 执行环境 · 权限边界**

当前模型的**输出能力**（通过格式契约实现的"工具"）：

| 输出形态 | 触发方式 | 执行效果 |
|---|---|---|
| **普通建议** | 自然段落 / 列表 | `text` Part → ChatFlow 渲染 |
| **建议话术卡片** | `> "话术内容"` 引用块 | `quote` Block → 高亮卡片，可一键复制 |
| **Canvas 活文档** | YAML Frontmatter `---title/type/expected_solution---` | `artifact` Part → 右侧 Canvas 自动展开 |
| **实体深链** | `[姓名](person:id)` `[事件](evidence:id)` | 可点击穿透到 PersonPanel / EvidenceModal |
| **记忆候选沉淀** | `memory.candidate` 事件（协议预留） | `memory_candidate` Part → 人工确认后写库 |
| **生成式 UI** | `ui.generative` 事件 | 渲染 metric_table / timeline_chart 等 |

**权限边界（当前已实现）**：
- 模型**不能**直接写数据库，只能输出 Markdown
- 数据库写入全部在 `onStreamFinished()` 的服务端异步执行
- `confirmMemoryToDatabase()` 需要用户点击确认才触发 —— **人机协同单键沉淀**

---

### ③ 怎么知道做得对不对？
**Harness 提供：测试 · 工具返回 · 结果校验**

**实时信号（对话中）**：

| 信号 | 来源 | 作用 |
|---|---|---|
| `TTFT`（首字延迟） | `chat/route.ts` L76-78 | 感知 LLM 响应速度 |
| `llmCallTraces` 记录 | `onStreamFinished()` | 每次调用的 tokens·latency·charCount 全留底 |
| `block-parser` 解析成功率 | `parseMarkdownToBlocksAndParts()` | 检测模型是否遵守格式契约（YAML Frontmatter 正确解析才打开 Canvas） |
| 实体引用出现率 | `personMatch` 正则 L148 | 检测模型是否主动引用了干系人（有则触发 confidence 演进） |

**离线校验（测试套件）**：

```
tests/backend-runtime.test.ts (19 个用例)
├── assembleCoachContext 注入 profile 内容验证
├── 禁止硬编码 demo 人物（张明·王总·招聘 Agent）
├── session/message/evidence 因果链持久化
├── memory confirm 幂等性（确认两次只写一条）
└── SSE 流切片重组正确性
```

**用户侧反馈（隐式校验）**：
- PersonPanel 置信度 % 是否在对话后提升
- Canvas 是否在模型输出 YAML 后自动打开
- EvidenceModal 里的 rationale（心理归因）是否有意义

---

### ④ 没做好接下来怎么办？
**Harness 提供：重试 · 调整方案 · 补充信息 · 请求人工介入**

| 场景 | 当前机制 | 不足 / 待补 |
|---|---|---|
| **API 上游失败** | `isRunning` 锁防重复；catch → 展示"请求失败，请检查服务配置后重试" | ❌ 无自动重试，无退避策略 |
| **模型格式违约**（没输出 YAML / 口头伪动作） | `block-parser` 容错解包（strip ```markdown 外壳）；格式规范在 prompt 中反复约束 | ❌ 无格式校验后的纠错反馈 |
| **干系人记忆不准** | 用户可在 PersonPanel 点击证据 → EvidenceModal 查看归因 | ❌ 无"标记不准确"→ 降低 confidence 的机制 |
| **模型提炼的 pattern 不对** | `memory.candidate` 推送 → 用户单键确认/忽略 | ✅ 人机协同兜底 |
| **Token 超出** | Canvas 内容截断 3000 字 + TOC；历史 assistant 压缩为"已提供建议" | ❌ 无动态裁剪策略（只有静态阈值） |
| **数据库写入异步失败** | `catch(saveErr)` 打 console.error | ❌ 无告警、无补偿事务 |

---

## 现有架构的核心张力

```
          ┌─────────────────────────────────────────┐
          │             世界模型 (DB)                │
          │  people · personModels · evidence        │
          │  projects · artifacts · sessions         │
          └──────────┬──────────────────┬────────────┘
                     │  JIT读取          │  异步写入
                     ▼                  ▼
          ┌───────────────────┐  ┌─────────────────┐
          │  Context Assembler│  │ onStreamFinished │
          │  (每轮动态装配)   │  │ (流结束后落库)  │
          └────────┬──────────┘  └────────┬────────┘
                   │                      │
                   ▼                      ▼
          ┌───────────────────────────────────────────┐
          │              LLM (DeepSeek-V3)            │
          │   输入：~2000 token Harness + 对话历史    │
          │   输出：Markdown（格式契约约束的"工具"）  │
          └───────────────────────────────────────────┘
                              │
                    block-parser 解析
                              │
              ┌───────────────┼──────────────┐
              ▼               ▼              ▼
           text/quote     YAML artifact   memory.candidate
           (渲染)         (→ Canvas)      (→ 人工确认)
```

**设计的精髓**：模型没有真正的"工具调用"，而是通过**格式契约**把输出变成可被解析的结构 —— YAML Frontmatter 就是 Canvas 工具，`>` 引用块就是"话术工具"，`[人名](person:id)` 就是实体查询工具。格式即行动，Markdown 即协议。

---

## 下一步：Harness 可以补强的方向

| 优先级 | 方向 | 具体 |
|---|---|---|
| 🔴 高 | **格式违约纠错** | 检测模型是否遵守契约，反馈给用户（"本次未生成 Canvas，因为..."） |
| 🔴 高 | **confidence 负向调节** | 用户在 EvidenceModal 标记"归因不准" → `confidence - 0.05` |
| 🟡 中 | **自动重试 + 退避** | 上游 502/503 时最多 2 次重试，指数退避 |
| 🟡 中 | **动态 Token 裁剪** | 历史消息按 token 数滑动窗口，非固定截断 |
| 🟡 中 | **干系人相关性排序** | 按当前对话关键词动态排序干系人优先级，而不是按 projectId 全量加载 |
| 🟢 低 | **异步落库告警** | `onStreamFinished` 失败时写 notifications 表 → 前端展示 |
| 🟢 低 | **真实 Function Calling** | 接入 DeepSeek 的 tool_use，让模型主动查询证据/人物，而不是靠 JIT 预装 |
