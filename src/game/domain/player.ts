import {
  BASE_EXP,
  LEVEL_EXP_GROWTH,
  SCALING_COEFFICIENTS,
  SOFT_CAP_BRACKETS,
  STARTING_DAY,
  STARTING_GOLD,
} from "../../data/formulas";
import { ITEMS, type ItemConfig } from "../../data/items";
import { SHIPS } from "../../data/ships";
import { getMaxCrewCapacity } from "./crew";
import { applyDayPass, initMarketPrices } from "./market";
import {
  DomainError,
  type ItemInstance,
  type PlayerState,
  type ShipInstance,
  type World,
} from "./types";
/** 创建初始游戏世界状态 */
export function createDefaultWorld(): World {
  const defaultShip = SHIPS.find((s) => s.id === "sloop") ?? SHIPS[0];
  const initialShips: readonly ShipInstance[] = [
    {
      id: "ship-1",
      typeId: defaultShip.id,
      name: defaultShip.name,
      equipment: {
        hullLevel: 0,
        sailLevel: 0,
        armorLevel: 0,
        cannonLevel: 0,
      },
      durability: defaultShip.baseDurability,
      maxDurability: defaultShip.baseDurability,
      cargo: [],
      armamentLevel: 0,
      equippedItems: [],
    },
  ];

  return {
    player: {
      name: "船长",
      currentPortId: "quanzhou",
      day: STARTING_DAY,
      level: 1,
      exp: 0,
      expToNext: BASE_EXP,
      str: 1,
      dex: 1,
      int: 1,
      fth: 1,
      arc: 1,
      attributePoints: 0,
      equipment: {
        weapon: null,
        armor: null,
        accessory1: null,
        accessory2: null,
      },
      totalSalesRevenue: 0,
      bestSingleProfit: 0,
      totalMileage: 0,
      combatWins: 0,
      voyagesCompleted: 0,
    },
    fleet: {
      ships: initialShips,
      activeShipId: "ship-1",
      maxShips: 1,
      crew: defaultShip.baseCrew,
      maxCrew: getMaxCrewCapacity(initialShips),
      gold: STARTING_GOLD,
      inventory: [],
      shipEquipmentInventory: [],
    },
    market: initMarketPrices(),
    voyage: null,
    combat: null,
    npcRelations: {},
    activeQuests: [],
    selectedTitle: null,
    collection: {
      visitedPorts: ["quanzhou"],
      tradedGoods: [],
      ownedShips: ["sloop"],
      collectedItems: [],
    },
    claimedAchievements: [],
    dungeon: null,
    dungeonCooldowns: {},
  };
}

/**
 * 推进 N 天：玩家天数 + 全市场价格向均衡回归 + 随机波动。
 * 每次航行到达时调用，天数等于航行耗时。
 */
export function advanceDay(world: World, days: number): World {
  let result: World = {
    ...world,
    player: {
      ...world.player,
      day: world.player.day + days,
    },
  };

  // 每过一天，价格推进一次
  for (let i = 0; i < days; i++) {
    result = applyDayPass(result);
  }

  return result;
}

/**
 * 给玩家增加经验，触发自动升级（可多级连升）。
 * 纯函数，返回新 World。
 */
export function gainExp(world: World, amount: number): World {
  if (amount <= 0) return world;
  return levelUp({
    ...world,
    player: { ...world.player, exp: world.player.exp + amount },
  });
}

/**
 * 递归升级：exp >= expToNext 则升级，溢出经验保留到下一级。
 */
function levelUp(world: World): World {
  const { level, exp, expToNext } = world.player;
  if (exp < expToNext) return world;
  const nextExp = exp - expToNext;
  const nextLevel = level + 1;
  const nextExpToNext = Math.floor(
    BASE_EXP * (1 + nextLevel * LEVEL_EXP_GROWTH),
  );
  return levelUp({
    ...world,
    player: {
      ...world.player,
      level: nextLevel,
      exp: nextExp,
      expToNext: nextExpToNext,
      attributePoints: world.player.attributePoints + 3,
    },
    // maxShips 不再通过等级自动增长，改由 NPC 招募系统控制
  });
}

