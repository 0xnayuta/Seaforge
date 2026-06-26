// ============================================================
// View Builder — World → GameView 转换器
// 纯函数，无副作用，不调用数据库
// ============================================================

import { REPAIR_COST_MULTIPLIER } from "../../data/formulas";
import { CATEGORY_LABEL, GOODS } from "../../data/goods";
import { PORTS } from "../../data/ports";
import { SHIPS } from "../../data/ships";
import type {
  ArmamentOptionView,
  CargoItemView,
  CargoView,
  CombatLogEntryView,
  DestinationView,
  GoodView,
  HarborView,
  MarketView,
  NavigationView,
  ShipView,
  VoyageEventView,
  VoyageView,
} from "../../types/game-view";
import type { CombatOutcome } from "../domain/combat";
import { getPortGoods, getSellPrice } from "../domain/market";
import {
  getEffectiveCapacityForShip,
  getReachablePorts,
} from "../domain/navigation";
import type { ArmamentLevel } from "../domain/ship";
import { ARMAMENT_LABELS } from "../domain/ship";
import { getMaxCapacity, getUsedCapacity } from "../domain/trade";
import type { VoyageEvent, World } from "../domain/types";

// ============================================================
// 主入口
// ============================================================

export function buildHarborView(world: World): HarborView {
  const port = PORTS.find((p) => p.id === world.player.currentPortId);
  const ship = SHIPS.find((s) => s.id === world.ship.typeId);

  return {
    portName: port?.name ?? "未知",
    portDescription: port?.description ?? "",
    region: port?.region ?? "",
    playerGold: world.player.gold,
    cargoCount: getUsedCapacity(world),
    cargoCapacity: getMaxCapacity(world),
    currentDay: world.player.day,
    shipName: ship?.name ?? "未知",
    shipCurrentHp: world.ship.currentHp,
    shipMaxHp: world.ship.maxHp,
  };
}

export function buildMarketView(world: World): MarketView {
  const port = PORTS.find((p) => p.id === world.player.currentPortId);
  const portGoods = getPortGoods(world.player.currentPortId, world);

  const goods: GoodView[] = portGoods.map(({ good, buyPrice }) => {
    const cargo = world.ship.cargo.find((c) => c.goodId === good.id);
    const inCargo = cargo?.quantity ?? 0;

    return {
      id: good.id,
      name: good.name,
      category: CATEGORY_LABEL[good.category],
      buyPrice,
      sellPrice: getSellPrice(good.id, world.player.currentPortId, world),
      inCargo,
      canAfford: world.player.gold >= buyPrice,
    };
  });

  return {
    portName: port?.name ?? "未知",
    goods,
    playerGold: world.player.gold,
    cargoCount: getUsedCapacity(world),
    cargoCapacity: getMaxCapacity(world),
  };
}

export function buildNavigationView(world: World): NavigationView {
  const port = PORTS.find((p) => p.id === world.player.currentPortId);
  const reachable = getReachablePorts(world);

  const destinations: DestinationView[] = reachable.map((r) => {
    const estimatedProfit = world.ship.cargo.reduce((sum, c) => {
      const targetPrice = getSellPrice(c.goodId, r.port.id, world);
      return sum + (targetPrice - c.buyPrice) * c.quantity;
    }, 0);

    // 简单生存率估算（基于船只当前 HP 和默认满载配置）
    const hpRatio =
      world.ship.maxHp > 0 ? world.ship.currentHp / world.ship.maxHp : 0;
    const baseSurvival = Math.min(99, Math.floor(hpRatio * 100));

    return {
      portId: r.port.id,
      portName: r.port.name,
      region: r.port.region,
      distance: r.distance,
      travelDays: r.travelDays,
      estimatedProfit,
      survivalRate: baseSurvival,
    };
  });

  // 武装配置选项
  const shipConfig = SHIPS.find((s) => s.id === world.ship.typeId);
  const maxCap = getMaxCapacity(world);
  const armamentOptions: ArmamentOptionView[] = shipConfig
    ? shipConfig.armamentTiers.map(([cargoRatio, defenseMultiplier], i) => {
        const effectiveCapacity = getEffectiveCapacityForShip(
          world.ship.typeId,
          maxCap,
          i as ArmamentLevel,
        );
        // 生存率 = min(99, HP比 × 防御乘数 × 75)
        const hpRatio =
          world.ship.maxHp > 0 ? world.ship.currentHp / world.ship.maxHp : 0;
        const survivalRate = Math.min(
          99,
          Math.floor(hpRatio * defenseMultiplier * 75),
        );

        return {
          level: i,
          label: ARMAMENT_LABELS[i],
          cargoRatio,
          defenseMultiplier,
          survivalRate,
          effectiveCapacity,
        };
      })
    : [];

  return {
    currentPortName: port?.name ?? "未知",
    destinations,
    armamentOptions,
    currentCargoCount: getUsedCapacity(world),
  };
}

