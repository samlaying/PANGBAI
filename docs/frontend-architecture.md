# 旁白（PANGBAI）— 前端系统架构与 UI 设计原则规范

> **核心设计哲学**：
> 1. **Agent Runtime 可视化客户端**：前端不仅是聊天对话框，而是后端 Agent 事件驱动的可视化 Runtime 容器；
> 2. **严格三层单向依赖解耦**：基础设施层（零业务感知） ➔ 业务领域层（纯 TS 零 React 依赖） ➔ 表现与组件层（声明式驱动）；
> 3. **零件化流式驱动（Message Parts Driven）**：以强类型微零件（Parts）替代黑盒长文本，支持富交互卡片渐进式渲染；
> 4. **配置与视图绝对分离（Code-Level Configuration）**：场景模版与业务规则收敛于代码级配置层，杜绝在 JSX 中硬编码；
> 5. **产品克制与报刊美学（Editorial Restraint & KISS）**：坚守极简纸质感与编辑部风格，杜绝低频 CRUD 弹窗导致的界面臃肿；
> 6. **高价值输入引导（Context-Rich Scaffolding）**：以结构化脚手架降低用户构思门槛，实现“高质量输入带动高水平破局”。

---

## 一、系统定位与认知演进

### 1. 传统前端视角的局限
在传统对话类 Web 应用中，前端常被简化为：
> “一个输入框 + 消息气泡列表 + 直接请求大模型接口”

这种模式在面对复杂 Agent 系统时存在致命缺陷：
- **逻辑缠绕严重**：网络传输、Markdown 解析、业务状态、弹窗路由与 React JSX 混在一个组件文件内，动辄数百行；
- **状态黑盒化**：大模型输出被当成单一字符串，无法对建议方案、候选证据、Canvas 活文档、演练提纲进行细粒度控制与局部刷新；
- **极度依赖端到端环境**：任何功能变动都必须跑全量无头浏览器测试，测试执行慢、容易偶发失败。

### 2. PANGBAI 前端的核心定位
**前端是 Agent Runtime 的事件驱动可视化客户端（Visual Runtime Client）。**
- 后端 Agent 是一个持续发出结构化事件流（SSE Events）的决策状态机；
- 前端只负责两件事：
  1. **事件消费与状态维护**：在内存中准确解构并聚合事件流，组装为高内聚的业务领域实体；
  2. **声明式可视化呈现**：React 纯粹作为投影层（Projection Layer），根据最新状态派发视图渲染与捕获用户交互。

---

## 二、前端三层架构设计与解耦契约

前端工程建立在严格的**三层单向依赖体系**上，禁止越层调用与反向依赖：

```
┌────────────────────────────────────────────────────────────────────────┐
│ 1. 表现与组件层 (Presentation Layer)                                  │
│    src/components/ (纯展示组件: ChatFlow, Composer, EmptyState, Canvas)│
│    src/hooks/      (React 适配器: useAgentSession, useWorkspace 等)    │
└───────────────────────────────────▲────────────────────────────────────┘
                                    │ 依赖 / 桥接订阅
┌───────────────────────────────────┴────────────────────────────────────┐
│ 2. 业务领域层 (Business Domain Layer)                                  │
│    src/business/bus/      (事件总线: AgentBus)                         │
│    src/business/entities/ (实体定义: AgentSession, MessagePart)        │
│    src/business/parser/   (结构化 Markdown 与 YAML 块解析器)           │
│    * 纯 TypeScript 实现，零 React 依赖，100% 独立单测覆盖 *            │
└───────────────────────────────────▲────────────────────────────────────┘
                                    │ 依赖 / 调用通信
┌───────────────────────────────────┴────────────────────────────────────┐
│ 3. 基础设施层 (Infrastructure Layer)                                   │
│    src/infra/transport/   (SSE 流解码、跨包拼接与反序列化)             │
│    src/infra/api/         (HTTP 客户端与数据契约映射)                  │
│    src/infra/storage/     (客户端存储 ClientStorage，容错降级)         │
│    * 纯通用底层工具，对上层业务领域概念零感知 *                        │
└────────────────────────────────────────────────────────────────────────┘
```

### 1. 基础设施层（`src/infra/`）
- **核心职责**：封装着与网络、存储、运行环境交互的技术实现。
  - `transport/sse-stream.ts`：处理网络 chunk 切片、粘包处理与 SSE 协议行解析；
  - `storage/client-storage.ts`：封装 LocalStorage 容错读写与 SSR 降级；
  - `api/`：负责标准 HTTP Fetch 请求并映射为强类型返回。
