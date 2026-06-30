import {
  BASE_HIRE_COST,
  CREW_PER_SLOT,
  CREW_UPKEEP_PER_DAY,
} from "../../data/formulas";
import { SHIPS } from "../../data/ships";
import { getShipCargoCapacity } from "./equipment";
import type { ShipInstance, World } from "./types";
import { DomainError } from "./types";

// ============================================================
// 领域逻辑 - 船员系统
// ============================================================

/** 计算舰队的最大船员容量上限 */
export function getMaxCrewCapacity(ships: readonly ShipInstance[]): number {
  const totalCapacity = ships.reduce((sum, ship) => {
    const shipConfig = SHIPS.find((s) => s.id === ship.typeId);
    if (!shipConfig) return sum;
    const capacity = getShipCargoCapacity(ship, shipConfig);
    return sum + capacity;
  }, 0);
  return Math.floor(totalCapacity / CREW_PER_SLOT);
}

/** 计算出航编队所需的最低船员总数 */
export function calcMinCrewForFleet(
  world: World,
  shipIds: readonly string[],
): number {
  return shipIds.reduce((sum, id) => {
    const ship = world.fleet.ships.find((s) => s.id === id);
    if (!ship) return sum;
    const shipConfig = SHIPS.find((s) => s.id === ship.typeId);
    return sum + (shipConfig?.baseCrew ?? 0);
  }, 0);
}

/** 招募船员 */
export function hireCrew(world: World, quantity: number): World {
  if (world.voyage) throw new DomainError("IN_VOYAGE");
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new DomainError("INVALID_QUANTITY");
  }

  const fleet = world.fleet;
  if (fleet.crew + quantity > fleet.maxCrew) {
    throw new DomainError("CREW_EXCEEDS_CAPACITY");
  }

  let totalCost = 0;
  for (let i = 0; i < quantity; i++) {
    const currentCrew = fleet.crew + i;
    totalCost += Math.floor(BASE_HIRE_COST * (1 + currentCrew * 0.1));
  }

  if (fleet.gold < totalCost) {
    throw new DomainError("INSUFFICIENT_GOLD");
  }

  return {
    ...world,
    fleet: {
      ...fleet,
      gold: fleet.gold - totalCost,
      crew: fleet.crew + quantity,
    },
  };
}

/** 解雇船员 */
export function fireCrew(world: World, quantity: number): World {
  if (world.voyage) throw new DomainError("IN_VOYAGE");
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new DomainError("INVALID_QUANTITY");
  }

  const fleet = world.fleet;
  if (fleet.crew - quantity < 0) {
    throw new DomainError("INVALID_QUANTITY");
  }

  return {
    ...world,
    fleet: {
      ...fleet,
      crew: fleet.crew - quantity,
    },
  };
}

/** 计算单次航行的每日船员维护费用总额 */
export function calcCrewUpkeep(crew: number, days: number): number {
  if (crew <= 0 || days <= 0) return 0;
  return crew * days * CREW_UPKEEP_PER_DAY;
}

/** 扣除维护费用 */
export function deductCrewUpkeep(world: World, days: number): World {
  const upkeep = calcCrewUpkeep(world.fleet.crew, days);
  return {
    ...world,
    fleet: {
      ...world.fleet,
      gold: Math.max(0, world.fleet.gold - upkeep),
    },
  };
}

/** 重新计算并更新最大船员容量，溢出部分自动裁撤 */
export function recalculateMaxCrew(world: World): World {
  const newMaxCrew = getMaxCrewCapacity(world.fleet.ships);
  return {
    ...world,
    fleet: {
      ...world.fleet,
      maxCrew: newMaxCrew,
      crew: Math.min(world.fleet.crew, newMaxCrew),
    },
  };
}
