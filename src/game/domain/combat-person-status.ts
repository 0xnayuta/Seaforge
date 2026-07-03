// ============================================================
// 人物战斗 — 状态阶段处理
// ============================================================

import { getStatusLabel } from "./combat-person-damage";
import type { CombatLogEntry, CombatParticipant } from "./types";

// ---- 类型定义 ----

export interface StatusPhaseResult {
  readonly part: CombatParticipant;
  readonly logs: readonly CombatLogEntry[];
  readonly dotKilled: boolean;
  readonly isBlocked: boolean;
}

// ---- DOT 配置 ----

const DOT_CONFIGS = [
  { type: "poison", rate: 0.08, label: "中毒" },
  { type: "bleed", rate: 0.12, label: "出血" },
  { type: "burn", rate: 0.1, label: "燃烧" },
] as const;

// ---- 工具函数 ----

/** 将过期的状态记录为日志 */
function logExpiredStatuses(
  part: CombatParticipant,
  remainingDuration: readonly number[],
  round: number,
  turnIndex: number,
): CombatLogEntry[] {
  const logs: CombatLogEntry[] = [];
  part.statuses.forEach((s, idx) => {
    if (remainingDuration[idx] <= 0) {
      logs.push({
        round,
        turnIndex,
        message: `${part.name} 的【${getStatusLabel(s.type)}】状态消退了。`,
      });
    }
  });
  return logs;
}

/** 状态异常伤害结算 */
function applyDotDamage(
  part: CombatParticipant,
  round: number,
  turnIndex: number,
): { part: CombatParticipant; dotKilled: boolean; logs: CombatLogEntry[] } {
  const logs: CombatLogEntry[] = [];
  let dotDamage = 0;
  const dotParts: string[] = [];

  for (const dot of DOT_CONFIGS) {
    if (part.statuses.some((s) => s.type === dot.type)) {
      const dmg = Math.max(1, Math.round(part.maxHp * dot.rate));
      dotDamage += dmg;
      dotParts.push(`【${dot.label}】造成 ${dmg} 点伤害`);
    }
  }

  if (dotDamage === 0) return { part, dotKilled: false, logs };

  const newHp = Math.max(0, part.hp - dotDamage);
  const updated = { ...part, hp: newHp };
  logs.push({
    round,
    turnIndex,
    message: `${part.name} 因异常状态（${dotParts.join("；")}）受到 ${dotDamage} 点伤害。`,
  });

  if (newHp <= 0) {
    logs.push({ round, turnIndex, message: `${part.name} 倒下了！` });
    return { part: updated, dotKilled: true, logs };
  }

  return { part: updated, dotKilled: false, logs };
}

/** 检查控制状态并生成日志 */
function applyControlStatus(
  part: CombatParticipant,
  round: number,
  turnIndex: number,
): { isBlocked: boolean; logs: CombatLogEntry[] } {
  const logs: CombatLogEntry[] = [];
  const isFrozen = part.statuses.some((s) => s.type === "freeze");
  const isAsleep = part.statuses.some((s) => s.type === "sleep");

  if (isFrozen) {
    logs.push({
      round,
      turnIndex,
      message: `${part.name} 处于【冰冻】状态下，全身冻结无法行动！`,
    });
  } else if (isAsleep) {
    logs.push({
      round,
      turnIndex,
      message: `${part.name} 处于【睡眠】中，沉沉睡去无法行动。`,
    });
  }

  return { isBlocked: isFrozen || isAsleep, logs };
}

// ---- 主入口 ----

/**
 * 处理回合开始阶段：
 * 1. 状态持续递减，移除过期状态
 * 2. 结算 DOT 伤害（中毒/出血/燃烧）
 * 3. 检查控制状态（冰冻/睡眠）
 */
export function processStatusPhase(
  part: CombatParticipant,
  round: number,
  turnIndex: number,
): StatusPhaseResult {
  // 1. 降低所有状态持续时间 1 回合，过滤掉已过期的状态
  const activeStatuses = part.statuses.map((s) => ({
    ...s,
    duration: s.duration - 1,
  }));
  const remainingStatuses = activeStatuses.filter((s) => s.duration > 0);

  const expirationLogs = logExpiredStatuses(
    part,
    activeStatuses.map((s) => s.duration),
    round,
    turnIndex,
  );

  let updatedPart: CombatParticipant = {
    ...part,
    statuses: remainingStatuses,
    isDodging: false,
    isParrying: false,
  };

  // 2. 状态异常伤害结算
  const dotResult = applyDotDamage(updatedPart, round, turnIndex);
  updatedPart = dotResult.part;

  // 3. 控制状态结算
  const controlResult = applyControlStatus(updatedPart, round, turnIndex);

  return {
    part: updatedPart,
    logs: [...expirationLogs, ...dotResult.logs, ...controlResult.logs],
    dotKilled: dotResult.dotKilled,
    isBlocked: controlResult.isBlocked,
  };
}
