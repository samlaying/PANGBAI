import { db } from "../src/db/client";
import { people, personModels, evidence } from "../src/db/schema";
import { eq } from "drizzle-orm";

async function seedProfiles() {
  console.log("Seeding Huang Yue (+1) and Zhu Xiaotian (MT) into Workplace CRM...");

  // 1. 黄越（喜庆儿，+1 业务总控）
  const huangId = "person_huang_yue";
  await db.delete(evidence).where(eq(evidence.personId, huangId));
  await db.delete(personModels).where(eq(personModels.personId, huangId));
  await db.delete(people).where(eq(people.id, huangId));

  await db.insert(people).values({
    id: huangId,
    name: "黄越（喜庆儿）",
    role: "+1 业务负责人",
    department: "产品与商业化团队",
    relationshipTone: "偏紧绷·高要求",
    tensionScore: 65,
    advice: "结论先行，绝不在汇报里夹带未消化的流水账；对算力Token成本极敏感；沟通排期时给‘保核心范围’的选择题而非直接承诺死期。",
  });

  await db.insert(personModels).values([
    {
      id: "pm_huang_1",
      personId: huangId,
      pattern: "极其看重‘无原文冗余的纯结论报告’，要求材料具备直接对外部/高层交付的成色",
      confidence: 0.95,
      evidenceCount: 3,
      lastObservedAt: "飞书群聊：4个人呀",
    },
    {
      id: "pm_huang_2",
      personId: huangId,
      pattern: "对算力成本、Token 消耗与商业 ROI 保持高度警戒，敏锐感知隐性成本风险",
      confidence: 0.92,
      evidenceCount: 2,
      lastObservedAt: "飞书群聊：Lily二期对齐",
    },
    {
      id: "pm_huang_3",
      personId: huangId,
      pattern: "强推进排期管理风格，倾向通过当日多频对齐施加交付压力，紧盯下周上线闭环",
      confidence: 0.90,
      evidenceCount: 4,
      lastObservedAt: "飞书群聊：Lily二期对齐",
    },
  ]);

  await db.insert(evidence).values([
    {
      id: "ev_huang_1",
      personId: huangId,
      source: "飞书群聊：4个人呀",
      dateStr: "7月13日",
      observation: "要求产出‘不带原文的调研结论报告’，明确说明是‘好发给杨玉等人’",
      rationale: "体现其对材料的加工深度与汇报效能有极高要求，反感把未经提炼的粗材料抛给上游",
    },
    {
      id: "ev_huang_2",
      personId: huangId,
      source: "飞书群聊：Lily二期对齐",
      dateStr: "6月25日",
      observation: "主动质询技术：‘感知不到 hermes 对 token 的消耗，现在一个会话的成本能估算出来么’",
      rationale: "关注产品底层单会话单位经济模型（Unit Economics），向其汇报需主动准备成本测算数据",
    },
    {
      id: "ev_huang_3",
      personId: huangId,
      source: "飞书群聊：Lily二期对齐",
      dateStr: "6月26日",
      observation: "连续发问：‘简历详情怎么样下周能上’、‘五点再对一遍’",
      rationale: "高压盯盘习惯，若未给明确答复容易激化管理焦虑，需及时用‘保底方案’对冲",
    },
  ]);

  // 2. 朱晓天（晓然，MT 导师）
  const xiaoId = "person_zhu_xiaotian";
  await db.delete(evidence).where(eq(evidence.personId, xiaoId));
  await db.delete(personModels).where(eq(personModels.personId, xiaoId));
  await db.delete(people).where(eq(people.id, xiaoId));

  await db.insert(people).values({
    id: xiaoId,
    name: "朱晓天（晓然）",
    role: "MT (产品导师)",
    department: "产品部",
    relationshipTone: "稳定协同·强护航",
    tensionScore: 25,
    advice: "核心职业盟友。在黄越的高压下是你的直接挡箭牌；在业务上倾囊相授；与其配合应保持极高的执行透明度，积极响应其范围收敛节奏。",
  });

  await db.insert(personModels).values([
    {
      id: "pm_xiao_1",
      personId: xiaoId,
      pattern: "高压排期下的敏捷收敛专家，善于通过‘无设计稿先保底MVP’化解交付死锁",
      confidence: 0.94,
      evidenceCount: 3,
      lastObservedAt: "飞书群聊：Lily二期对齐",
    },
    {
      id: "pm_xiao_2",
      personId: xiaoId,
      pattern: "具强保护性与担当意识的导师，主动为新人争取金山软件等核心客户现场拜访名额",
      confidence: 0.96,
      evidenceCount: 4,
      lastObservedAt: "飞书群聊：金山软件拜访",
    },
    {
      id: "pm_xiao_3",
      personId: xiaoId,
      pattern: "倾囊相授型的业务引路人，主动沉淀出海经验、新能源、Mapping等成套培训课件",
      confidence: 0.90,
      evidenceCount: 6,
      lastObservedAt: "飞书群聊：4个人呀",
    },
  ]);

  await db.insert(evidence).values([
    {
      id: "ev_xiao_1",
      personId: xiaoId,
      source: "飞书群聊：Lily二期对齐",
      dateStr: "6月26日",
      observation: "黄越逼问排期时，晓天定调：‘下周先保抽屉简历详情，无设计稿按照弹窗参考保留核心’，当晚 21:18 输出原型 Wiki",
      rationale: "展现出成熟的范围管理（Scope Management）与替团队扛压的能力，是化解高层焦虑的解题范式",
    },
    {
      id: "ev_xiao_2",
      personId: xiaoId,
      source: "飞书群聊：金山软件拜访",
      dateStr: "7月20日",
      observation: "发现名单没有林承列时，主动在群内纠正‘我们是3个人，把表格改下’，拜访前提醒‘我和承列过去，公司出发一块走’",
      rationale: "非常在意新人的实战成长，愿意给新人提供高曝光的商业实战场景",
    },
    {
      id: "ev_xiao_3",
      personId: xiaoId,
      source: "飞书群聊：4个人呀",
      dateStr: "7月16日",
      observation: "一口气发了 7 份关于行业研究、职位沟通、客户拜访、Mapping技能的完整培训材料",
      rationale: "高度重视方法论沉淀，对结构化思考与专业技能提升有持续追求",
    },
  ]);

  // 3. 袁金龙（瘦头陀，核心技术骨干）
  const jinlongId = "person_yuan_jinlong";
  await db.delete(evidence).where(eq(evidence.personId, jinlongId));
  await db.delete(personModels).where(eq(personModels.personId, jinlongId));
  await db.delete(people).where(eq(people.id, jinlongId));

  await db.insert(people).values({
    id: jinlongId,
    name: "袁金龙（瘦头陀）",
    role: "核心研发 / Agent 架构骨干",
    department: "技术研发部",
    relationshipTone: "务实坦诚·直来直往",
    tensionScore: 35,
    advice: "直奔技术实质，讲清业务场景和数据依赖（如为什么需要某个时间戳字段、是否用于排序）；对 LLM、Prompt 与 Schema 机制保持坦诚双向对齐；提需求时先给确定性输入，避免模糊概念。",
  });

  await db.insert(personModels).values([
    {
      id: "pm_jinlong_1",
      personId: jinlongId,
      pattern: "深度参与 Agent 底层与 LLM 工程，精通 Tool Schema、Prompt Few-Shot 与 SubAgent 调度，风格直爽务实",
      confidence: 0.95,
      evidenceCount: 4,
      lastObservedAt: "飞书群聊：青桐、瘦头陀等8人",
    },
    {
      id: "pm_jinlong_2",
      personId: jinlongId,
      pattern: "实干型后端研发，敏锐追问业务底层的字段用途与查询依赖，快速定位根因并补齐接口",
      confidence: 0.93,
      evidenceCount: 3,
      lastObservedAt: "飞书群聊：Lily加油",
    },
    {
      id: "pm_jinlong_3",
      personId: jinlongId,
      pattern: "排期评估讲究节奏与实际负荷，倾向‘快速推完当前阶段、再规划下一阶段’的敏捷推进方式",
      confidence: 0.90,
      evidenceCount: 2,
      lastObservedAt: "飞书群聊：talora",
    },
  ]);

  await db.insert(evidence).values([
    {
      id: "ev_jinlong_1",
      personId: jinlongId,
      source: "飞书群聊：青桐、瘦头陀等8人",
      dateStr: "7月29日",
      observation: "在探讨 Card 与 Skill 格式时指出：‘llm 不要生成，直接给内容，约束这个就行’，并定位到 Few-Shot 示例才是关键影响因素",
      rationale: "展现出对 Prompt Engineering 与工具调用约束的深刻理解，善于从根因拆解大模型输出偏差",
    },
    {
      id: "ev_jinlong_2",
      personId: jinlongId,
      source: "飞书群聊：Lily加油",
      dateStr: "6月6日",
      observation: "快速排查‘无法访问猎聘职位’故障，主动追问并补齐排序缺失的 projectCreatetime 字段：‘我给加下，为啥需要这个展示是吧？’",
      rationale: "响应迅速，沟通注重字段背后的真实消费场景（排序 vs 依赖），不盲目加字段",
    },
    {
      id: "ev_jinlong_3",
      personId: jinlongId,
      source: "飞书群聊：talora",
      dateStr: "4月30日",
      observation: "针对 6.18 节点评估时直言‘3期挺紧张的... 把2期快速推了 规划下3期看吧’",
      rationale: "面对范围与时间冲突时，坚持保阶段交付质量，倾向分批落地而非一次性堆砌",
    },
  ]);

  console.log("SUCCESS! Huang Yue, Zhu Xiaotian & Yuan Jinlong profiles seeded.");
}

seedProfiles().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
