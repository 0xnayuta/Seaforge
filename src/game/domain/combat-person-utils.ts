// ============================================================
// 人物战斗 — 通用工具函数
// ============================================================

import type { CombatParticipant, PersonCombatState } from "./types";

/** 更新 participants 列表中指定 ID 的参与者 */
export function updateParticipant(
  participants: readonly CombatParticipant[],
  id: string,
  updated: CombatParticipant,
): readonly CombatParticipant[] {
  return participants.map((p) => (p.id === id ? updated : p));
}

/**
 * 同时更新 participants 列表中两个参与者
 * 使用场景已减少（优先用独立的 updateParticipant 两次调用以保持清晰），
 * 保留供单次不可变穿透用。
 */
export function updateTwoParticipants(
  participants: readonly CombatParticipant[],
  id1: string,
  updated1: CombatParticipant,
  id2: string,
  updated2: CombatParticipant,
): readonly CombatParticipant[] {
  return participants.map((p) => {
    if (p.id === id1) return updated1;
    if (p.id === id2) return updated2;
    return p;
  });
}

/**
 * 推进到下一位行动的角色，进入下一回合（或新轮次）
 */
export function advanceTurn(combat: PersonCombatState): PersonCombatState {
  let nextIndex = combat.currentTurnIndex + 1;
  let nextRound = combat.round;

  if (nextIndex >= combat.turnOrder.length) {
    nextIndex = 0;
    nextRound += 1;
  }

  // 寻找存活的行动角色，若全死或只有一个存活，在 checkCombatEnd 中会判断，这里只负责死循环安全保护
  let attempts = 0;
  while (attempts < combat.turnOrder.length) {
    const nextPartId = combat.turnOrder[nextIndex];
    const nextPart = combat.participants.find((p) => p.id === nextPartId);
    if (nextPart && nextPart.hp > 0) {
      break;
    }
    nextIndex += 1;
    if (nextIndex >= combat.turnOrder.length) {
      nextIndex = 0;
      nextRound += 1;
    }
    attempts += 1;
  }

  return {
    ...combat,
    currentTurnIndex: nextIndex,
    round: nextRound,
  };
}

/**
 * 检查战斗是否结束
 */
export function checkCombatEnd(combat: PersonCombatState): PersonCombatState {
  const player = combat.participants.find((p) => p.id === "player");
  if (!player) return combat;
  const enemies = combat.participants.filter((p) => p.type === "enemy");

  if (player.hp <= 0) {
    return {
      ...combat,
      status: "defeat",
      logs: [
        ...combat.logs,
        {
          round: combat.round,
          turnIndex: combat.currentTurnIndex,
          message: "我方败北……",
        },
      ],
    };
  }

  const allEnemiesDead = enemies.every((e) => e.hp <= 0);
  if (allEnemiesDead) {
    return {
      ...combat,
      status: "victory",
      logs: [
        ...combat.logs,
        {
          round: combat.round,
          turnIndex: combat.currentTurnIndex,
          message: "战斗胜利！击退了全部登船的海盗！",
        },
      ],
    };
  }

  return combat;
}
