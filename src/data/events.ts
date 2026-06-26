// ============================================================
// 事件配置
// 所有事件数据集中管理，逻辑代码中不硬编码事件概率/效果
// ============================================================

/**
 * 事件模板
 * - chance: 基础触发概率（0-1），每日独立判定
 * - minGold / maxGold: 金币变化范围（负=损失）
 * - cargoLossChance: 丢失货物的概率（0-1）
 * - maxCargoLoss: 最多丢失货物单位数
 * - triggerText: 触发时显示的文字（叙事描述）
 * - resultText: 结果文本（效果概述），为空时由 view builder 从数值计算
 * - regionProbMultiplier: 区域概率乘数，key=区域名，0=从不触发，不列=1.0
 */
export interface EventTemplate {
  readonly chance: number;
  readonly minGold: number;
  readonly maxGold: number;
  readonly cargoLossChance: number;
  readonly maxCargoLoss: number;
  readonly triggerText: string;
  readonly resultText: string;
  readonly regionProbMultiplier?: Readonly<Record<string, number>>;
}

export const EVENT_CONFIGS: readonly EventTemplate[] = [
  {
    chance: 0.22,
    minGold: 10,
    maxGold: 50,
    cargoLossChance: 0,
    maxCargoLoss: 0,
    triggerText: "海面吹起顺风，船帆鼓满，船行如飞。",
    resultText: "",
  },
  {
    chance: 0.08,
    minGold: -30,
    maxGold: 0,
    cargoLossChance: 0,
    maxCargoLoss: 0,
    triggerText: "海面平静如镜，船帆无力地垂下，船队停滞不前。",
    resultText: "",
    regionProbMultiplier: {
      南洋: 1.5,
    },
  },
  {
    chance: 0.15,
    minGold: -80,
    maxGold: -20,
    cargoLossChance: 0.3,
    maxCargoLoss: 3,
    triggerText: "天色骤变，狂风裹着巨浪劈头盖脸地砸来！",
    resultText: "",
    regionProbMultiplier: {
      东瀛: 1.4,
    },
  },
  {
    chance: 0.1,
    minGold: 0,
    maxGold: 0,
    cargoLossChance: 0.6,
    maxCargoLoss: 5,
    triggerText: "前方出现海盗船，高高挂起黑色骷髅旗！",
    resultText: "",
    regionProbMultiplier: {
      南洋: 1.6,
      闽南: 1.2,
      东瀛: 0.6,
    },
  },
  {
    chance: 0.08,
    minGold: 50,
    maxGold: 300,
    cargoLossChance: 0,
    maxCargoLoss: 0,
    triggerText: "瞭望手发现海面上漂着一只雕花宝箱。",
    resultText: "",
  },
  {
    chance: 0.12,
    minGold: 30,
    maxGold: 150,
    cargoLossChance: 0,
    maxCargoLoss: 0,
    triggerText: "发现一艘遇难的商船，桅杆折断，船上空无一人。",
    resultText: "",
  },
  {
    chance: 0.07,
    minGold: -100,
    maxGold: -30,
    cargoLossChance: 0.2,
    maxCargoLoss: 2,
    triggerText: "多名船员出现坏血病症状，牙龈出血、浑身乏力。",
    resultText: "",
  },
] as const;
