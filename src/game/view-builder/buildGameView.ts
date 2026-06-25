// ============================================================
// View Builder — World → GameView 转换器
// 纯函数，无副作用，不调用数据库
// ============================================================

import type { World } from "../domain/types"
import type {
  HarborView,
  MarketView,
  GoodView,
  NavigationView,
  DestinationView,
  CargoView,
  CargoItemView,
  ShipView,
} from "../../types/game-view"

import { PORTS } from "../../data/ports"
import { GOODS } from "../../data/goods"
import { SHIPS } from "../../data/ships"
import {
  getBuyPrice,
  getSellPrice,
  getPortGoods,
} from "../domain/market"
import {
  getUsedCapacity,
  getMaxCapacity,
} from "../domain/trade"
import { getReachablePorts } from "../domain/navigation"

// ============================================================
// 主入口
// ============================================================

export function buildHarborView(world: World): HarborView {
  const port = PORTS.find((p) => p.id === world.player.currentPortId)
  const ship = SHIPS.find((s) => s.id === world.ship.typeId)

  return {
    portName: port?.name ?? "未知",
    portDescription: port?.description ?? "",
    region: port?.region ?? "",
    playerGold: world.player.gold,
    cargoCount: getUsedCapacity(world),
    cargoCapacity: getMaxCapacity(world),
    currentDay: world.player.day,
    shipName: ship?.name ?? "未知",
  }
}

export function buildMarketView(world: World): MarketView {
  const port = PORTS.find((p) => p.id === world.player.currentPortId)
  const portGoods = getPortGoods(world.player.currentPortId, world)

  const goods: GoodView[] = portGoods.map(({ good, buyPrice }) => {
    const cargo = world.ship.cargo.find((c) => c.goodId === good.id)
    const inCargo = cargo?.quantity ?? 0

    return {
      id: good.id,
      name: good.name,
      category: good.category,
      buyPrice,
      sellPrice: getSellPrice(good.id, world.player.currentPortId, world),
      inCargo,
      canAfford: world.player.gold >= buyPrice,
    }
  })

  return {
    portName: port?.name ?? "未知",
    goods,
    playerGold: world.player.gold,
    cargoCount: getUsedCapacity(world),
    cargoCapacity: getMaxCapacity(world),
  }
}

export function buildNavigationView(world: World): NavigationView {
  const port = PORTS.find((p) => p.id === world.player.currentPortId)
  const reachable = getReachablePorts(world)

  const destinations: DestinationView[] = reachable.map((r) => {
    // 预估利润 = 当前 cargo 到目标港预估
    const estimatedProfit = world.ship.cargo.reduce((sum, c) => {
      const targetPrice = calcSellPrice(c.goodId, r.port.id, world)
      return sum + (targetPrice - c.buyPrice) * c.quantity
    }, 0)

    return {
      portId: r.port.id,
      portName: r.port.name,
      region: r.port.region,
      distance: r.distance,
      travelDays: r.travelDays,
      estimatedProfit: Math.max(0, estimatedProfit),
    }
  })

  return {
    currentPortName: port?.name ?? "未知",
    destinations,
  }
}

/** 预估目标港的卖价（用于 View Builder，不存档） */
function calcSellPrice(
  goodId: string,
  targetPortId: string,
  world: World,
): number {
  return getSellPrice(goodId, targetPortId, world)
}

export function buildCargoView(world: World): CargoView {
  const ship = SHIPS.find((s) => s.id === world.ship.typeId)

  const items: CargoItemView[] = world.ship.cargo.map((c) => {
    const good = GOODS.find((g) => g.id === c.goodId)
    const sellPrice = getSellPrice(
      c.goodId,
      world.player.currentPortId,
      world,
    )
    return {
      goodId: c.goodId,
      goodName: good?.name ?? "未知",
      quantity: c.quantity,
      buyPrice: c.buyPrice,
      sellPrice,
      estimatedProfit: (sellPrice - c.buyPrice) * c.quantity,
    }
  })

  return {
    shipName: ship?.name ?? "未知",
    usedCapacity: getUsedCapacity(world),
    maxCapacity: getMaxCapacity(world),
    items,
  }
}

export function buildShipView(world: World): ShipView {
  const shipConfig = SHIPS.find((s) => s.id === world.ship.typeId)
  if (!shipConfig) throw new Error("无效船只")

  const level = world.ship.upgradeLevel
  const canUpgrade = level < shipConfig.maxUpgradeLevel
  const upgradeCost = canUpgrade ? shipConfig.upgradeCosts[level] : null

  return {
    shipName: shipConfig.name,
    upgradeLevel: level,
    maxUpgradeLevel: shipConfig.maxUpgradeLevel,
    capacity: getMaxCapacity(world),
    speed: shipConfig.speed,
    playerGold: world.player.gold,
    upgradeCost,
    canUpgrade: canUpgrade && world.player.gold >= (upgradeCost ?? Infinity),
  }
}