- **解耦红线**：**对上层业务概念零感知**。基础设施层绝对不允许出现 `Coach`、`Memory`、`Candidate`、`Project` 等业务专有词汇。

### 2. 业务领域层（`src/business/`）
- **核心职责**：沉淀前端核心 Runtime 逻辑与状态机。
  - `bus/agent-bus.ts`：发布订阅总线，支持事件分发与组件级解耦；
  - `entities/agent-session.ts`：会话生命周期管理，处理事件聚合；
  - `entities/message-part.ts`：定义消息零件模型；
  - `parser/block-parser.ts`：实时解析大模型流中的 YAML Frontmatter、引用金句与富交互块。
- **解耦红线**：**完全与 React 解耦**。不包含任何 `useState`、`useEffect`、`useCallback` 或 JSX。脱离浏览器可在 Node.js 环境毫秒级完成测试。

### 3. 表现与组件层（`src/components/` & `src/hooks/`）
- **核心职责**：响应式桥接与视图布局。
  - `src/hooks/` 作为“胶水适配器（Adapter）”，负责将业务领域层的对象和总线事件转换为 React 响应式 State；
  - `AppShell` 保持轻量（Thin Orchestrator），只做子系统组装、全局快捷键与模态框调度，严禁在其中书写解析或接口拼装逻辑；
  - 组件层纯粹通过 props 接收纯数据并进行声明式渲染。

---

## 三、事件驱动与 Message Parts 流式状态机

大模型输出绝非单一文本块，而是复合意图的混合流。

### 1. 微零件模型（Message Parts）
消息实体 `AgentMessage` 由结构化零件 `MessagePart[]` 驱动：
- **`text`**：正文段落，支持首字下沉（Dropcap）排版与 Markdown 渲染；
- **`quote`**：模型提取出的高价值对话金句或建议回复；
- **`artifact`**：包含 YAML 头的产物大纲或方案文档，可一键发送至右侧 Canvas 活文档；
- **`memory_candidate`**：模型在对话中捕捉到的人物认知候选，支持单键确认沉淀为证据链；
- **`rehearsal`**：针对特定高难度场景的一对一模拟演练卡片。

### 2. 渐进式流式解析（Progressive Block Parsing）
1. 随着 SSE 流推送文本 chunk，`AgentBus` 分发 `text_chunk` 事件；
2. `BlockParser` 动态维护块级状态，识别换行与边界，将完整的段落即时封装为 Part；
3. 视图层以 Part 为粒度增量挂载，杜绝整屏重新排版（Layout Shift）和全量 Markdown 重新编译闪烁。

---

## 四、UI 交互与视图重构核心原则（以场景模版与输入框为例）

在场景模版与输入框的排查重构中，确立了以下 UI 与工程原则：

