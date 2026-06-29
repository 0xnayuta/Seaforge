// ============================================================
// View Builder — World → GameView 转换器
// 纯函数，无副作用，不调用数据库
// ============================================================

import {
  REPAIR_COST_MULTIPLIER,
  SURVIVAL_DISTANCE_FACTOR,
} from "../../data/formulas";
import { CATEGORY_LABEL, GOODS } from "../../data/goods";
import { PORTS } from "../../data/ports";
import { REGIONS } from "../../data/regions";
import { SHIPS } from "../../data/ships";

function getRegionName(regionId: string | undefined): string {
  return REGIONS.find((r) => r.id === regionId)?.name ?? "";
}

import type {
  ArmamentOptionView,
  CargoItemView,
  CargoView,
  CombatLogEntryView,
  ComponentView,
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
import type { ArmamentLevel, ComponentType } from "../domain/ship";
import {
  ARMAMENT_LABELS,
  COMPONENT_LABELS,
  getActiveShip,
} from "../domain/ship";
import { getMaxCapacity, getUsedCapacity } from "../domain/trade";
import type { VoyageEvent, World } from "../domain/types";

// ============================================================
// 主入口
// ============================================================

export function buildHarborView(world: World): HarborView {
  const port = PORTS.find((p) => p.id === world.player.currentPortId);
  const activeShip = getActiveShip(world);
  const ship = SHIPS.find((s) => s.id === activeShip.typeId);
  return {
    portName: port?.name ?? "未知",
    portDescription: port?.description ?? "",
    region: getRegionName(port?.regionId),
    playerGold: world.fleet.gold,
    cargoCount: getUsedCapacity(world),
    cargoCapacity: getMaxCapacity(world),
    currentDay: world.player.day,
    shipName: ship?.name ?? "未知",
    shipCurrentHp: activeShip.durability,
    shipMaxHp: activeShip.maxDurability,
    playerLevel: world.player.level,
    playerExp: world.player.exp,
    playerExpToNext: world.player.expToNext,
  };
}

export function buildMarketView(world: World): MarketView {
  const port = PORTS.find((p) => p.id === world.player.currentPortId);
  const portGoods = getPortGoods(world.player.currentPortId, world);
  const activeShip = getActiveShip(world);

  const goods: GoodView[] = portGoods.map(({ good, buyPrice }) => {
    const cargo = activeShip.cargo.find((c) => c.goodId === good.id);
    const inCargo = cargo?.quantity ?? 0;
    const sellPrice = getSellPrice(good.id, world.player.currentPortId, world);
    const estimatedProfit =
      cargo != null ? (sellPrice - cargo.buyPrice) * cargo.quantity : undefined;

    const basePrice = good.basePrice;
    const priceChangePercent =
      basePrice > 0
        ? Math.round(((buyPrice - basePrice) / basePrice) * 100)
        : 0;

    return {
      id: good.id,
      name: good.name,
      category: CATEGORY_LABEL[good.category],
      buyPrice,
      sellPrice,
      inCargo,
      cargoBuyPrice: cargo?.buyPrice,
      estimatedProfit,
      canAfford: world.fleet.gold >= buyPrice,
      volume: good.volume,
      priceChangePercent,
    };
  });

  return {
    portName: port?.name ?? "未知",
    goods,
    playerGold: world.fleet.gold,
    cargoCount: getUsedCapacity(world),
    cargoCapacity: getEffectiveCapacityForShip(
      activeShip.typeId,
      getMaxCapacity(world),
      activeShip.armamentLevel,
    ),
  };
}

export function buildNavigationView(world: World): NavigationView {
  const port = PORTS.find((p) => p.id === world.player.currentPortId);
  const reachable = getReachablePorts(world);
  const activeShip = getActiveShip(world);
  const hpRatio =
    activeShip.maxDurability > 0
      ? activeShip.durability / activeShip.maxDurability
      : 0;

  const depRegion = REGIONS.find((reg) => reg.id === port?.regionId);
  const depRegionMod = depRegion?.dangerModifier ?? 1.0;
  const destinations: DestinationView[] = reachable.map((r) => {
    const estimatedProfit = activeShip.cargo.reduce((sum, c) => {
      const targetPrice = getSellPrice(c.goodId, r.port.id, world);
      return sum + (targetPrice - c.buyPrice) * c.quantity;
    }, 0);

    const depDanger = port?.danger ?? 0.5;
    const arrDanger = r.port.danger;
    const avgDanger = (depDanger + arrDanger) / 2;
    const destRegion = REGIONS.find((reg) => reg.id === r.port.regionId);
    const avgModifier =
      (depRegionMod + (destRegion?.dangerModifier ?? 1.0)) / 2;
    const baseDangerScore =
      avgDanger * r.distance * SURVIVAL_DISTANCE_FACTOR * avgModifier;

    return {
      portId: r.port.id,
      portName: r.port.name,
      region: getRegionName(r.port.regionId),
      distance: r.distance,
      travelDays: r.travelDays,
      estimatedProfit,
      baseDangerScore,
    };
  });

  const shipConfig = SHIPS.find((s) => s.id === activeShip.typeId);
  const maxCap = getMaxCapacity(world);
  const armamentOptions: ArmamentOptionView[] = shipConfig
    ? shipConfig.armamentTiers.map(([cargoRatio, defenseMultiplier], i) => {
        const effectiveCapacity = getEffectiveCapacityForShip(
          activeShip.typeId,
          maxCap,
          i as ArmamentLevel,
        );

        return {
          level: i,
          label: ARMAMENT_LABELS[i],
          cargoRatio,
          defenseMultiplier,
          effectiveCapacity,
        };
      })
    : [];

  return {
    currentPortName: port?.name ?? "未知",
    destinations,
    armamentOptions,
    currentCargoCount: getUsedCapacity(world),
    currentArmament: activeShip.armamentLevel,
    hpRatio,
  };
}

export function buildCargoView(world: World): CargoView {
  const activeShip = getActiveShip(world);
  const ship = SHIPS.find((s) => s.id === activeShip.typeId);

  const items: CargoItemView[] = activeShip.cargo.map((c) => {
    const good = GOODS.find((g) => g.id === c.goodId);
    const sellPrice = getSellPrice(c.goodId, world.player.currentPortId, world);
    return {
      goodId: c.goodId,
      goodName: good?.name ?? "未知",
      category: good ? CATEGORY_LABEL[good.category] : "",
      quantity: c.quantity,
      buyPrice: c.buyPrice,
      sellPrice,
      volume: good?.volume ?? 0,
      estimatedProfit: (sellPrice - c.buyPrice) * c.quantity,
    };
  });

  return {
    shipName: ship?.name ?? "未知",
    usedCapacity: getUsedCapacity(world),
    maxCapacity: getMaxCapacity(world),
    effectiveCapacity: getEffectiveCapacityForShip(
      activeShip.typeId,
      getMaxCapacity(world),
      activeShip.armamentLevel,
    ),
    items,
  };
}

function buildComponentDescription(
  component: ComponentType,
  level: number,
): string {
  switch (component) {
    case "hull":
      return `舱容 ${10 + level * 20}%`;
    case "sail":
      return `速度 ${5 + level * 5}%`;
    case "armor":
      return `耐久上限 ${20 + level * 20}%`;
    case "cannon":
      return `攻击 ${10 + level * 10}%`;
  }
}

export function buildShipView(world: World): ShipView {
  const activeShip = getActiveShip(world);
  const shipConfig = SHIPS.find((s) => s.id === activeShip.typeId);
  if (!shipConfig) throw new Error("无效船只");

  const missing = activeShip.maxDurability - activeShip.durability;
  const repairCost =
    missing > 0
      ? Math.ceil(
          missing * shipConfig.repairCostPerDurability * REPAIR_COST_MULTIPLIER,
        )
      : 0;

  const components: ComponentView[] = (
    ["hull", "sail", "armor", "cannon"] as ComponentType[]
  ).map((component) => {
    const equipKey =
      component === "hull"
        ? "hullLevel"
        : component === "sail"
          ? "sailLevel"
          : component === "armor"
            ? "armorLevel"
            : "cannonLevel";
    const level = activeShip.equipment[equipKey];
    const maxLevel = shipConfig.maxComponentLevel;
    const canUpgrade = level < maxLevel;
    const cost = canUpgrade ? shipConfig.upgradeCosts[component][level] : null;

    return {
      id: component,
      label: COMPONENT_LABELS[component],
      level,
      maxLevel,
      nextCost: cost,
      canUpgrade:
        canUpgrade && world.fleet.gold >= (cost ?? Infinity) && !world.voyage,
      upgradeDescription: buildComponentDescription(component, level + 1),
    };
  });

  return {
    shipName: shipConfig.name,
    fleetGold: world.fleet.gold,
    durability: activeShip.durability,
    maxDurability: activeShip.maxDurability,
    repairCost,
    canRepair: missing > 0 && world.fleet.gold >= repairCost && !world.voyage,
    blockedByVoyage: !!world.voyage,
    components,
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