export interface PanelStats {
  readonly hp: number;
  readonly mp: number;
  readonly atk: number;
  readonly def: number;
  readonly mag: number;
  readonly mdf: number;
  readonly spd: number;
  readonly luk: number;
  readonly equipLoad: number;
}

/** 计算软上限后的有效属性值 */
export function getEffectiveAttribute(val: number): number {
  let effective = 0;
  let remaining = val;
  for (const bracket of SOFT_CAP_BRACKETS) {
    const bracketSize = bracket.max - bracket.min;
    if (remaining > bracketSize) {
      effective += bracketSize * bracket.rate;
      remaining -= bracketSize;
    } else {
      effective += remaining * bracket.rate;
      remaining = 0;
      break;
    }
  }
  return effective;
}

function getEquippedItemConfig(
  uid: string | null,
  inventory: readonly ItemInstance[],
): ItemConfig | null {
  if (!uid) return null;
  const instance = inventory.find((item) => item.uid === uid);
  if (!instance) return null;
  return ITEMS.find((cfg) => cfg.id === instance.itemId) ?? null;
}

type _EffAttr = "str" | "dex" | "int" | "fth" | "arc";

/**
 * 计算装备属性补正总和。
 * baseStat × Σ (有效属性值 / 100 × 补正系数)
 */
function calcScalingSum(
  baseStat: number,
  scaling: ItemConfig["scaling"] | undefined,
  attrMappings: readonly { key: _EffAttr; value: number }[],
): number {
  let total = 0;
  for (const { key, value } of attrMappings) {
    const grade = scaling?.[key];
    if (grade) {
      total += baseStat * (value / 100) * SCALING_COEFFICIENTS[grade];
    }
  }
  return total;
}
/** 计算角色面板属性（含装备加成） */
export function calcPanelStats(
  player: PlayerState,
  inventory: readonly ItemInstance[],
): PanelStats {
  const effStr = getEffectiveAttribute(player.str);
  const effDex = getEffectiveAttribute(player.dex);
  const effInt = getEffectiveAttribute(player.int);
  const effFth = getEffectiveAttribute(player.fth);
  const effArc = getEffectiveAttribute(player.arc);

  // 1. 基础值（公式）
  const baseHp =
    80 +
    player.level * 8 +
    effStr * 4 +
    (effDex + effInt + effFth + effArc) * 1;
  const baseMp = 20 + player.level * 2 + effInt * 2 + effFth * 1;
  const baseAtk = 8 + effStr * 2.0 + effDex * 0.5;
  const baseDef = 5 + effStr * 0.8 + effDex * 0.4;
  const baseMag = 5 + effInt * 2.0 + effFth * 0.5;
  const baseMdf = 5 + effInt * 0.6 + effFth * 1.0;
  const baseSpd = 8 + effDex * 1.5;
  const baseLuk = 5 + effArc * 2.0;
  const baseEquipLoad = 15 + effStr * 2.5;

  // 2. 获取装备配置
  const weapon = getEquippedItemConfig(player.equipment.weapon, inventory);
  const armor = getEquippedItemConfig(player.equipment.armor, inventory);
  const acc1 = getEquippedItemConfig(player.equipment.accessory1, inventory);
  const acc2 = getEquippedItemConfig(player.equipment.accessory2, inventory);

  const configs = [weapon, armor, acc1, acc2].filter(
    (c): c is ItemConfig => c !== null,
  );

  // 3. 累计装备基础加成
  let eqHp = 0;
  let eqAtk = 0;
  let eqDef = 0;
  let eqMag = 0;
  let eqMdf = 0;
  let eqSpd = 0;
  let eqLuk = 0;
  let eqEquipLoad = 0;
  for (const c of configs) {
    eqHp += c.effect.hpBonus ?? 0;
    eqAtk += c.effect.atkBonus ?? 0;
    eqDef += c.effect.defBonus ?? 0;
    eqMag += c.effect.magBonus ?? 0;
    eqMdf += c.effect.mdfBonus ?? 0;
    eqSpd += c.effect.spdBonus ?? 0;
    eqLuk += c.effect.lukBonus ?? 0;
    eqEquipLoad += c.effect.equipLoadBonus ?? 0;
  }

  let scalingAtk = 0;
  let scalingDef = 0;
  let scalingMag = 0;
  let scalingMdf = 0;

  // 4. 属性补正计算（武器补正 ATK/MAG，防具补正 DEF/MDF）
  if (weapon) {
    const baseAtk = weapon.effect.atkBonus ?? 0;
    const baseMag = weapon.effect.magBonus ?? 0;
    scalingAtk += calcScalingSum(baseAtk, weapon.scaling, [
      { key: "str", value: effStr },
      { key: "dex", value: effDex },
      { key: "arc", value: effArc },
    ]);
    scalingMag += calcScalingSum(baseMag, weapon.scaling, [
      { key: "int", value: effInt },
      { key: "fth", value: effFth },
      { key: "arc", value: effArc },
    ]);
  }
  if (armor) {
    const baseDef = armor.effect.defBonus ?? 0;
    const baseMdf = armor.effect.mdfBonus ?? 0;
    scalingDef += calcScalingSum(baseDef, armor.scaling, [
      { key: "str", value: effStr },
      { key: "dex", value: effDex },
      { key: "arc", value: effArc },
    ]);
    scalingMdf += calcScalingSum(baseMdf, armor.scaling, [
      { key: "int", value: effInt },
      { key: "fth", value: effFth },
      { key: "arc", value: effArc },
    ]);
  }

  return {
    hp: Math.max(0, Math.floor(baseHp + eqHp)),
    mp: Math.max(0, Math.floor(baseMp)),
    atk: Math.max(0, Math.floor(baseAtk + eqAtk + scalingAtk)),
    def: Math.max(0, Math.floor(baseDef + eqDef + scalingDef)),
    mag: Math.max(0, Math.floor(baseMag + eqMag + scalingMag)),
    mdf: Math.max(0, Math.floor(baseMdf + eqMdf + scalingMdf)),
    spd: Math.max(0, Math.floor(baseSpd + eqSpd)),
    luk: Math.max(0, Math.floor(baseLuk + eqLuk)),
    equipLoad: Math.max(0, Math.floor(baseEquipLoad + eqEquipLoad)),
  };
}

