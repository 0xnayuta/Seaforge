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
  AvailableShipView,
  CargoItemView,
  CargoView,
  CombatLogEntryView,
  ComponentView,
  DestinationView,
  FleetShipSummaryView,
  FleetView,
  GoodView,
  HarborView,
  MarketView,
  NavigationView,
  ShipView,
  ShipyardView,
  VoyageEventView,
  VoyageView,
} from "../../types/game-view";
import type { CombatOutcome } from "../domain/combat";
import { getPortGoods, getSellPrice } from "../domain/market";
import {
  getEffectiveCapacityForShip,
  getReachablePorts,
} from "../domain/navigation";
import type { ComponentType } from "../domain/ship";
import {
  ARMAMENT_LABELS,
  COMPONENT_LABELS,
  getActiveShip,
} from "../domain/ship";
import { getMaxCapacity, getUsedCapacity } from "../domain/trade";
import type { ShipInstance, VoyageEvent, World } from "../domain/types";

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

  return {
    currentPortName: port?.name ?? "未知",
    destinations,
    currentCargoCount: getUsedCapacity(world),
    fleetShips: world.fleet.ships.map((ship) =>
      buildFleetShipSummaryView(world, ship),
    ),
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

export function buildShipView(world: World, targetShipId?: string): ShipView {
  const activeShip = targetShipId
    ? (world.fleet.ships.find((s) => s.id === targetShipId) ??
      getActiveShip(world))
    : getActiveShip(world);
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
// 舰队视图辅助函数
// ============================================================

function buildFleetShipSummaryView(
  world: World,
  ship: ShipInstance,
): FleetShipSummaryView {
  const shipConfig = SHIPS.find((s) => s.id === ship.typeId);
  const typeName = shipConfig?.name ?? "未知";
  const cargoCapacity = shipConfig
    ? Math.floor(shipConfig.capacity * (1 + ship.equipment.hullLevel * 0.1))
    : 0;

  const cargoUsed = ship.cargo.reduce((sum, c) => {
    const good = GOODS.find((g) => g.id === c.goodId);
    return sum + (good?.volume ?? 0) * c.quantity;
  }, 0);

  const speed = shipConfig
    ? shipConfig.speed * (1 + ship.equipment.sailLevel * 0.05)
    : 0;

  const defenseMultiplier = shipConfig
    ? shipConfig.armamentTiers[ship.armamentLevel][1]
    : 1.0;

  const cargo: CargoItemView[] = ship.cargo.map((c) => {
    const good = GOODS.find((g) => g.id === c.goodId);
    const goodName = good?.name ?? "未知";
    const category = good ? CATEGORY_LABEL[good.category] : "未知";
    const volume = good?.volume ?? 1;
    const sellPrice = getSellPrice(c.goodId, world.player.currentPortId, world);
    const estimatedProfit = (sellPrice - c.buyPrice) * c.quantity;

    return {
      goodId: c.goodId,
      goodName,
      quantity: c.quantity,
      category,
      buyPrice: c.buyPrice,
      sellPrice,
      volume,
      estimatedProfit,
    };
  });

  return {
    id: ship.id,
    name: ship.name,
    typeName,
    durability: ship.durability,
    maxDurability: ship.maxDurability,
    cargoUsed,
    cargoCapacity,
    speed,
    isActive: ship.id === world.fleet.activeShipId,
    armamentLevel: ship.armamentLevel,
    armamentLabel: ARMAMENT_LABELS[ship.armamentLevel],
    defenseMultiplier,
    cargo,
  };
}

export function buildFleetView(world: World): FleetView {
  const ships: FleetShipSummaryView[] = world.fleet.ships.map((ship) =>
    buildFleetShipSummaryView(world, ship),
  );

  return {
    ships,
    maxShips: world.fleet.maxShips,
    fleetGold: world.fleet.gold,
    blockedByVoyage: !!world.voyage,
  };
}

export function buildShipyardView(
  world: World,
  selectedShipId?: string,
): ShipyardView {
  const ships: FleetShipSummaryView[] = world.fleet.ships.map((ship) =>
    buildFleetShipSummaryView(world, ship),
  );

  const targetShipId = selectedShipId ?? world.fleet.activeShipId;
  const selectedShip =
    world.fleet.ships.find((s) => s.id === targetShipId) ??
    getActiveShip(world);

  const selectedShipDetail = buildShipView(world, selectedShip.id);

  const availableShips: AvailableShipView[] = SHIPS.filter(
    (s) =>
      s.sellPortIds.length > 0 &&
      s.sellPortIds.includes(world.player.currentPortId),
  ).map((s) => ({
    typeId: s.id,
    name: s.name,
    capacity: s.capacity,
    speed: s.speed,
    price: s.basePrice,
    canAfford: world.fleet.gold >= s.basePrice,
    fleetFull: world.fleet.ships.length >= world.fleet.maxShips,
  }));

  return {
    ships,
    selectedShipId: selectedShip.id,
    selectedShipDetail,
    availableShips,
    maxShips: world.fleet.maxShips,
    fleetGold: world.fleet.gold,
    blockedByVoyage: !!world.voyage,
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
      fleetShipCount: 0,
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
    fleetShipCount: voyage.fleetShipIds ? voyage.fleetShipIds.length : 1,
  };
}
