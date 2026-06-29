import { REPAIR_COST_MULTIPLIER } from "../../data/formulas";
import { SHIPS } from "../../data/ships";
import type { World } from "./types";
import { DomainError } from "./types";

// ============================================================
// 船只逻辑 — 纯函数
// ============================================================

export type ArmamentLevel = 0 | 1 | 2;

/** 武装档次标签 */
export const ARMAMENT_LABELS: readonly string[] = [
  "满载货物",
  "均衡配置",
  "武装护航",
];

/**
 * 计算防御分 — 生存率与战斗判定共用同一公式结构。
 *
 * score = 100 + (defenseMultiplier - 1) × defFactor - (1 - hpRatio) × hpFactor
 *
 * 生存率调用: defFactor=SURVIVAL_DEFENSE_FACTOR(10), hpFactor=SURVIVAL_HP_PENALTY_FACTOR(20)
 *            survival = clamp(score - baseDangerScore, 5, 99)
 *
 * 战斗判定调用: defFactor=COMBAT_DEFENSE_BONUS_FACTOR(20), hpFactor=COMBAT_HP_PENALTY_FACTOR(100)
 *             combatScore = score × random(±40%) × regionModifier → 判阈值
 */
export function calcDefenseScore(
  defenseMultiplier: number,
  hpRatio: number,
  defFactor: number,
  hpFactor: number,
): number {
  return 100 + (defenseMultiplier - 1) * defFactor - (1 - hpRatio) * hpFactor;
}

/** 升级船只：扣金币 + 提升等级。返回新 World 或抛出错误。 */
export function upgradeShip(world: World): World {
  const shipConfig = SHIPS.find((s) => s.id === world.ship.typeId);
  if (!shipConfig) throw new DomainError("INVALID_SHIP");

  const level = world.ship.upgradeLevel;
  if (level >= shipConfig.maxUpgradeLevel)
    throw new DomainError("MAX_LEVEL_REACHED");

  const cost = shipConfig.upgradeCosts[level];
  if (world.player.gold < cost) throw new DomainError("INSUFFICIENT_GOLD");

  if (world.voyage) throw new DomainError("IN_VOYAGE");

  // 升级时按比例提升 maxHp（每升一级 +20%），并回复全 HP
  const newMaxHp = Math.floor(world.ship.maxHp * 1.2);

  return {
    ...world,
    player: {
      ...world.player,
      gold: world.player.gold - cost,
    },
    ship: {
      ...world.ship,
      upgradeLevel: level + 1,
      currentHp: newMaxHp,
      maxHp: newMaxHp,
    },
  };
}

/**
 * 船只受损：减少 currentHp，最低 0。
 * 返回新 World。
 */
export function takeDamage(world: World, damage: number): World {
  if (damage <= 0) return world;

  return {
    ...world,
    ship: {
      ...world.ship,
      currentHp: Math.max(0, world.ship.currentHp - damage),
    },
  };
}

/**
 * 维修船只：在港口付费修复 HP 至 maxHp。
 * 检查：是否在港口（不在航行中）、是否有足够金币、是否缺 HP。
 */
export function repairShip(world: World): World {
  if (world.voyage) throw new DomainError("IN_VOYAGE");

  const shipConfig = SHIPS.find((s) => s.id === world.ship.typeId);
  if (!shipConfig) throw new DomainError("INVALID_SHIP");

  const missingHp = world.ship.maxHp - world.ship.currentHp;
  if (missingHp <= 0) return world; // 无需维修

  const repairCost = Math.ceil(
    missingHp * shipConfig.repairCostPerHp * REPAIR_COST_MULTIPLIER,
  );

  if (world.player.gold < repairCost)
    throw new DomainError("INSUFFICIENT_GOLD");

  return {
    ...world,
    player: {
      ...world.player,
      gold: world.player.gold - repairCost,
    },
    ship: {
      ...world.ship,
      currentHp: world.ship.maxHp,
    },
  };
}

/**
 * 设置武装等级。航海中拒绝更改（抛 DomainError）。
 */
export function setArmamentLevel(world: World, level: 0 | 1 | 2): World {
  if (world.voyage) throw new DomainError("IN_VOYAGE");
  return {
    ...world,
    ship: { ...world.ship, armamentLevel: level },
  };
}

/**
 * 获取最近港口 id（用于全损回港）。
 * 坐标距离对称，始终返回出发港。
 * （旧 ROUTES 表同向等距，行为不变）
 */
export function getNearestPort(fromPortId: string, _toPortId: string): string {
  return fromPortId;
}
