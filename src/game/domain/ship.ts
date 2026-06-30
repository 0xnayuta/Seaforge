import { REPAIR_COST_MULTIPLIER, SHIP_SELL_RATIO } from "../../data/formulas";
import { SHIPS } from "../../data/ships";
import { recalculateMaxCrew } from "./crew";
import type { ShipEquipment, ShipInstance, World } from "./types";
import { DomainError } from "./types";

// ============================================================
// 船只逻辑 — 纯函数
// ============================================================

export type ArmamentLevel = 0 | 1 | 2;

/** 部件类型 */
export type ComponentType = "hull" | "sail" | "armor" | "cannon";

export const COMPONENT_LABELS: Record<ComponentType, string> = {
  hull: "货舱",
  sail: "船帆",
  armor: "装甲",
  cannon: "火炮",
};

const COMPONENT_TO_EQUIP_KEY: Record<ComponentType, keyof ShipEquipment> = {
  hull: "hullLevel",
  sail: "sailLevel",
  armor: "armorLevel",
  cannon: "cannonLevel",
};

/// 武装档次标签
export const ARMAMENT_LABELS: readonly string[] = [
  "满载货物",
  "均衡配置",
  "武装护航",
];

/** 获取当前操作船只 */
export function getActiveShip(world: World): ShipInstance {
  const ship =
    world.fleet.ships.find((s) => s.id === world.fleet.activeShipId) ??
    world.fleet.ships[0];
  if (!ship) throw new DomainError("INVALID_SHIP");
  return ship;
}

/**
 * 计算防御分 — 生存率与战斗判定共用同一公式结构。
 *
 * score = 100 + (defenseMultiplier - 1) × defFactor - (1 - hpRatio) × hpFactor
 */
export function calcDefenseScore(
  defenseMultiplier: number,
  hpRatio: number,
  defFactor: number,
  hpFactor: number,
): number {
  return 100 + (defenseMultiplier - 1) * defFactor - (1 - hpRatio) * hpFactor;
}

/** 计算船只最大耐久 */
export function calcMaxDurability(
  shipConfig: (typeof SHIPS)[number],
  equipment: ShipEquipment,
): number {
  return Math.floor(
    shipConfig.baseDurability * (1 + equipment.armorLevel * 0.2),
  );
}

/** 升级指定部件 */
export function upgradeComponent(
  world: World,
  shipId: string,
  component: ComponentType,
): World {
  if (world.voyage) throw new DomainError("IN_VOYAGE");

  const fleet = world.fleet;
  const ship = fleet.ships.find((s) => s.id === shipId);
  if (!ship) throw new DomainError("INVALID_SHIP");

  const shipConfig = SHIPS.find((s) => s.id === ship.typeId);
  if (!shipConfig) throw new DomainError("INVALID_SHIP");

  const equipKey = COMPONENT_TO_EQUIP_KEY[component];
  const currentLevel = ship.equipment[equipKey];
  if (currentLevel >= shipConfig.maxComponentLevel)
    throw new DomainError("MAX_LEVEL_REACHED");

  const cost = shipConfig.upgradeCosts[component][currentLevel];
  if (fleet.gold < cost) throw new DomainError("INSUFFICIENT_GOLD");

  const newEquipment: ShipEquipment = {
    ...ship.equipment,
    [equipKey]: currentLevel + 1,
  };

  // armor 升级时提升最大耐久并补满
  let newMaxDurability = ship.maxDurability;
  let newDurability = ship.durability;
  if (component === "armor") {
    newMaxDurability = calcMaxDurability(shipConfig, newEquipment);
    newDurability = newMaxDurability;
  }

  const nextWorld = {
    ...world,
    fleet: {
      ...fleet,
      gold: fleet.gold - cost,
      ships: fleet.ships.map((s) =>
        s.id === shipId
          ? {
              ...s,
              equipment: newEquipment,
              maxDurability: newMaxDurability,
              durability: newDurability,
            }
          : s,
      ),
    },
  };
  return recalculateMaxCrew(nextWorld);
}

/** 船只受损 */
export function takeDamage(
  world: World,
  shipId: string,
  damage: number,
): World {
  if (damage <= 0) return world;

  return {
    ...world,
    fleet: {
      ...world.fleet,
      ships: world.fleet.ships.map((s) =>
        s.id === shipId
          ? { ...s, durability: Math.max(0, s.durability - damage) }
          : s,
      ),
    },
  };
}

