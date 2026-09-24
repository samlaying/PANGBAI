/**
 * 工作空间与辅导风格初始化配置 (Workspace & Coaching Profile)
 * 定义【名称、风格、行业】的标准枚举、行业语境说明与提示词引导映射。
 */

export type IndustryKey =
  | "internet_saas"
  | "fintech"
  | "hardware"
  | "ecommerce"
  | "ai_frontier"
  | "healthcare"
  | "general";

export interface IndustryOption {
  key: IndustryKey;
  label: string;
  enLabel: string;
  desc: string;
  contextNote: string;
}

export const INDUSTRY_OPTIONS: IndustryOption[] = [
  {
    key: "internet_saas",
    label: "互联网 / 企服 SaaS",
    enLabel: "INTERNET & SAAS",
    desc: "敏捷迭代、跨部门协同、转化率与交付排期博弈",
    contextNote: "关注功能灰度放量、数据转化指标、产研与业务方需求博弈、跨部门 OKR 协同。",
  },
  {
    key: "fintech",
    label: "金融科技 / 银行证券",
    enLabel: "FINTECH & BANKING",
    desc: "强监管合规、安全风控、多方审计与高可用高可靠",
    contextNote: "格外重视数据安全合规、监管审评、系统容灾兜底与业务责任边界划分。",
  },
  {
    key: "hardware",
    label: "消费电子 / 智能硬件",
    enLabel: "HARDWARE & IOT",
    desc: "软硬件协同、试产走线、供应链交期与 BOM 成本",
    contextNote: "关注软硬件联调周期、供应链试产（EVT/DVT/PVT）阶段、BOM 成本控制与交付死线。",
  },
  {
    key: "ecommerce",
    label: "电商零售 / 消费品牌",
    enLabel: "E-COMMERCE & RETAIL",
    desc: "大促节点、GMV 与 ROI、供应链履约及渠道博弈",
    contextNote: "紧盯大促时间表、投产比（ROI）、供应链履约时效与渠道运营诉求。",
  },
  {
    key: "ai_frontier",
    label: "人工智能 / 大模型应用",
    enLabel: "AI & FRONTIER TECH",
    desc: "能力边界验证、算力成本、探索性落地与不确定性管理",
    contextNote: "聚焦模型能力边界、幻觉控制、Token 算力 ROI、探索性业务落地中的预期管理。",
  },
  {
    key: "healthcare",
    label: "医疗健康 / 生物医药",
    enLabel: "HEALTHCARE & BIOTECH",
    desc: "专业审评、临床流程、严格隐私规范与行业资质",
    contextNote: "严把合规认证门槛、专业临床流程、隐私保护法规，注重稳妥严谨的风险控制。",
  },
  {
    key: "general",
    label: "通用企业 / 综合行业",
    enLabel: "GENERAL ENTERPRISE",
    desc: "组织汇报、权责闭环、务实落地与职场人际破局",
    contextNote: "重视职场组织沟通、向上管理、权责协同界限与务实目标交付。",
  },
];

export type CoachingStyleKey =
  | "strategic"
  | "sharp"
  | "gentle"
  | "rigorous";

export interface CoachingStyleOption {
  key: CoachingStyleKey;
  label: string;
  enLabel: string;
  desc: string;
  promptGuidance: string;
}

export const COACHING_STYLE_OPTIONS: CoachingStyleOption[] = [
  {
    key: "strategic",
    label: "沉稳军师型",
    enLabel: "STRATEGIC ADVISOR",
    desc: "谋定后动，看透组织利益博弈与潜台词，稳步布局",
    promptGuidance: "风格沉稳冷静、高屋建瓴。善于帮用户看清多方干系人的隐秘诉求与利益博弈，不急躁，给出步步为营的破局推演。",
  },
  {
    key: "sharp",
    label: "犀利实战型",
    enLabel: "SHARP PRACTITIONER",
    desc: "一针见血，不讲客套废话，直击痛点并给现成抓手",
    promptGuidance: "风格一针见血、节奏紧凑。不讲套话空话，剔除情绪内耗，直接指出问题命脉，并直接给出可复制执行的具体话术与方案抓手。",
  },
  {
    key: "gentle",
    label: "温和启发型",
    enLabel: "GENTLE COACH",
    desc: "深度倾听与共情，通过提问启发思考，缓解焦虑",
    promptGuidance: "风格温和包容、富有同理心。先接纳用户的职场压力与情绪，再通过苏格拉底式提问启发其自主思考破局策略，循循善诱。",
  },
  {
    key: "rigorous",
    label: "结构严谨型",
    enLabel: "STRUCTURED ARCHITECT",
    desc: "严格按 MECE 框架拆解，注重闭环交付与流程规范",
    promptGuidance: "风格条理极其严密清晰。习惯用 MECE 结构化思维拆解复杂问题，强调阶段目标、责任边界、检查清单与复盘闭环。",
  },
];

export interface WorkspaceProfile {
  name: string;
  industry: IndustryKey;
  style: CoachingStyleKey;
  isInitialized: boolean;
}

export const DEFAULT_WORKSPACE_PROFILE: WorkspaceProfile = {
  name: "我的工作区",
  industry: "internet_saas",
  style: "strategic",
  isInitialized: false,
};
