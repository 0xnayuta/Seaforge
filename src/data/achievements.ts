// ============================================================
// 成就配置 — 15 个成就，覆盖各维度
// ============================================================

export type AchievementConditionType =
  | "level"
  | "totalSalesRevenue"
  | "bestSingleProfit"
  | "totalMileage"
  | "combatWins"
  | "voyagesCompleted"
  | "portsVisited"
  | "itemsCollected"
  | "shipsOwned"
  | "tradedGoodsTotal";

export interface AchievementCondition {
  readonly type: AchievementConditionType;
  readonly threshold: number;
}

export interface AchievementReward {
  readonly gold?: number;
  readonly exp?: number;
}

export interface AchievementConfig {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly condition: AchievementCondition;
  readonly reward: AchievementReward;
}

export const ACHIEVEMENTS: readonly AchievementConfig[] = [
  // ---- 航行 ----
  {
    id: "first_voyage",
    name: "初次航行",
    description: "完成第 1 次航行",
    condition: { type: "voyagesCompleted", threshold: 1 },
    reward: { gold: 500 },
  },
  {
    id: "seasoned_sailor",
    name: "老练水手",
    description: "完成 50 次航行",
    condition: { type: "voyagesCompleted", threshold: 50 },
    reward: { gold: 5000, exp: 200 },
  },
  {
    id: "ocean_explorer",
    name: "海洋探险家",
    description: "航行里程达到 10,000 海里",
    condition: { type: "totalMileage", threshold: 10000 },
    reward: { gold: 3000, exp: 150 },
  },
  {
    id: "circumnavigator",
    name: "环球航行家",
    description: "航行里程达到 100,000 海里",
    condition: { type: "totalMileage", threshold: 100000 },
    reward: { gold: 20000, exp: 500 },
  },

  // ---- 贸易 ----
  {
    id: "merchant_apprentice",
    name: "商贾学徒",
    description: "累计贸易额达到 10,000 金币",
    condition: { type: "totalSalesRevenue", threshold: 10000 },
    reward: { gold: 1000 },
  },
  {
    id: "tycoon",
    name: "商业大亨",
    description: "累计贸易额达到 500,000 金币",
    condition: { type: "totalSalesRevenue", threshold: 500000 },
    reward: { gold: 15000, exp: 500 },
  },
  {
    id: "lucky_strike",
    name: "小赚一笔",
    description: "单次利润达到 5,000 金币",
    condition: { type: "bestSingleProfit", threshold: 5000 },
    reward: { gold: 2000 },
  },
  {
    id: "big_money",
    name: "日进斗金",
    description: "单次利润达到 100,000 金币",
    condition: { type: "bestSingleProfit", threshold: 100000 },
    reward: { gold: 10000, exp: 300 },
  },

  // ---- 战斗 ----
  {
    id: "fighter",
    name: "初入战场",
    description: "取得 10 次战斗胜利",
    condition: { type: "combatWins", threshold: 10 },
    reward: { gold: 1500, exp: 100 },
  },
  {
    id: "warmonger",
    name: "百战勇士",
    description: "取得 100 次战斗胜利",
    condition: { type: "combatWins", threshold: 100 },
    reward: { gold: 8000, exp: 400 },
  },

  // ---- 等级 ----
  {
    id: "high_level",
    name: "崭露头角",
    description: "等级达到 30",
    condition: { type: "level", threshold: 30 },
    reward: { gold: 5000, exp: 300 },
  },
  {
    id: "legend",
    name: "航海传说",
    description: "等级达到 60",
    condition: { type: "level", threshold: 60 },
    reward: { gold: 30000, exp: 1000 },
  },

  // ---- 收集 ----
  {
    id: "globetrotter",
    name: "周游列港",
    description: "访问过 6 个不同港口",
    condition: { type: "portsVisited", threshold: 6 },
    reward: { gold: 3000, exp: 200 },
  },
  {
    id: "collector",
    name: "收藏家",
    description: "收集过 20 种不同物品",
    condition: { type: "itemsCollected", threshold: 20 },
    reward: { gold: 5000, exp: 300 },
  },
  {
    id: "ship_enthusiast",
    name: "船舶爱好者",
    description: "拥有过 4 种不同类型的船只",
    condition: { type: "shipsOwned", threshold: 4 },
    reward: { gold: 8000, exp: 400 },
  },
];
