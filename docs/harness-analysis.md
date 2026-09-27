# PANGBAI · Agent Harness 架构分析（现状版）

> 每一轮对话，Harness 都在回答同一个问题：
> **这一步，模型需要知道什么、能做什么、怎么评判好坏、不对时怎么办？**
>
> 本文档描述**代码的现状**，与《backend-harness-architecture.md》设计规范互为对照；
> 两者冲突时以本文与代码为准。

---

## 全局视角：一次对话的完整生命周期

```
用户输入
   │
   ▼
[AgentSession.send()]          ← 业务层：组装历史（assistant 侧发送真实正文，每轮截断 500 字符）
   │
   ▼
[POST /api/chat]               ← Harness 主通道
   │  ① runJevDecision（TypeSafe API，1200ms 熔断；无 key/超时/失败 → 本地正则启发式）
   │  ② assembleHarnessContext（Drawer 分层装配，见下）
   │  ③ pruneMessagesForTokenBudget（12K token 预算，CJK 感知估算）
   ▼
[LLM 生成 · DeepSeek-V3]       ← 模型推理（stream_options.include_usage 请求真实 usage）
   │
   ▼
[consumeUpstream + 流头门禁]    ← 文档技能缓冲流头，frontmatter 契约可判定即放行/违约
   │  违约 → 取消上游 → 带修正指令重试一次 → 仍违约回退合成修复（gate_retry_exhausted）
   ▼
[QualityGate.processOutput]     ← 流后全文修复（quote 前缀剥离、实体超链回填）
   │  改写文本 → 下发 message.final，保证 用户所见 == 落库 == artifact
   │  结构化报告 → tool.result / run.finished.metadata / llmCallTraces
   ▼
[classifyRunOutcome]            ← 终态裁决：success/aborted/failed × finishReason
   │  失败 → run.error（先于 run.finished）；落库部分回复 + 真实 status trace
   │  断连（req.signal / cancel() / enqueue 抛错）→ aborted，中断上游、跳过 CRM
   ▼
[Workplace CRM Worker]          ← 仅成功回合；抽取失败即空产出（不编造兜底）
   │  人物洞察与偏好信号 → memory_candidates（一律 pending）
   │  evidence / person_models 写入只发生在用户确认后的 confirmMemoryToDatabase 事务
   ▼
[block-parser.ts]               ← 输出解析：Markdown → 结构化 Parts
   ▼
[AgentBus → UI]                 ← 前端响应；确认按钮是真实闸门
```

---

## 四个核心问题 × Harness 的回答

### ① 模型需要知道什么？

| Harness 层 | 代码位置 | 注入的内容 |
|---|---|---|
| 基础人格与格式契约 | `context-engine.ts` BASE_PHILOSOPHY | 角色定义、Canvas/话术/实体链接三契约 |
| 工作区画像（Drawer 0） | `assembleHarnessContext` | 名称·行业·风格·已确认辅导偏好 |
| 技能元数据（常驻）+ 命中 SOP（JIT） | `skill-registry.ts` | 10 技能概览常驻；Jev 命中后注入完整 SOP |
| 干系人世界模型（Drawer 1） | `context-engine.ts` | 项目干系人 JIT；无项目则兜底前 5 人 |
| 战法语料卡（Drawer 1 增强） | `playbook-matcher.ts` | 按当前输入匹配 top-2 |
| Canvas 活文档（Drawer 3） | `truncateForContext` | 估算 <20K token 全文；超限头尾保留 + 显式中段省略标注 |
| 近期事实素材（Drawer 4） | events 表切片 | 项目内最近 5 条 / 全局 3 条，200 字预览 |
| 对话历史 | `pruneMessagesForTokenBudget` | 估算 ≤12K token 原样；超限保留首轮 + 最新 4 条，中间轮逐轮中性存根（前 40 字，明示不代表共识） |

Token 估算为 CJK 感知启发式（`tokens.ts`：中日韩 1 token/字，其余 4 字符/token）；trace 优先记录 provider 返回的真实 usage。

### ② 模型可以做什么？

模型**没有任何执行通道**——LLM 请求不含 tools 字段，能力全部通过"格式即行动"实现：

| 输出形态 | 触发方式 | 执行效果 |
|---|---|---|
| 普通建议 | 自然段落/列表 | `text` Part 渲染 |
| 建议话术卡片 | `> "话术"` 引用块 | `quote` Block，可复制 |
| Canvas 活文档 | 文首 YAML Frontmatter | `artifact` Part → 右侧 Canvas 展开 |
| 实体深链 | `[姓名](person:id)` | 点击穿透 PersonPanel / EvidenceModal |
| 记忆候选 | 服务端 CRM 反思产出 | pending candidate → **用户确认后**才写 evidence/模型 |
| 生成式 UI | `ui.generative` 事件 | metric_table / timeline_chart 等 |