/** 分配一个属性点 */
export function allocateAttributePoint(
  world: World,
  attribute: "str" | "dex" | "int" | "fth" | "arc",
): World {
  if (world.player.attributePoints <= 0) {
    throw new DomainError("INSUFFICIENT_ATTRIBUTE_POINTS");
  }
  return {
    ...world,
    player: {
      ...world.player,
      [attribute]: world.player[attribute] + 1,
      attributePoints: world.player.attributePoints - 1,
    },
  };
}

/** 增加物品到背包 */
export function gainItem(
  world: World,
  itemId: string,
  quantity = 1,
  uids?: string[],
): World {
  const config = ITEMS.find((cfg) => cfg.id === itemId);
  if (!config) throw new DomainError("ITEM_NOT_FOUND");
  if (quantity <= 0) return world;

  const nextInventory = [...world.fleet.inventory];

  if (config.stackable) {
    const existingIndex = nextInventory.findIndex(
      (item) => item.itemId === itemId && !item.equippedSlot,
    );
    if (existingIndex !== -1) {
      const existing = nextInventory[existingIndex];
      nextInventory[existingIndex] = {
        ...existing,
        quantity: existing.quantity + quantity,
      };
    } else {
      const uid =
        uids?.[0] ??
        `item-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      nextInventory.push({
        uid,
        itemId,
        quantity,
      });
    }
  } else {
    for (let i = 0; i < quantity; i++) {
      const uid =
        uids?.[i] ??
        `item-${Date.now()}-${Math.random().toString(36).substring(2, 9)}-${i}`;
      nextInventory.push({
        uid,
        itemId,
        quantity: 1,
        durability:
          config.type === "weapon" || config.type === "armor" ? 100 : undefined,
        maxDurability:
          config.type === "weapon" || config.type === "armor" ? 100 : undefined,
        upgradeLevel:
          config.type === "weapon" || config.type === "armor" ? 0 : undefined,
      });
    }
  }

  return {
    ...world,
    fleet: {
      ...world.fleet,
      inventory: nextInventory,
    },
  };
}
/** 从背包移除物品 */
export function removeItem(world: World, itemUid: string, quantity = 1): World {
  const nextInventory = [...world.fleet.inventory];
  const idx = nextInventory.findIndex((item) => item.uid === itemUid);
  if (idx === -1) throw new DomainError("ITEM_NOT_FOUND");

  const item = nextInventory[idx];
  if (item.quantity <= quantity) {
    nextInventory.splice(idx, 1);
  } else {
    nextInventory[idx] = {
      ...item,
      quantity: item.quantity - quantity,
    };
  }

  return {
    ...world,
    fleet: {
      ...world.fleet,
      inventory: nextInventory,
    },
  };
}
/** 给角色装备一件物品到指定槽位 */
export function equipCharacterItem(
  world: World,
  itemUid: string,
  slot: "weapon" | "armor" | "accessory1" | "accessory2",
): World {
  if (world.voyage) throw new DomainError("IN_VOYAGE");

  const inventory = world.fleet.inventory;

  const item = inventory.find((it) => it.uid === itemUid);
  if (!item) throw new DomainError("ITEM_NOT_FOUND");

  const config = ITEMS.find((cfg) => cfg.id === item.itemId);
  if (!config) throw new DomainError("ITEM_NOT_FOUND");

  if (slot === "weapon" && config.type !== "weapon") {
    throw new DomainError("ITEM_NOT_EQUIPPABLE");
  }
  if (slot === "armor" && config.type !== "armor") {
    throw new DomainError("ITEM_NOT_EQUIPPABLE");
  }
  if (
    (slot === "accessory1" || slot === "accessory2") &&
    config.type !== "accessory"
  ) {
    throw new DomainError("ITEM_NOT_EQUIPPABLE");
  }

  let nextWorld = world;

  // Check if this item is already equipped in another slot
  const oldSlot = Object.keys(world.player.equipment).find(
    (key) =>
      world.player.equipment[key as keyof typeof world.player.equipment] ===
      itemUid,
  ) as keyof typeof world.player.equipment | undefined;

  if (oldSlot) {
    nextWorld = unequipCharacterItem(nextWorld, oldSlot);
  }
  const currentlyEquippedUid = nextWorld.player.equipment[slot];
  if (currentlyEquippedUid) {
    nextWorld = unequipCharacterItem(nextWorld, slot);
  }

  const nextInventory = nextWorld.fleet.inventory.map((it) =>
    it.uid === itemUid ? { ...it, equippedSlot: slot } : it,
  );

  return {
    ...nextWorld,
    player: {
      ...nextWorld.player,
      equipment: {
        ...nextWorld.player.equipment,
        [slot]: itemUid,
      },
    },
    fleet: {
      ...nextWorld.fleet,
      inventory: nextInventory,
    },
  };
}
/** 从角色卸下指定槽位的物品 */
export function unequipCharacterItem(
  world: World,
  slot: "weapon" | "armor" | "accessory1" | "accessory2",
): World {
  if (world.voyage) throw new DomainError("IN_VOYAGE");

  const itemUid = world.player.equipment[slot];
  if (!itemUid) return world;

  const nextInventory = world.fleet.inventory.map((it) =>
    it.uid === itemUid ? { ...it, equippedSlot: undefined } : it,
  );

  return {
    ...world,
    player: {
      ...world.player,
      equipment: {
        ...world.player.equipment,
        [slot]: null,
      },
    },
    fleet: {
      ...world.fleet,
      inventory: nextInventory,
    },
  };
}
