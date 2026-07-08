import { DUNGEONS } from "../../data/dungeons";
import {
  EQUIPMENT_TYPE_LABELS,
  EQUIPMENTS,
  getEquipmentEffectDescription,
} from "../../data/equipment";
import { BASE_HIRE_COST, SURVIVAL_DISTANCE_FACTOR } from "../../data/formulas";
import { CATEGORY_LABEL, GOODS } from "../../data/goods";
import { NPCS } from "../../data/npcs";
import { PORTS } from "../../data/ports";
import { REGIONS } from "../../data/regions";
import { SHIPS } from "../../data/ships";
import { TITLES } from "../../data/titles";
import type {
  AvailableShipView,
  CargoItemView,
  CargoView,
  DestinationView,
  FleetShipSummaryView,
  GoodView,
  HarborView,
  MarketView,
  NavigationView,
  NpcSummaryView,
  ShipyardView,
  TavernView,
} from "../../types/game-view";
import { getPortGoods, getSellPrice } from "../domain/market";
import {
  getEffectiveCapacityForShip,
  getReachablePorts,
} from "../domain/navigation";
import { getAvailableQuests } from "../domain/quest";
import { getActiveShip } from "../domain/ship";
import { getUnlockedTitles } from "../domain/title";
import { getMaxCapacity, getUsedCapacity } from "../domain/trade";
import type { World } from "../domain/types";
import { npcTypeLabel } from "./npcViews";
import { buildFleetShipSummaryView, buildShipView } from "./shipViews";

function getRegionName(regionId: string | undefined): string {
  return REGIONS.find((r) => r.id === regionId)?.name ?? "";
}

export function buildHarborView(world: World): HarborView {
  const port = PORTS.find((p) => p.id === world.player.currentPortId);
  const activeShip = getActiveShip(world);
  const ship = SHIPS.find((s) => s.id === activeShip.typeId);

  // 构建当前港口的 NPC 摘要
  const npcsAtPort = NPCS.filter(
    (n) => n.portId === world.player.currentPortId,
  ).map((npc) => {
    const rel = world.npcRelations[npc.id];
    return {
      id: npc.id,
      name: npc.name,
      type: npc.type,
      typeLabel: npcTypeLabel(npc.type),
      portName: port?.name ?? "",
      affinity: rel?.affinity ?? 0,
      recruited: rel?.recruited ?? false,
      recruitable: npc.recruitable,
    } satisfies NpcSummaryView;
  });

  const availableQuests = getAvailableQuests(world);
  const unlockedTitles = getUnlockedTitles(world);

  // 检查当前港口是否有副本
  const availableDungeon = DUNGEONS.find(
    (d) => d.entryPortId === world.player.currentPortId,
  );

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
    crew: world.fleet.crew,
    maxCrew: world.fleet.maxCrew,
    npcsAtPort,
    questsAvailable: availableQuests.length,
    selectedTitleName: world.selectedTitle
      ? (TITLES.find((t) => t.id === world.selectedTitle)?.name ?? null)
      : null,
    unlockedTitleCount: unlockedTitles.length,
    availableDungeonName: availableDungeon?.name ?? null,
  };
}

export function buildMarketView(world: World): MarketView {
  const port = PORTS.find((p) => p.id === world.player.currentPortId);
  const portGoods = getPortGoods(world.player.currentPortId, world);
  const activeShip = getActiveShip(world);

  const goods: GoodView[] = portGoods.map(({ good, buyPrice }) => {
    const cargo = activeShip.cargo.find((c) => c.goodsId === good.id);
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
      const targetPrice = getSellPrice(c.goodsId, r.port.id, world);
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
    crew: world.fleet.crew,
    maxCrew: world.fleet.maxCrew,
  };
}

export function buildCargoView(world: World): CargoView {
  const activeShip = getActiveShip(world);
  const ship = SHIPS.find((s) => s.id === activeShip.typeId);

  const items: CargoItemView[] = activeShip.cargo.map((c) => {
    const good = GOODS.find((g) => g.id === c.goodsId);
    const sellPrice = getSellPrice(
      c.goodsId,
      world.player.currentPortId,
      world,
    );
    return {
      goodsId: c.goodsId,
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

export function buildShipyardView(
  world: World,
  selectedShipId?: string,
): ShipyardView {
  const port = PORTS.find((p) => p.id === world.player.currentPortId);
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

  const availableEquipments = EQUIPMENTS.filter((e) =>
    e.sellPortIds.includes(world.player.currentPortId),
  ).map((e) => ({
    id: e.id,
    name: e.name,
    type: e.type,
    typeLabel: EQUIPMENT_TYPE_LABELS[e.type],
    effectDescription: getEquipmentEffectDescription(e),
    price: e.price,
    canAfford: world.fleet.gold >= e.price,
  }));

  return {
    portName: port?.name ?? "未知",
    ships,
    selectedShipId: selectedShip.id,
    selectedShipDetail,
    availableShips,
    availableEquipments,
    maxShips: world.fleet.maxShips,
    fleetGold: world.fleet.gold,
    blockedByVoyage: !!world.voyage,
  };
}
export function buildTavernView(world: World): TavernView {
  const port = PORTS.find((p) => p.id === world.player.currentPortId);
  const fleet = world.fleet;
  const ships = fleet.ships.map((ship) => {
    const config = SHIPS.find((s) => s.id === ship.typeId);
    return {
      id: ship.id,
      name: ship.name,
      typeName: config?.name ?? "未知",
      baseCrew: config?.baseCrew ?? 0,
    };
  });

  const minCrew = ships.reduce((sum, s) => sum + s.baseCrew, 0);
  const hireCost = Math.floor(BASE_HIRE_COST * (1 + fleet.crew * 0.1));

  const remainingSlots = fleet.maxCrew - fleet.crew;
  let maxHireable = 0;
  let tempGold = fleet.gold;
  while (maxHireable < remainingSlots) {
    const nextCost = Math.floor(
      BASE_HIRE_COST * (1 + (fleet.crew + maxHireable) * 0.1),
    );
    if (tempGold < nextCost) break;
    tempGold -= nextCost;
    maxHireable++;
  }

  return {
    portName: port?.name ?? "未知",
    gold: fleet.gold,
    crew: fleet.crew,
    maxCrew: fleet.maxCrew,
    minCrew,
    hireCost,
    maxHireable,
    blockedByVoyage: world.voyage !== null,
    ships,
  };
}
