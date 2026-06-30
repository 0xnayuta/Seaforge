import { EQUIPMENTS } from "../../data/equipment";
import { GOODS } from "../../data/goods";
import { SHIPS, type ShipConfig } from "../../data/ships";
import type { ShipInstance, World } from "./types";
import { DomainError } from "./types";

/**
 * 计算包含装备加成的船只速度
 */
export function getShipSpeed(
  ship: ShipInstance,
  shipConfig: ShipConfig,
): number {
  const baseMultiplier = 1 + ship.equipment.sailLevel * 0.05;
  let equipMultiplier = 1;
  for (const itemId of ship.equippedItems || []) {
    const config = EQUIPMENTS.find((e) => e.id === itemId);
    if (config?.effect.speedBonus) {
      equipMultiplier += config.effect.speedBonus;
    }
  }
  return shipConfig.speed * baseMultiplier * equipMultiplier;
}

/**
 * 计算包含装备加成的船只最大舱容
 */
export function getShipCargoCapacity(
  ship: ShipInstance,
  shipConfig: ShipConfig,
): number {
  let capacity = Math.floor(
    shipConfig.capacity * (1 + ship.equipment.hullLevel * 0.2),
  );
  for (const itemId of ship.equippedItems || []) {
    const config = EQUIPMENTS.find((e) => e.id === itemId);
    if (config?.effect.capacityBonus) {
      capacity += config.effect.capacityBonus;
    }
  }
  return capacity;
}

/**
 * 计算包含火炮加成的防御倍率（战斗加成）
 */
export function getShipDefenseMultiplier(
  ship: ShipInstance,
  shipConfig: ShipConfig,
): number {
  const baseMultiplier = shipConfig.armamentTiers[ship.armamentLevel][1];
  let equipMultiplier = 1;
  for (const itemId of ship.equippedItems || []) {
    const config = EQUIPMENTS.find((e) => e.id === itemId);
    if (config?.effect.combatBonus) {
      equipMultiplier += config.effect.combatBonus;
    }
  }
  return baseMultiplier * equipMultiplier;
}

/**
 * 计算船只海盗回避率
 */
export function getShipPirateEvasion(ship: ShipInstance): number {
  let evasion = 0;
  for (const itemId of ship.equippedItems || []) {
    const config = EQUIPMENTS.find((e) => e.id === itemId);
    if (config?.effect.evasionBonus) {
      evasion += config.effect.evasionBonus;
    }
  }
  return evasion;
}

/**
 * 计算舰队的海盗回避率上限（取参与航行的船只最大值）
 */
export function getFleetPirateEvasion(
  world: World,
  fleetShipIds: readonly string[],
): number {
  let maxEvasion = 0;
  for (const shipId of fleetShipIds) {
    const ship = world.fleet.ships.find((s) => s.id === shipId);
    if (!ship) continue;
    const evasion = getShipPirateEvasion(ship);
    if (evasion > maxEvasion) {
      maxEvasion = evasion;
    }
  }
  return maxEvasion;
}

/**
 * 计算船只拥有的装备耐久度加成
 */
export function getEquipmentDurabilityBonus(ship: ShipInstance): number {
  let bonus = 0;
  for (const itemId of ship.equippedItems || []) {
    const config = EQUIPMENTS.find((e) => e.id === itemId);
    if (config?.effect.durabilityBonus) {
      bonus += config.effect.durabilityBonus;
    }
  }
  return bonus;
}

/**
 * 购买装备
 * 纯函数，返回新 World，或抛出 DomainError
 */
export function buyEquipment(world: World, equipmentId: string): World {
  if (world.voyage) throw new DomainError("IN_VOYAGE");

  const config = EQUIPMENTS.find((e) => e.id === equipmentId);
  if (!config) throw new DomainError("EQUIPMENT_NOT_FOUND");

  // 必须在指定的售卖港口
  if (!config.sellPortIds.includes(world.player.currentPortId)) {
    throw new DomainError("NOT_AT_PORT");
  }

  if (world.fleet.gold < config.price) {
    throw new DomainError("INSUFFICIENT_GOLD");
  }

  return {
    ...world,
    fleet: {
      ...world.fleet,
      gold: world.fleet.gold - config.price,
      inventory: [...(world.fleet.inventory || []), equipmentId],
    },
  };
}

/**
 * 出售已拥有（且未装备）的装备
 * 纯函数，返回新 World
 */
export function sellEquipment(world: World, equipmentId: string): World {
  if (world.voyage) throw new DomainError("IN_VOYAGE");

  const idx = (world.fleet.inventory || []).indexOf(equipmentId);
  if (idx === -1) {
    throw new DomainError("EQUIPMENT_NOT_FOUND");
  }

  const config = EQUIPMENTS.find((e) => e.id === equipmentId);
  if (!config) throw new DomainError("EQUIPMENT_NOT_FOUND");

  // 回收价格折半
  const refund = Math.floor(config.price * 0.5);

  const nextInventory = [...(world.fleet.inventory || [])];
  nextInventory.splice(idx, 1);

  return {
    ...world,
    fleet: {
      ...world.fleet,
      gold: world.fleet.gold + refund,
      inventory: nextInventory,
    },
  };
}

