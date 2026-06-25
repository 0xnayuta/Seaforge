/**
 * 测试辅助：构建已知 World 供测试使用
 */
import type { World } from "../types"
import { PORTS } from "../../../data/ports"
import { GOODS } from "../../../data/goods"

function buildTestPrices(): Record<string, Record<string, number>> {
  const prices: Record<string, Record<string, number>> = {}
  for (const port of PORTS) {
    prices[port.id] = {}
    for (const good of GOODS) {
      const modifier = port.priceModifiers[good.id] ?? 1.0
      prices[port.id][good.id] = Math.round(good.basePrice * modifier)
    }
  }
  return prices
}

/** 带基础货物的默认 World（泉州出发，单桅帆船，有丝绸和香料） */
export function createTestWorld(overrides?: Partial<World>): World {
  return {
    player: {
      name: "测试船长",
      gold: 5000,
      currentPortId: "quanzhou",
      day: 1,
    },
    ship: {
      typeId: "sloop",
      upgradeLevel: 0,
      cargo: [
        { goodId: "silk", quantity: 5, buyPrice: 102 },
        { goodId: "spice", quantity: 3, buyPrice: 260 },
      ],
    },
    market: { prices: buildTestPrices() },
    voyage: null,
    ...overrides,
  }
}

/** 马六甲出发的空船 */
export function createEmptyWorld(overrides?: Partial<World>): World {
  return {
    player: {
      name: "测试船长",
      gold: 10000,
      currentPortId: "malacca",
      day: 1,
    },
    ship: {
      typeId: "sloop",
      upgradeLevel: 0,
      cargo: [],
    },
    market: { prices: buildTestPrices() },
    voyage: null,
    ...overrides,
  }
}
