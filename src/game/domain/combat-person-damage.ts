// ============================================================
// 人物战斗 — 伤害计算 & 行动顺序
// ============================================================

import type { SkillConfig } from "../../data/skills";
import type { CombatParticipant } from "./types";

// ---- 行动顺序 ----

/**
 * 计算行动顺序（按 SPD 降序排列）
 */
export function calcInitiative(
  participants: readonly CombatParticipant[],
): readonly string[] {
  return [...participants]
    .sort(
      (a, b) =>
        b.spd - a.spd ||
        (a.type === "player" ? -1 : b.type === "player" ? 1 : 0),
    )
    .map((p) => p.id);
}

// ---- 状态标签映射 ----

const STATUS_LABELS: Record<string, string> = {
  poison: "中毒",
  bleed: "出血",
  burn: "燃烧",
  freeze: "冰冻",
  sleep: "睡眠",
  silence: "沉默",
  blind: "暗闇",
};

export function getStatusLabel(type: string): string {
  return STATUS_LABELS[type] || type;
}

// ---- 伤害计算 ----

// ── 辅助检查 ──

/** 检查是否处于致盲状态且命中率减半判定 */
function checkBlindMiss(
  attacker: CombatParticipant,
  rng: () => number,
): boolean {
  if (attacker.statuses.some((s) => s.type === "blind")) {
    return rng() < 0.5;
  }
  return false;
}

/** 检查防御方闪避概率（基于速度差和幸运值） */
function checkEvasion(
  attacker: CombatParticipant,
  defender: CombatParticipant,
  rng: () => number,
): boolean {
  const hasFrozenOrSleep = defender.statuses.some(
    (s) => s.type === "freeze" || s.type === "sleep",
  );
  if (hasFrozenOrSleep) return false;

  const baseEvasion = 0.05;
  const spdDiffBonus = Math.max(0, (defender.spd - attacker.spd) * 0.01);
  const lukBonus = defender.luk * 0.005;
  const evasionChance = Math.min(0.3, baseEvasion + spdDiffBonus + lukBonus);
  return rng() < evasionChance;
}

/** 检查防守方弹反判定（仅物理攻击有效） */
function checkParry(defender: CombatParticipant, isPhysical: boolean): boolean {
  return defender.isParrying && isPhysical;
}

/** 计算实际伤害值（基础伤害 - 防御） */
function calculateRawDamage(
  attacker: CombatParticipant,
  defender: CombatParticipant,
  skill: SkillConfig | null,
): number {
  const power = skill ? skill.power : 1.0;
  let baseDamage = 0;
  let defense = 0;

  if (!skill || skill.type === "physical") {
    baseDamage = attacker.atk * power;
    defense = defender.def;
    if (defender.statuses.some((s) => s.type === "freeze")) {
      defense = defense * 0.7; // 冰冻状态降低 30% 物理防御
    }
  } else if (skill.type === "magical") {
    baseDamage = attacker.mag * power;
    defense = defender.mdf;
  }

  return Math.max(1, Math.round(baseDamage - defense));
}

/** 暴击判定（基于幸运值） */
function tryCrit(
  damage: number,
  attacker: CombatParticipant,
  rng: () => number,
): { damage: number; isCrit: boolean } {
  const critChance = Math.min(0.5, attacker.luk * 0.01);
  const crit = rng() < critChance;
  return crit
    ? { damage: Math.floor(damage * 1.5), isCrit: true }
    : { damage, isCrit: false };
}

// ── 主入口 ──

export interface DamageResult {
  readonly damage: number;
  readonly isCrit: boolean;
  readonly isDodged: boolean;
  readonly isParried: boolean;
  readonly isCountered: boolean;
}

/**
 * 计算单次伤害（含属性补正、暴击、闪避/弹反判定）
 */
export function calcPersonDamage(
  attacker: CombatParticipant,
  defender: CombatParticipant,
  skill: SkillConfig | null,
  rng: () => number = Math.random,
): DamageResult {
  // 1. 回避判定
  if (defender.isDodging) {
    return {
      damage: 0,
      isCrit: false,
      isDodged: true,
      isParried: false,
      isCountered: false,
    };
  }

  // 2. 弹反判定（仅物理攻击有效）
  const isPhysical = !skill || skill.type === "physical";
  if (checkParry(defender, isPhysical)) {
    return {
      damage: 0,
      isCrit: false,
      isDodged: false,
      isParried: true,
      isCountered: true,
    };
  }

  // 3. 致盲判定
  if (checkBlindMiss(attacker, rng)) {
    return {
      damage: 0,
      isCrit: false,
      isDodged: true,
      isParried: false,
      isCountered: false,
    };
  }

  // 4. 闪避概率判定
  if (checkEvasion(attacker, defender, rng)) {
    return {
      damage: 0,
      isCrit: false,
      isDodged: true,
      isParried: false,
      isCountered: false,
    };
  }

  // 5. 伤害值计算 + 暴击判定
  const rawDamage = calculateRawDamage(attacker, defender, skill);
  const { damage, isCrit } = tryCrit(rawDamage, attacker, rng);

  return {
    damage,
    isCrit,
    isDodged: false,
    isParried: false,
    isCountered: false,
  };
}
