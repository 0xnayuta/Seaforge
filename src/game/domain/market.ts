import {
  BID_ASK_SPREAD,
  PRICE_REGRESSION_RATE,
  PRICE_VOLATILITY,
  TRADE_IMPACT,
  TRADE_IMPACT_DECAY,
} from "../../data/formulas";
import { GOODS, type GoodConfig } from "../../data/goods";
import { PORTS } from "../../data/ports";
import { REGIONS } from "../../data/regions";
import type { MarketPriceState, World } from "./types";
import { DomainError } from "./types";

// ============================================================
// 价格系统 — 纯函数
//
// 价格存储化：World.market.prices 持有每个 (港口, 商品) 的当前价格。
// 每次交易冲击 + 每日回归 + 随机波动均写入该结构。
//
// 不存储 = 每次重新随机 = 没有供需记忆。
// ============================================================

// ---- 初始化 ----
export function initMarketPrices(): MarketPriceState {
  const prices: Record<string, Record<string, number>> = {};
  for (const port of PORTS) {
    prices[port.id] = {};
    for (const good of GOODS) {
      prices[port.id][good.id] = Math.round(
        good.basePrice * getPriceModifier(port.id, good.id),
      );
    }
  }

  return { prices };
}

// ---- 读取 ----

/** 当前实际价格（从存储读取） */
export function getCurrentPrice(
  goodsId: string,
  portId: string,
  world: World,
): number {
  const portPrices = world.market.prices[portId];
  if (!portPrices) throw new DomainError("UNKNOWN_PORT");
  const price = portPrices[goodsId];
  if (price === undefined) throw new DomainError("NO_PRICE_DATA");
  return price;
}
export function getBuyPrice(
  goodsId: string,
  portId: string,
  world: World,
): number {
  const mid = getCurrentPrice(goodsId, portId, world);
  return Math.max(1, Math.round(mid * (1 + BID_ASK_SPREAD / 2)));
}

export function getSellPrice(
  goodsId: string,
  portId: string,
  world: World,
): number {
  const mid = getCurrentPrice(goodsId, portId, world);
  return Math.max(1, Math.round(mid * (1 - BID_ASK_SPREAD / 2)));
}

/** 该港口售卖的所有商品（带当前价格） */
export function getPortGoods(
  portId: string,
  world: World,
): Array<{ good: GoodConfig; buyPrice: number }> {
  return GOODS.map((good) => ({
    good,
    buyPrice: getBuyPrice(good.id, portId, world),
  }));
}

// ---- 价格计算 ----

/** 两级价格系数：区域品类系数 × 港口商品微调 */
function getPriceModifier(portId: string, goodsId: string): number {
  const port = PORTS.find((p) => p.id === portId);
  const good = GOODS.find((g) => g.id === goodsId);
  if (!port || !good) return 1.0;
  const region = REGIONS.find((r) => r.id === port.regionId);
  if (!region) return 1.0;
  const regionMod = region.basePriceModifiers[good.category];
  const localMod = port.localPriceModifiers?.[goodsId] ?? 1.0;
  return regionMod * localMod;
}

/** 某 (港口, 商品) 的目标均衡价 */
export function getBasePriceFor(goodsId: string, portId: string): number {
  const good = GOODS.find((g) => g.id === goodsId);
  if (!good) return 0;
  return Math.round(good.basePrice * getPriceModifier(portId, goodsId));
}

/** 设置单个价格，返回新 prices 结构 */
function setPrice(
  prices: Record<string, Record<string, number>>,
  portId: string,
  goodsId: string,
  newPrice: number,
): Record<string, Record<string, number>> {
  const portPrices = { ...prices[portId] };
  portPrices[goodsId] = Math.max(1, Math.round(newPrice));
  return { ...prices, [portId]: portPrices };
}

// ---- 买卖冲击 ----

export interface TradeImpactParams {
  readonly world: World;
  readonly portId: string;
  readonly goodsId: string;
  readonly quantity: number;
  readonly isBuy: boolean;
}

/**
 * 买入/卖出后对该港口该商品价格施加冲击。
 * 买入 → 价格上涨（需求增加）；卖出 → 价格下跌（供应增加）
 */
export function applyTradeImpact(params: TradeImpactParams): World {
  const { world, portId, goodsId, quantity, isBuy } = params;
  if (quantity <= 0) return world;
  const impact = TRADE_IMPACT * quantity ** TRADE_IMPACT_DECAY;
  const currentPrice = getCurrentPrice(goodsId, portId, world);
  const factor = isBuy ? 1 + impact : 1 - impact;
  const newPrice = Math.round(currentPrice * factor);

  return {
    ...world,
    market: {
      prices: setPrice(world.market.prices, portId, goodsId, newPrice),
    },
  };
}

// ---- 每日推进 ----

/**
 * 所有港口所有商品向均衡价回归 + 随机波动。
 * 每调用一次 = 经过一天。
 */
export function applyDayPass(world: World): World {
  let prices = world.market.prices;

  for (const port of PORTS) {
    for (const good of GOODS) {
      const currentPrice = prices[port.id]?.[good.id];
      if (currentPrice == null) continue;

      const base = getBasePriceFor(good.id, port.id);
      // 向均衡价回归
      const regressed =
        currentPrice + (base - currentPrice) * PRICE_REGRESSION_RATE;
      // 随机波动
      const noise = regressed * (Math.random() - 0.5) * 2 * PRICE_VOLATILITY;
      const newPrice = Math.max(1, Math.round(regressed + noise));

      prices = setPrice(prices, port.id, good.id, newPrice);
    }
  }

  return {
    ...world,
    market: { prices },
  };
}
