// ============================================================
// 公式常量 — 所有可调参数集中在此
// ============================================================

/// 航行天数 = distance / (shipSpeed * SPEED_BASE)
export const SPEED_BASE = 2.0

/// 每次交易对该商品价格的冲击幅度（百分比）
export const TRADE_IMPACT = 0.05

/// 每天价格向基础价回归的速度（百分比）
export const PRICE_REGRESSION_RATE = 0.03

/// 价格随机波动幅度（±百分比）
export const PRICE_VOLATILITY = 0.10

/// 新增港口时玩家初始金币
export const STARTING_GOLD = 5000

/// 初始天数
export const STARTING_DAY = 1
