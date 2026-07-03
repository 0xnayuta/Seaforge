import type { EquipmentConfig } from "../../data/equipment";
import { EQUIPMENTS } from "../../data/equipment";
import { GOODS } from "../../data/goods";
import { SHIPS, type ShipConfig } from "../../data/ships";
import type { ShipInstance, World } from "./types";
import { DomainError } from "./types";

/**
 * 遍历船只已装备物品并累加指定效果的数值
 */
function getEquipmentBonusSum(
  ship: ShipInstance,
  extractor: (effect: EquipmentConfig["effect"]) => number | undefined,
): number {
  let sum = 0;
  for (const itemId of ship.equippedItems || []) {
    const config = EQUIPMENTS.find((e) => e.id === itemId);
    const val = config && extractor(config.effect);
    if (val) sum += val;
  }
  return sum;
}

/**
 * 计算包含装备加成的船只速度
 */
export function getShipSpeed(
  ship: ShipInstance,
  shipConfig: ShipConfig,
): number {
  const baseMultiplier = 1 + ship.equipment.sailLevel * 0.05;
  const equipMultiplier = 1 + getEquipmentBonusSum(ship, (e) => e.speedBonus);
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
  capacity += getEquipmentBonusSum(ship, (e) => e.capacityBonus);
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
  const equipMultiplier = 1 + getEquipmentBonusSum(ship, (e) => e.combatBonus);
  return baseMultiplier * equipMultiplier;
}

/**
 * 计算船只海盗回避率
 */
export function getShipPirateEvasion(ship: ShipInstance): number {
  return getEquipmentBonusSum(ship, (e) => e.evasionBonus);
}

/**
 * 计算船只拥有的装备耐久度加成
 */
export function getEquipmentDurabilityBonus(ship: ShipInstance): number {
  return getEquipmentBonusSum(ship, (e) => e.durabilityBonus);
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
      shipEquipmentInventory: [
        ...(world.fleet.shipEquipmentInventory || []),
        equipmentId,
      ],
    },
  };
}

/**
 * 出售已拥有（且未装备）的装备
 * 纯函数，返回新 World
 */
export function sellEquipment(world: World, equipmentId: string): World {
  if (world.voyage) throw new DomainError("IN_VOYAGE");

  const idx = (world.fleet.shipEquipmentInventory || []).indexOf(equipmentId);
  if (idx === -1) {
    throw new DomainError("EQUIPMENT_NOT_FOUND");
  }

  const config = EQUIPMENTS.find((e) => e.id === equipmentId);
  if (!config) throw new DomainError("EQUIPMENT_NOT_FOUND");

  // 回收价格折半
  const refund = Math.floor(config.price * 0.5);

  const nextInventory = [...(world.fleet.shipEquipmentInventory || [])];
  nextInventory.splice(idx, 1);

  return {
    ...world,
    fleet: {
      ...world.fleet,
      gold: world.fleet.gold + refund,
      shipEquipmentInventory: nextInventory,
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

  const idx = (world.fleet.shipEquipmentInventory || []).indexOf(equipmentId);
  if (idx === -1) throw new DomainError("EQUIPMENT_NOT_FOUND");
  if ((ship.equippedItems || []).length >= 3)
    throw new DomainError("EQUIPMENT_SLOT_FULL");
  if (
    (ship.equippedItems || []).some((id) => {
      const eq = EQUIPMENTS.find((e) => e.id === id);
      return eq && eq.type === config.type;
    })
  )
    throw new DomainError("DUPLICATE_EQUIPMENT_TYPE");

  const nextInventory = [...(world.fleet.shipEquipmentInventory || [])];
  nextInventory.splice(idx, 1);

  const durBonus = config.effect.durabilityBonus ?? 0;
  return {
    ...world,
    fleet: {
      ...world.fleet,
      shipEquipmentInventory: nextInventory,
      ships: world.fleet.ships.map((s) =>
        s.id === shipId
          ? {
              ...s,
              equippedItems: [...(s.equippedItems || []), equipmentId],
              durability: s.durability + durBonus,
              maxDurability: s.maxDurability + durBonus,
            }
          : s,
      ),
    },
  };
}

/** 计算卸下装备后的耐久变化 */
function calcUnequipDurability(
  ship: ShipInstance,
  durBonus: number,
): { nextDurability: number; nextMaxDurability: number } {
  const nextMaxDurability = Math.max(0, ship.maxDurability - durBonus);
  const nextDurability = durBonus
    ? Math.max(1, Math.min(ship.durability - durBonus, nextMaxDurability))
    : ship.durability;
  return { nextDurability, nextMaxDurability };
}

/** 校验卸下装备后舱容是否超载 */
function checkUnequipCapacity(
  ship: ShipInstance,
  config: EquipmentConfig,
  idx: number,
): void {
  if (!config.effect.capacityBonus) return;
  const shipConfig = SHIPS.find((s) => s.id === ship.typeId);
  if (!shipConfig) return;
  const currentCargoUsed = ship.cargo.reduce((sum, c) => {
    const good = GOODS.find((g) => g.id === c.goodId);
    return sum + (good?.volume ?? 1) * c.quantity;
  }, 0);
  const nextEquippedTest = (ship.equippedItems || []).filter(
    (_, i) => i !== idx,
  );
  const newEffectiveCapacity = Math.floor(
    getShipCargoCapacity(
      { ...ship, equippedItems: nextEquippedTest },
      shipConfig,
    ) * shipConfig.armamentTiers[ship.armamentLevel][0],
  );
  if (currentCargoUsed > newEffectiveCapacity) {
    throw new DomainError("CARGO_EXCEEDS_CAPACITY");
  }
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
  const idx = (ship.equippedItems || []).indexOf(equipmentId);
  if (idx === -1) throw new DomainError("EQUIPMENT_NOT_FOUND");

  // 卸下装甲后减少耐久上限和当前值
  const durBonus = config.effect.durabilityBonus ?? 0;
  const { nextDurability, nextMaxDurability } = calcUnequipDurability(
    ship,
    durBonus,
  );

  // 校验舱容超载：卸下舱容装备后已用容量不得超过新舱容
  checkUnequipCapacity(ship, config, idx);

  const nextEquipped = [...(ship.equippedItems || [])];
  nextEquipped.splice(idx, 1);

  return {
    ...world,
    fleet: {
      ...world.fleet,
      shipEquipmentInventory: [
        ...(world.fleet.shipEquipmentInventory || []),
        equipmentId,
      ],
      ships: world.fleet.ships.map((s) =>
        s.id === shipId
          ? {
              ...s,
              equippedItems: nextEquipped,
              durability: nextDurability,
              maxDurability: nextMaxDurability,
            }
          : s,
      ),
    },
  };
}
