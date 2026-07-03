// ============================================================
// Ship & Fleet Views
// ============================================================

import {
  EQUIPMENT_TYPE_LABELS,
  EQUIPMENTS,
  getEquipmentEffectDescription,
} from "../../data/equipment";
import { REPAIR_COST_MULTIPLIER } from "../../data/formulas";
import { CATEGORY_LABEL, GOODS } from "../../data/goods";
import { SHIPS } from "../../data/ships";
import type {
  CargoItemView,
  ComponentView,
  FleetShipSummaryView,
  FleetView,
  ShipView,
} from "../../types/game-view";
import {
  getShipCargoCapacity,
  getShipDefenseMultiplier,
  getShipSpeed,
} from "../domain/equipment";
import { getSellPrice } from "../domain/market";
import {
  ARMAMENT_LABELS,
  COMPONENT_LABELS,
  type ComponentType,
  getActiveShip,
} from "../domain/ship";
import type { ShipInstance, World } from "../domain/types";

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

  const sellPrice = (eq: { price: number } | undefined) =>
    eq ? Math.floor(eq.price * 0.5) : 0;

  const equippedItems = (activeShip.equippedItems || []).map((itemId) => {
    const eq = EQUIPMENTS.find((e) => e.id === itemId);
    return {
      id: itemId,
      name: eq?.name ?? "未知",
      type: eq?.type ?? "special",
      typeLabel: eq ? EQUIPMENT_TYPE_LABELS[eq.type] : "未知",
      effectDescription: eq ? getEquipmentEffectDescription(eq) : "",
      sellPrice: sellPrice(eq),
    };
  });

  const fleetInventory = (world.fleet.shipEquipmentInventory || []).map(
    (itemId) => {
      const eq = EQUIPMENTS.find((e) => e.id === itemId);
      return {
        id: itemId,
        name: eq?.name ?? "未知",
        type: eq?.type ?? "special",
        typeLabel: eq ? EQUIPMENT_TYPE_LABELS[eq.type] : "未知",
        effectDescription: eq ? getEquipmentEffectDescription(eq) : "",
        sellPrice: sellPrice(eq),
      };
    },
  );

  return {
    shipName: shipConfig.name,
    fleetGold: world.fleet.gold,
    durability: activeShip.durability,
    maxDurability: activeShip.maxDurability,
    repairCost,
    canRepair: missing > 0 && world.fleet.gold >= repairCost && !world.voyage,
    blockedByVoyage: !!world.voyage,
    components,
    equippedItems,
    fleetInventory,
  };
}

export function buildFleetShipSummaryView(
  world: World,
  ship: ShipInstance,
): FleetShipSummaryView {
  const shipConfig = SHIPS.find((s) => s.id === ship.typeId);
  const typeName = shipConfig?.name ?? "未知";
  const cargoCapacity = shipConfig ? getShipCargoCapacity(ship, shipConfig) : 0;

  const cargoUsed = ship.cargo.reduce((sum, c) => {
    const good = GOODS.find((g) => g.id === c.goodsId);
    return sum + (good?.volume ?? 0) * c.quantity;
  }, 0);

  const speed = shipConfig ? getShipSpeed(ship, shipConfig) : 0;

  const defenseMultiplier = shipConfig
    ? getShipDefenseMultiplier(ship, shipConfig)
    : 1.0;

  const cargo: CargoItemView[] = ship.cargo.map((c) => {
    const good = GOODS.find((g) => g.id === c.goodsId);
    const goodName = good?.name ?? "未知";
    const category = good ? CATEGORY_LABEL[good.category] : "未知";
    const volume = good?.volume ?? 1;
    const sellPrice = getSellPrice(
      c.goodsId,
      world.player.currentPortId,
      world,
    );
    const estimatedProfit = (sellPrice - c.buyPrice) * c.quantity;

    return {
      goodsId: c.goodsId,
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
    baseCrew: shipConfig?.baseCrew ?? 0,
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