权限边界是**结构性**的：模型写不了数据库；所有写入要么是服务端后置执行（session/message/trace），要么必须经过用户确认事务（`confirmMemoryToDatabase`，幂等）。人物洞察与偏好信号一律以 pending 候选呈现，确认按钮（忽略 ✕ / 确认 ✓ 两键）是唯一晋升入口。

### ③ 怎么知道做得对不对？

| 信号 | 来源 | 说明 |
|---|---|---|
| 终态分类 | `run-outcome.ts` classifyRunOutcome | success/aborted/failed × finishReason（stop/empty_reply/client_disconnect/upstream_error/gate_retry_exhausted）；idle ≠ turn success |
| run.error 事件 | chat route | 失败回合先发 run.error 再发 run.finished，客户端渲染中断提示 |
| llmCallTraces | chat route | 真实 status、TTFT、真实 usage（provider 优先，估算兜底）、finishReason、门禁报告全留底 |
| 流头门禁 | `quality-gate.ts` headGateCheck | frontmatter 契约在最初几个 delta 内判定，违约文本不触达用户 |
| 门禁报告 | processOutput → {violations, repairs, retried} | 随 tool.result / run.finished / trace 下发 |

离线校验（node:test + tsx，每文件独立进程 + PGlite）：
`backend-runtime`（路由/持久化/确认幂等）、`chat-terminal-state`（五类终态场景）、`quality-gate`（门禁契约一致性回归）、`crm-honesty`（不编造/pending-only/确认晋升）、`context-honesty`（截断与存根诚实性）、`agent-session-final`（message.final/run.error 客户端语义）、`agent-history`（历史真实化）、`harness-utils`、`agent-runtime-layers`、`prompt-templates`、`proxy`。

### ④ 没做好接下来怎么办？

| 场景 | 当前机制 | 状态 |
|---|---|---|
| 上游非 200（流开始前） | 502 快速失败 | ✅ |
| 流中上游异常 | streamError 捕获 → run.error + failed trace + 部分回复落库 | ✅ |
| 客户端断连 | req.signal 级联 + cancel() 兜底 + emitter 吞错 → aborted trace，中断上游、跳过 CRM | ✅ |
| 空回复 | empty_reply 分类 + run.error | ✅ |
| 文档技能格式违约 | 流头拦截 + 一次带反馈修正重试 + 合成修复回退（gate_retry_exhausted） | ✅ |
| CRM 抽取失败（超时/解析失败） | 诚实空产出，不编造证据 | ✅ |
| 记忆不准 | 用户逐条 忽略/确认；确认前不落任何 evidence | ✅ |
| 网关不支持 stream_options | 识别 4xx 后去字段重发一次 | ✅ |
| API 请求级自动重试 + 退避 | 无 | ❌ 路线图 |
| confidence 负向调节（标记不准→降置信） | 无 | ❌ 路线图 |
| 落库失败告警/补偿 | console.error 留底 | ❌ 路线图 |
| 真 Function Calling（模型主动查证据/人物） | 无 tools 通道 | ❌ 路线图 |

---

## 设计的精髓

模型没有工具调用，而是通过**格式契约**把输出变成可被解析的结构——YAML Frontmatter 即 Canvas 工具，`>` 引用即话术工具，`[人名](person:id)` 即实体查询工具。格式即行动，Markdown 即协议。本 Harness 的纪律是：**契约判定与两端解析器同源**（`FRONTMATTER_RE` 单一事实源）、**终态必须分类**、**未确认不落库**、**降级不编造**。

## 历史包袱的清理记录（2026-09-27）

- 删除 `planning-state.ts`：`generateInitialTodoList` 无视用户输入返回硬编码模板（step_1 恒 completed / step_2 恒 in_progress），PLANNING_STORE 只写不读、无任何 UI/SSE 消费者——假进度比没有更糟。
- 删除 tmpdir offload：模型无工具读回落盘文件，"自主调阅"无从发生；改为头尾截断 + 显式省略标注。
- 删除中间历史固定文案"已妥善达成共识并推动至当前状态"：无论实际谈了什么都宣称共识达成；改为逐轮中性存根。
- 删除 CRM 人名命中兜底（编造 0.8 置信度证据 + 万能 pattern 句）与 insights/preference 确认前直写 evidence/person_models：确认按钮从摆设变为真实闸门。
- 删除 jev-decision 内嵌 API key 字面量（已随 abc8da2 推送视为泄露，密钥改 env-only 并轮换）。
- 客户端 assistant 历史不再压成固定串"已提供建议"：模型此前从来看不到自己上一轮说了什么。
- chars/3 token 估算（中文低估 2-3 倍，阈值形同虚设）→ CJK 感知估算 + provider 真实 usage 优先。
