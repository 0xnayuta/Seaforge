import type { World, MarketPriceState } from "./types"
import { GOODS, type GoodConfig } from "../../data/goods"
import { PORTS } from "../../data/ports"
import {
  PRICE_VOLATILITY,
  PRICE_REGRESSION_RATE,
  TRADE_IMPACT,
} from "../../data/formulas"

// ============================================================
// 价格系统 — 纯函数
//
// 价格存储化：World.market.prices 持有每个 (港口, 商品) 的当前价格。
// 每次交易冲击 + 每日回归 + 随机波动均写入该结构。
//
// 不存储 = 每次重新随机 = 没有供需记忆。
// ============================================================

// ---- 初始化 ----

/** 初始化所有港口所有商品的当前价格（basePrice × portModifier，无随机） */
export function initMarketPrices(): MarketPriceState {
  const prices: Record<string, Record<string, number>> = {}

  for (const port of PORTS) {
    prices[port.id] = {}
    for (const good of GOODS) {
      const modifier = port.priceModifiers[good.id] ?? 1.0
      prices[port.id][good.id] = Math.round(good.basePrice * modifier)
    }
  }

  return { prices }
}

// ---- 读取 ----

/** 当前实际价格（从存储读取） */
export function getCurrentPrice(
  goodId: string,
  portId: string,
  world: World,
): number {
  const portPrices = world.market.prices[portId]
  if (!portPrices) throw new Error(`未知港口：${portId}`)
  const price = portPrices[goodId]
  if (price === undefined) throw new Error(`港口 ${portId} 无商品 ${goodId} 的价格数据`)
  return price
}

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

// ---- 价格计算 ----

/** 某 (港口, 商品) 的目标均衡价 */
function getBasePriceFor(goodId: string, portId: string): number {
  const good = GOODS.find((g) => g.id === goodId)
  const port = PORTS.find((p) => p.id === portId)
  if (!good || !port) return 0
  const modifier = port.priceModifiers[goodId] ?? 1.0
  return good.basePrice * modifier
}

/** 设置单个价格，返回新 prices 结构 */
function setPrice(
  prices: Record<string, Record<string, number>>,
  portId: string,
  goodId: string,
  newPrice: number,
): Record<string, Record<string, number>> {
  const portPrices = { ...prices[portId] }
  portPrices[goodId] = Math.max(1, Math.round(newPrice))
  return { ...prices, [portId]: portPrices }
}

// ---- 买卖冲击 ----

/**
 * 买入/卖出后对该港口该商品价格施加冲击。
 * 买入 → 价格上涨（需求增加）；卖出 → 价格下跌（供应增加）
 */
export function applyTradeImpact(
  world: World,
  portId: string,
  goodId: string,
  quantity: number,
  isBuy: boolean,
): World {
  if (quantity <= 0) return world

  const currentPrice = getCurrentPrice(goodId, portId, world)
  const impact = TRADE_IMPACT * quantity
  const factor = isBuy ? 1 + impact : 1 - impact
  const newPrice = Math.round(currentPrice * factor)

  return {
    ...world,
    market: {
      prices: setPrice(world.market.prices, portId, goodId, newPrice),
    },
  }
}

// ---- 每日推进 ----

/**
 * 所有港口所有商品向均衡价回归 + 随机波动。
 * 每调用一次 = 经过一天。
 */
export function applyDayPass(world: World): World {
  let prices = world.market.prices

  for (const port of PORTS) {
    for (const good of GOODS) {
      const currentPrice = prices[port.id]?.[good.id]
      if (currentPrice == null) continue

      const base = getBasePriceFor(good.id, port.id)
      // 向均衡价回归
      const regressed = currentPrice + (base - currentPrice) * PRICE_REGRESSION_RATE
      // 随机波动
      const noise = regressed * (Math.random() - 0.5) * 2 * PRICE_VOLATILITY
      const newPrice = Math.max(1, Math.round(regressed + noise))

      prices = setPrice(prices, port.id, good.id, newPrice)
    }
  }

  return {
    ...world,
    market: { prices },
  }
}
