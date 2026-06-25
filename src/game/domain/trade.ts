import type { CargoItem, World } from "./types"
import { GOODS } from "../../data/goods"
import { SHIPS } from "../../data/ships"
import { getBuyPrice, getSellPrice } from "./market"

// ============================================================
// 买卖逻辑 — 纯函数
// ============================================================

// ---- 容量计算 ----

export function getUsedCapacity(world: World): number {
  return world.ship.cargo.reduce(
    (total, item) => {
      const good = GOODS.find((g) => g.id === item.goodId)
      return total + (good?.volume ?? 1) * item.quantity
    },
    0,
  )
}

export function getMaxCapacity(world: World): number {
  const ship = SHIPS.find((s) => s.id === world.ship.typeId)
  if (!ship) return 0
  // 每升一级 +20% 容量
  return Math.floor(ship.capacity * (1 + world.ship.upgradeLevel * 0.2))
}

// ---- 买入 ----

export interface BuyInput {
  readonly goodId: string
  readonly quantity: number
}

export interface BuyResult {
  readonly world: World
  readonly totalCost: number
}

export function executeBuy(world: World, input: BuyInput): BuyResult {
  const { goodId, quantity } = input
  if (quantity <= 0) throw new Error("购买数量必须大于 0")

  const price = getBuyPrice(goodId, world.player.currentPortId, world)
  const totalCost = price * quantity

  if (world.player.gold < totalCost) throw new Error("金币不足")

  const good = GOODS.find((g) => g.id === goodId)
  if (!good) throw new Error("商品不存在")

  const usedCapacity = getUsedCapacity(world)
  const maxCapacity = getMaxCapacity(world)
  const neededVolume = good.volume * quantity
  if (usedCapacity + neededVolume > maxCapacity) throw new Error("舱容不足")

  const existingIndex = world.ship.cargo.findIndex(
    (c) => c.goodId === goodId,
  )

  let newCargo: CargoItem[]
  if (existingIndex >= 0) {
    newCargo = world.ship.cargo.map((c, i) =>
      i === existingIndex
        ? {
            ...c,
            quantity: c.quantity + quantity,
            // 加权平均买入价
            buyPrice: Math.round(
              (c.buyPrice * c.quantity + price * quantity) /
                (c.quantity + quantity),
            ),
          }
        : c,
    )
  } else {
    newCargo = [
      ...world.ship.cargo,
      {
        goodId,
        quantity,
        buyPrice: price,
      },
    ]
  }

  return {
    world: {
      ...world,
      player: {
        ...world.player,
        gold: world.player.gold - totalCost,
      },
      ship: {
        ...world.ship,
        cargo: newCargo,
      },
    },
    totalCost,
  }
}

// ---- 卖出 ----

export interface SellInput {
  readonly goodId: string
  readonly quantity: number
}

export interface SellResult {
  readonly world: World
  readonly totalRevenue: number
  readonly profit: number
}

export function executeSell(world: World, input: SellInput): SellResult {
  const { goodId, quantity } = input
  if (quantity <= 0) throw new Error("卖出数量必须大于 0")

  const cargo = world.ship.cargo.find((c) => c.goodId === goodId)
  if (!cargo || cargo.quantity < quantity) throw new Error("货物不足")

  const price = getSellPrice(goodId, world.player.currentPortId, world)
  const totalRevenue = price * quantity

  // 先进先出：用已有的 buyPrice 计算利润
  const profit = (price - cargo.buyPrice) * quantity

  const remaining = cargo.quantity - quantity
  const newCargo =
    remaining > 0
      ? world.ship.cargo.map((c) =>
          c.goodId === goodId ? { ...c, quantity: remaining } : c,
        )
      : world.ship.cargo.filter((c) => c.goodId !== goodId)

  return {
    world: {
      ...world,
      player: {
        ...world.player,
        gold: world.player.gold + totalRevenue,
      },
      ship: {
        ...world.ship,
        cargo: newCargo,
      },
    },
    totalRevenue,
    profit,
  }
}