export function buildCargoView(world: World): CargoView {
  const ship = SHIPS.find((s) => s.id === world.ship.typeId);

  const items: CargoItemView[] = world.ship.cargo.map((c) => {
    const good = GOODS.find((g) => g.id === c.goodId);
    const sellPrice = getSellPrice(c.goodId, world.player.currentPortId, world);
    return {
      goodId: c.goodId,
      goodName: good?.name ?? "未知",
      quantity: c.quantity,
      buyPrice: c.buyPrice,
      sellPrice,
      estimatedProfit: (sellPrice - c.buyPrice) * c.quantity,
    };
  });

  return {
    shipName: ship?.name ?? "未知",
    usedCapacity: getUsedCapacity(world),
    maxCapacity: getMaxCapacity(world),
    items,
  };
}

export function buildShipView(world: World): ShipView {
  const shipConfig = SHIPS.find((s) => s.id === world.ship.typeId);
  if (!shipConfig) throw new Error("无效船只");

  const level = world.ship.upgradeLevel;
  const canUpgrade = level < shipConfig.maxUpgradeLevel;
  const upgradeCost = canUpgrade ? shipConfig.upgradeCosts[level] : null;

  const missingHp = world.ship.maxHp - world.ship.currentHp;
  const repairCost =
    missingHp > 0
      ? Math.ceil(
          missingHp * shipConfig.repairCostPerHp * REPAIR_COST_MULTIPLIER,
        )
      : 0;

  return {
    shipName: shipConfig.name,
    upgradeLevel: level,
    maxUpgradeLevel: shipConfig.maxUpgradeLevel,
    capacity: getMaxCapacity(world),
    speed: shipConfig.speed,
    playerGold: world.player.gold,
    upgradeCost,
    blockedByVoyage: !!world.voyage,
    canUpgrade:
      canUpgrade &&
      world.player.gold >= (upgradeCost ?? Infinity) &&
      !world.voyage,
    currentHp: world.ship.currentHp,
    maxHp: world.ship.maxHp,
    repairCost,
    canRepair:
      missingHp > 0 && world.player.gold >= repairCost && !world.voyage,
  };
}

// ============================================================
// 航行视图辅助函数
// ============================================================

/** 格式化金币变动文本 */
function formatGoldChange(goldChange: number): string | null {
  if (goldChange > 0) return `获得 ${goldChange} 金币`;
  if (goldChange < 0) return `损失 ${Math.abs(goldChange)} 金币`;
  return null;
}

/** 格式化战斗日志条目 */
function formatCombatLog(outcome: CombatOutcome): CombatLogEntryView {
  const resultLabel =
    outcome.result === "victory"
      ? "胜利"
      : outcome.result === "partialLoss"
        ? "受损"
        : "惨败";
  return {
    result: resultLabel,
    description: outcome.description,
    hpDamage: outcome.hpDamage,
    cargoLoss: outcome.cargoLoss,
    ...(outcome.allCargoLost ? { allCargoLost: true as const } : {}),
  };
}

/** 格式化单个航行事件视图 */
function buildEventView(event: VoyageEvent): VoyageEventView {
  const parts: string[] = [];
  const goldText = formatGoldChange(event.goldChange);
  if (goldText) parts.push(goldText);
  if (event.cargoLoss > 0) parts.push(`丢失 ${event.cargoLoss} 单位货物`);

  const combatLog = event.combatOutcome
    ? formatCombatLog(event.combatOutcome)
    : undefined;
  const effect =
    parts.length > 0 ? parts.join("，") : combatLog ? "" : "无影响";

  return {
    day: event.day,
    description: event.description,
    effect,
    combatLog,
  };
}
export function buildVoyageView(world: World): VoyageView {
  const voyage = world.voyage;
  if (!voyage) {
    return {
      fromPortName: "未知",
      toPortName: "未知",
      travelDays: 0,
      isUnderway: false,
      events: [],
      armamentLevel: 0,
      armamentLabel: "",
    };
  }

  const fromPort = PORTS.find((p) => p.id === voyage.fromPortId);
  const toPort = PORTS.find((p) => p.id === voyage.toPortId);

  return {
    fromPortName: fromPort?.name ?? "未知",
    toPortName: toPort?.name ?? "未知",
    travelDays: voyage.travelDays,
    isUnderway: true,
    events: voyage.events.map(buildEventView),
    armamentLevel: voyage.armamentLevel,
    armamentLabel: ARMAMENT_LABELS[voyage.armamentLevel],
  };
}
