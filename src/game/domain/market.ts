import type { World } from "./types"
import { GOODS, type GoodConfig } from "../../data/goods"
import { PORTS } from "../../data/ports"
import {
  PRICE_VOLATILITY,
} from "../../data/formulas"

// ============================================================
// 价格计算 — 纯函数
// 当前价格 = basePrice × portModifier × (1 + 随机波动)
// MVP 暂不实现供需偏移和均值回归
// ============================================================

export function getCurrentPrice(
  goodId: string,
  portId: string,
  _world: World,
): number {
  const good = GOODS.find((g) => g.id === goodId)
  const port = PORTS.find((p) => p.id === portId)
  if (!good || !port) return 0

  const modifier = port.priceModifiers[goodId] ?? 1.0
  const basePrice = good.basePrice
  const volatility = 1 + (Math.random() - 0.5) * 2 * PRICE_VOLATILITY

  return Math.round(basePrice * modifier * volatility)
}

// ---- 查询辅助 ----

export function getBuyPrice(
  goodId: string,
  portId: string,
  world: World,
): number {
  return getCurrentPrice(goodId, portId, world)
}

export function getSellPrice(
  goodId: string,
  portId: string,
  world: World,
): number {
  // MVP 买入价 = 卖出价（没有价差），Phase 2 引入港口收购系数
  return getCurrentPrice(goodId, portId, world)
}

/** 该港口售卖的所有商品（带当前价格） */
export function getPortGoods(
  portId: string,
  world: World,
): Array<{ good: GoodConfig; buyPrice: number }> {
  return GOODS.map((good) => ({
    good,
    buyPrice: getBuyPrice(good.id, portId, world),
  }))
}