/** 维修船只 */
export function repairShip(world: World, shipId: string): World {
  if (world.voyage) throw new DomainError("IN_VOYAGE");

  const fleet = world.fleet;
  const ship = fleet.ships.find((s) => s.id === shipId);
  if (!ship) throw new DomainError("INVALID_SHIP");

  const shipConfig = SHIPS.find((s) => s.id === ship.typeId);
  if (!shipConfig) throw new DomainError("INVALID_SHIP");

  const missing = ship.maxDurability - ship.durability;
  if (missing <= 0) return world;

  const repairCost = Math.ceil(
    missing * shipConfig.repairCostPerDurability * REPAIR_COST_MULTIPLIER,
  );
  if (fleet.gold < repairCost) throw new DomainError("INSUFFICIENT_GOLD");

  return {
    ...world,
    fleet: {
      ...fleet,
      gold: fleet.gold - repairCost,
      ships: fleet.ships.map((s) =>
        s.id === shipId ? { ...s, durability: s.maxDurability } : s,
      ),
    },
  };
}

/** 设置武装等级 */
export function setArmamentLevel(
  world: World,
  shipId: string,
  level: ArmamentLevel,
): World {
  if (world.voyage) throw new DomainError("IN_VOYAGE");

  return {
    ...world,
    fleet: {
      ...world.fleet,
      ships: world.fleet.ships.map((s) =>
        s.id === shipId ? { ...s, armamentLevel: level } : s,
      ),
    },
  };
}

/** 获取最近港口 id（用于全损回港） */
export function getNearestPort(fromPortId: string, _toPortId: string): string {
  return fromPortId;
}

/** 购买新船只 */
export function buyShip(world: World, typeId: string): World {
  if (world.voyage) throw new DomainError("IN_VOYAGE");

  const shipConfig = SHIPS.find((s) => s.id === typeId);
  if (!shipConfig) throw new DomainError("INVALID_SHIP");

  if (!shipConfig.sellPortIds.includes(world.player.currentPortId))
    throw new DomainError("SHIP_NOT_AT_PORT");

  const fleet = world.fleet;
  if (fleet.ships.length >= fleet.maxShips) throw new DomainError("FLEET_FULL");

  if (fleet.gold < shipConfig.basePrice)
    throw new DomainError("INSUFFICIENT_GOLD");

  const newShip: ShipInstance = {
    id:
      "ship-" +
      Date.now().toString(36) +
      "-" +
      Math.random().toString(36).slice(2, 6),
    typeId: shipConfig.id,
    name: shipConfig.name,
    equipment: { hullLevel: 0, sailLevel: 0, armorLevel: 0, cannonLevel: 0 },
    durability: shipConfig.baseDurability,
    maxDurability: shipConfig.baseDurability,
    cargo: [],
    armamentLevel: 0,
    equippedItems: [],
  };

  const nextWorld = {
    ...world,
    fleet: {
      ...fleet,
      gold: fleet.gold - shipConfig.basePrice,
      ships: [...fleet.ships, newShip],
    },
  };
  return recalculateMaxCrew(nextWorld);
}

/** 出售船只 */
export function sellShip(world: World, shipId: string): World {
  if (world.voyage) throw new DomainError("IN_VOYAGE");

  const fleet = world.fleet;
  if (fleet.ships.length <= 1) throw new DomainError("LAST_SHIP");

  const ship = fleet.ships.find((s) => s.id === shipId);
  if (!ship) throw new DomainError("INVALID_SHIP");

  if (ship.cargo.length > 0) throw new DomainError("SHIP_HAS_CARGO");
  if (ship.equippedItems && ship.equippedItems.length > 0) {
    throw new DomainError("SHIP_HAS_EQUIPMENT");
  }

  const shipConfig = SHIPS.find((s) => s.id === ship.typeId);
  if (!shipConfig) throw new DomainError("INVALID_SHIP");

  const recovery = Math.floor(shipConfig.basePrice * SHIP_SELL_RATIO);

  const newShips = fleet.ships.filter((s) => s.id !== shipId);
  let newActiveShipId = fleet.activeShipId;
  if (shipId === fleet.activeShipId) {
    newActiveShipId = newShips[0].id;
  }

  const nextWorld = {
    ...world,
    fleet: {
      ...fleet,
      gold: fleet.gold + recovery,
      ships: newShips,
      activeShipId: newActiveShipId,
    },
  };
  return recalculateMaxCrew(nextWorld);
}
