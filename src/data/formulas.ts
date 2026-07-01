// ============================================================
// 公式常量 — 所有可调参数集中在此
// ============================================================

/// 航行天数 = distance / (shipSpeed * SPEED_BASE)
export const SPEED_BASE = 2.0;

/// 每次交易对该商品价格的冲击幅度（百分比）
export const TRADE_IMPACT = 0.05;

/// 每天价格向基础价回归的速度（百分比）
export const PRICE_REGRESSION_RATE = 0.03;

/// 价格随机波动幅度（±百分比）
export const PRICE_VOLATILITY = 0.1;
export const TRADE_IMPACT_DECAY = 0.5;

/// 买卖价差（百分比）— 买入价 = mid × (1 + spread/2)，卖出价 = mid × (1 - spread/2)
export const BID_ASK_SPREAD = 0.05;

/// 新增港口时玩家初始金币
export const STARTING_GOLD = 5000;

/// 初始天数
export const STARTING_DAY = 1;

// ============================================================
// 等级/经验常量
// ============================================================

/// 1→2 所需经验基数
export const BASE_EXP = 100;

/// 每级经验增长系数
export const LEVEL_EXP_GROWTH = 0.15;

/// 利润→经验转化率
export const LEVEL_EXP_RATIO = 0.3;

/// 每级速度加成（百分比）
export const LEVEL_SPEED_PER_LEVEL = 0.02;

/// 每个航行事件固定经验
export const EVENT_EXP = 5;

// ============================================================
// 耐久/维修/战斗常量
// ============================================================

/// 维修费用 = repairCostPerHp × REPAIR_COST_MULTIPLIER × 缺失HP
export const REPAIR_COST_MULTIPLIER = 1.0;

/// 风暴事件每次最低 HP 伤害
export const STORM_HP_DAMAGE_MIN = 5;

/// 风暴事件每次最高 HP 伤害
export const STORM_HP_DAMAGE_MAX = 20;

/// 战斗基础伤害（不依赖武装的固定伤害区间）
export const COMBAT_BASE_DAMAGE_MIN = 0;
export const COMBAT_BASE_DAMAGE_MAX = 15;

/// 战斗 cargo 丢失基础量
export const COMBAT_CARGO_LOSS_MIN = 0;
export const COMBAT_CARGO_LOSS_MAX = 8;

/// 全损判定阈值：战斗得分低于此值 = 沉船
export const TOTAL_LOSS_THRESHOLD = 15;

/// 战斗评分 = 100 + (defenseMultiplier - 1) × COMBAT_DEFENSE_BONUS_FACTOR - (1 - hpRatio) × COMBAT_HP_PENALTY_FACTOR
/// 然后 × random(±40%) / difficulty（difficulty = regionMod × portDanger，每日插值）
export const COMBAT_DEFENSE_BONUS_FACTOR = 20;
export const COMBAT_HP_PENALTY_FACTOR = 100;
/// 生存率 = clamp(100 - avgDanger × distance × SURVIVAL_DISTANCE_FACTOR × avgRegionModifier + defenseBonus - hpPenalty, 5, 99)
/// avgRegionModifier = (depRegion.dangerModifier + destRegion.dangerModifier) / 2
/// defenseBonus = (defenseMultiplier - 1) × SURVIVAL_DEFENSE_FACTOR
/// hpPenalty    = (1 - hpRatio) × SURVIVAL_HP_PENALTY_FACTOR
export const SURVIVAL_DISTANCE_FACTOR = 1.2;
export const SURVIVAL_DEFENSE_FACTOR = 10;
export const SURVIVAL_HP_PENALTY_FACTOR = 20;
// ============================================================
// 舰队管理常量
// ============================================================

/// 出售船只回收比例（回收价 = basePrice × SHIP_SELL_RATIO）
export const SHIP_SELL_RATIO = 0.5;

/// 舰队上限 = 1 + floor(level / MAX_SHIPS_LEVEL_DIVISOR)
export const MAX_SHIPS_LEVEL_DIVISOR = 3;
// ============================================================
// 船员系统常量
// ============================================================

/// 招募一名船员的基础费用
export const BASE_HIRE_COST = 20;

/// 每名船员每日维护费用
export const CREW_UPKEEP_PER_DAY = 2;

/// 每多少个舱位提供一个船员配额
export const CREW_PER_SLOT = 5;

/// 风暴损失船员的概率
export const STORM_CREW_LOSS_CHANCE = 0.3;

/// 风暴单次损失船员的范围
export const STORM_CREW_LOSS_MIN = 1;
export const STORM_CREW_LOSS_MAX = 2;

/// 战斗胜利时损失船员概率
export const COMBAT_VICTORY_CREW_LOSS_CHANCE = 0.2;

/// 战斗部分损失时损失船员的范围
export const COMBAT_PARTIAL_LOSS_CREW_LOSS_MIN = 1;
export const COMBAT_PARTIAL_LOSS_CREW_LOSS_MAX = 3;

// ============================================================
// RPG 属性与战斗常量
// ============================================================

/// 升级获得的可分配属性点数
export const ATTRIBUTE_POINTS_PER_LEVEL = 3;

/// 属性软上限区间及收益率
export const SOFT_CAP_BRACKETS = [
  { min: 0, max: 20, rate: 1.0 },
  { min: 20, max: 40, rate: 0.75 },
  { min: 40, max: 60, rate: 0.5 },
  { min: 60, max: 80, rate: 0.25 },
  { min: 80, max: 999, rate: 0.1 },
] as const;

/// 属性补正系数（装备 Attribute Scaling）
export const SCALING_COEFFICIENTS = {
  normal: 0.0,
  good: 0.25,
  excellent: 0.5,
  rare: 0.75,
  legendary: 1.0,
} as const;