### 1. 配置与视图绝对分离（Code-Level Configuration）
- **痛点**：过去模版标题、说明文案和提示词死死绑在 `EmptyState.tsx` 的 JSX 中。
- **原则**：抽离至 [`src/config/prompt-templates.ts`](file:///Users/sam/03-Code/02-Own/PANGBAI/src/config/prompt-templates.ts)，以强类型数组集中维护。
- **工程价值**：增删场景、调整文案、重构占位字段，仅需修改配置文件，视图组件自动按契约映射渲染。

### 2. 产品克制与 KISS 原则（Keep It Simple, Stupid）
- **核心思考**：**可配置指“代码级易配置”，而非“UI 级增删改查”**。
- **决策理由**：
  - 旁白定位是高专注度的严肃策略决策辅助工具，而非通用的模版管理软件；
  - 增加“配置场景模版”按钮和编辑弹窗会破坏界面的安静感与沉浸感；
  - 坚决杜绝低频功能的过度 UI 设计（Feature Creep），将界面留给核心内容。

### 3. 高价值输入引导原则（Context-Rich Scaffolding）
- **痛点**：简短模糊的提问（如“有句话不知道怎么回”）导致大模型只能猜测或反复反问。
- **原则**：模版必须是**具备明确字段占位符的多行结构化 Markdown**。
- **模版范例**：
  - **记录今天的一件事**：明确提取 `[场景与事件]`、`[涉及人员]`、`[核心冲突与不适点]`、`[我当时反应]`；
  - **有个会要准备**：结构化锁定 `[会议主题]`、`[核心参会人与角色]`、`[预期目标]`、`[分歧风险]`；
  - **有句话不会回**：提取 `[对方原话]`、`[对方身份]`、`[我方顾虑]`，引导模型输出 2~3 版差异化语气；
  - **新建项目档案**：提取 `[项目名称]`、`[里程碑]`、`[核心干系人]`、`[已知阻力]`，直接连通 Canvas 生成方案。
- **价值**：降低用户的构思门槛，把一次普通的聊天转变为深度上下文对齐。

### 4. 自适应排版体验原则（Adaptive Layout）
- 输入框支持根据填入的多行结构自适应拉伸高度（最高 `220px` 并支持内联滚动）；
- 模版填入后自动触发焦点聚焦，光标默认移至内容末尾，实现无缝接续书写。

---

## 五、状态流转、React 最佳实践与防坑规范

在修复输入框与外部场景模版联动的过程中，沉淀出以下 React 最佳实践准则：

### 1. 杜绝在 Effect 中同步调用 `setState`
- **问题**：在 `useEffect` 中监听属性并在回调中同步 `setText`，会触发 React 19 / ESLint 核心规则 `react-hooks/set-state-in-effect` 报错，导致多次级联重新渲染（Cascading Renders）。
- **标准范式**：
  - **基于属性差值在渲染期调整状态**：
    ```tsx
    const [text, setText] = useState(prefill.text || "");
    const [prevN, setPrevN] = useState(prefill.n);

    // 属性变化时直接在渲染期派生，避免额外的副作用渲染轮次
    if (prefill.n !== prevN) {
      setPrevN(prefill.n);
      setText(prefill.text || "");
    }
    ```
  - **纯粹副作用留给 Effect**：
    聚焦光标、选区设置、高度 DOM 计算属于真实 DOM 副作用，在 `useEffect` 中安全执行。

### 2. 保证状态流动的确定性与单向性
- 所有从外部触发的内容注入统一通过 `UIContext.ask(text)` ➔ `AppShell.setPrefill` ➔ `Composer.prefill` 单向传递；
- 避免不同组件之间跨层直接操作 DOM 或互相持有对方的内部状态引用。

---

## 六、工程可测试性与校验保障体系

前端代码的健壮性依赖于轻量且强硬的自动化防线：

1. **秒级轻量单测（Fast Unit Testing）**：
   - 业务领域层与配置层剥离了浏览器与 DOM 依赖，直接通过 `node --import tsx --test tests/*.test.ts` 执行；
   - 13+ 单元测试覆盖 Markdown/YAML 块级解析、总线分发、会话状态流转、模版配置完整性，执行耗时 < 300ms。
2. **静态全量检测与构建拦截（Static Guardrails）**：
   - `npx tsc --noEmit`：保证强类型无隐式 `any`；
   - `npm run lint`：ESLint 严格拦截不合理的 React hooks 使用模式；
   - `npm run build`：生产级 Turbopack 构建校验，防范打包期潜在隐患。
3. **架构影响面分析（GitNexus Impact Analysis）**：
   - 在修改关键组件（如 `Composer`、`EmptyState`）前，使用静态调用图与依赖图分析受影响的调用者与执行流，避免无意识破坏上下游关系。

---

## 七、架构对照总结表

| 维度 | 历史状态 / 常见误区 | 旁白规范架构 |
| :--- | :--- | :--- |
| **前端角色定位** | 简单的聊天框 + 字符串列表 | Agent Runtime 的事件驱动可视化客户端 |
| **代码分层** | 业务逻辑、解析代码与 JSX 混合 | 基础设施层（零业务）+ 领域层（纯 TS）+ 表现层（React 适配）三层严密解耦 |
| **消息组织** | 黑盒纯 Markdown 文本 | 强类型零件结构（Message Parts：Text、Quote、Artifact、Memory） |
| **模版与业务配置** | 硬编码在组件内部 / 盲目做 UI 弹窗 | 收敛至 `src/config/prompt-templates.ts`，纯代码级集中管理 |
| **提示词设计** | 简短单句短语，上下文贫乏 | 结构化多行占位引导（时间、人物、冲突、顾虑、目标） |
| **React 状态处理** | 在 Effect 中滥用 `setState` 触发级联重绘 | 渲染期安全派生状态，DOM 副作用独立收敛，杜绝隐式渲染性能隐患 |
| **可测试性** | 强依赖浏览器与庞大 UI 环境 | 核心领域逻辑可在 Node.js 中以毫秒级运行自动化单测 |