/**
 * 装备道具
 */
export function equipItem(
  world: World,
  shipId: string,
  equipmentId: string,
): World {
  if (world.voyage) throw new DomainError("IN_VOYAGE");

  const ship = world.fleet.ships.find((s) => s.id === shipId);
  if (!ship) throw new DomainError("INVALID_SHIP");

  const config = EQUIPMENTS.find((e) => e.id === equipmentId);
  if (!config) throw new DomainError("EQUIPMENT_NOT_FOUND");

  // 必须在仓库中拥有
  const idx = (world.fleet.inventory || []).indexOf(equipmentId);
  if (idx === -1) throw new DomainError("EQUIPMENT_NOT_FOUND");

  // 每个槽位上限 3
  if ((ship.equippedItems || []).length >= 3) {
    throw new DomainError("EQUIPMENT_SLOT_FULL");
  }

  // 同类型不可重复装备
  for (const equippedId of ship.equippedItems || []) {
    const eq = EQUIPMENTS.find((e) => e.id === equippedId);
    if (eq && eq.type === config.type) {
      throw new DomainError("DUPLICATE_EQUIPMENT_TYPE");
    }
  }

  // 从仓库移走
  const nextInventory = [...(world.fleet.inventory || [])];
  nextInventory.splice(idx, 1);

  // 装备到船上
  const nextEquipped = [...(ship.equippedItems || []), equipmentId];

  // 更新船只属性：如果是装甲加成，增加 maxDurability 和 durability
  let nextDurability = ship.durability;
  let nextMaxDurability = ship.maxDurability;

  if (config.effect.durabilityBonus) {
    nextMaxDurability += config.effect.durabilityBonus;
    nextDurability += config.effect.durabilityBonus;
  }

  const nextShip = {
    ...ship,
    equippedItems: nextEquipped,
    durability: nextDurability,
    maxDurability: nextMaxDurability,
  };

  return {
    ...world,
    fleet: {
      ...world.fleet,
      inventory: nextInventory,
      ships: world.fleet.ships.map((s) => (s.id === shipId ? nextShip : s)),
    },
  };
}

/**
 * 卸下道具
 */
export function unequipItem(
  world: World,
  shipId: string,
  equipmentId: string,
): World {
  if (world.voyage) throw new DomainError("IN_VOYAGE");

  const ship = world.fleet.ships.find((s) => s.id === shipId);
  if (!ship) throw new DomainError("INVALID_SHIP");

  const config = EQUIPMENTS.find((e) => e.id === equipmentId);
  if (!config) throw new DomainError("EQUIPMENT_NOT_FOUND");

  // 必须在已装备项中
  const idx = (ship.equippedItems || []).indexOf(equipmentId);
  if (idx === -1) throw new DomainError("EQUIPMENT_NOT_FOUND");

  // 预估耐久变化
  let nextDurability = ship.durability;
  let nextMaxDurability = ship.maxDurability;

  if (config.effect.durabilityBonus) {
    nextMaxDurability = Math.max(
      0,
      nextMaxDurability - config.effect.durabilityBonus,
    );
    nextDurability = Math.min(nextDurability, nextMaxDurability);
  }

  // 校验超载：如果这个是舱容加成，卸下后舱容会减小，需要看当前船上已用容量是否超过新舱容
  if (config.effect.capacityBonus) {
    const shipConfig = SHIPS.find((s) => s.id === ship.typeId);
    if (shipConfig) {
      const currentCargoUsed = ship.cargo.reduce((sum, c) => {
        const good = GOODS.find((g) => g.id === c.goodId);
        return sum + (good?.volume ?? 1) * c.quantity;
      }, 0);

      const nextEquippedTest = (ship.equippedItems || []).filter(
        (_, i) => i !== idx,
      );
      const newCapacity = getShipCargoCapacity(
        {
          ...ship,
          equippedItems: nextEquippedTest,
        },
        shipConfig,
      );

      // 获取当前武装等级对应的有效舱容系数
      const cargoRatio = shipConfig.armamentTiers[ship.armamentLevel][0];
      const newEffectiveCapacity = Math.floor(newCapacity * cargoRatio);

      if (currentCargoUsed > newEffectiveCapacity) {
        throw new DomainError("CARGO_EXCEEDS_CAPACITY");
      }
    }
  }

  // 卸下并放入仓库
  const nextEquipped = [...(ship.equippedItems || [])];
  nextEquipped.splice(idx, 1);

  const nextShip = {
    ...ship,
    equippedItems: nextEquipped,
    durability: nextDurability,
    maxDurability: nextMaxDurability,
  };

  return {
    ...world,
    fleet: {
      ...world.fleet,
      inventory: [...(world.fleet.inventory || []), equipmentId],
      ships: world.fleet.ships.map((s) => (s.id === shipId ? nextShip : s)),
    },
  };
}
