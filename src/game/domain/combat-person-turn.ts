// ============================================================
// 人物战斗 — 回合编排 & 战斗结果应用
// ============================================================

import { ITEMS } from "../../data/items";
import { SKILLS } from "../../data/skills";
import {
  type ActionOutcome,
  performAttack,
  performSkill,
} from "./combat-person-actions";
import { processStatusPhase } from "./combat-person-status";
import {
  advanceTurn,
  checkCombatEnd,
  updateParticipant,
} from "./combat-person-utils";
import { gainExp } from "./player";
import { incrementBountyProgress } from "./quest";
import type {
  CombatLogEntry,
  CombatParticipant,
  PersonCombatState,
  World,
} from "./types";
import { DomainError } from "./types";

// ============================================================
// 敌人 AI
// ============================================================
interface AiDecision {
  readonly type: "attack" | "skill";
  readonly skillId?: string;
  readonly targetId: string;
}

/** 获取敌人可用技能列表 */
function getEnemySkills(
  enemy: CombatParticipant,
): ReadonlyArray<{ id: string; type: string; mpCost: number }> {
  const weaponConfig = enemy.weaponId
    ? ITEMS.find((i) => i.id === enemy.weaponId)
    : null;
  if (!weaponConfig?.skills) return [];

  return weaponConfig.skills
    .filter((s) => enemy.level >= s.levelRequired)
    .map((s) => SKILLS.find((sk) => sk.id === s.skillId))
    .filter((sk): sk is NonNullable<typeof sk> => sk != null);
}

/** 敌人 AI 动作选择逻辑 */
function decideEnemyAction(
  enemy: CombatParticipant,
  availableSkills: ReadonlyArray<{ id: string; type: string; mpCost: number }>,
  healSkill: { id: string; mpCost: number } | undefined,
  hpRatio: number,
  rng: () => number,
): AiDecision {
  if (hpRatio < 0.4 && rng() < 0.5) {
    if (healSkill && enemy.mp >= healSkill.mpCost) {
      return { type: "skill", skillId: healSkill.id, targetId: enemy.id };
    }
  } else if (availableSkills.length > 0 && rng() < 0.3) {
    const dmgSkills = availableSkills.filter((s) => s.type !== "heal");
    if (dmgSkills.length > 0) {
      const selectedSkill = dmgSkills[Math.floor(rng() * dmgSkills.length)];
      if (enemy.mp >= selectedSkill.mpCost) {
        return {
          type: "skill",
          skillId: selectedSkill.id,
          targetId: "player",
        };
      }
    }
  }

  return { type: "attack", targetId: "player" };
}

/**
 * 敌人 AI 执行回合
 */
function processEnemyTurn(
  combat: PersonCombatState,
  enemyId: string,
  rng: () => number = Math.random,
): PersonCombatState {
  const enemy = combat.participants.find((p) => p.id === enemyId);
  if (!enemy || enemy.hp <= 0) {
    return advanceTurn(combat);
  }

  const hpRatio = enemy.hp / enemy.maxHp;
  const availableSkills = getEnemySkills(enemy);
  const healSkill = availableSkills.find((s) => s.type === "heal");
  const action = decideEnemyAction(
    enemy,
    availableSkills,
    healSkill,
    hpRatio,
    rng,
  );

  return processParticipantTurn(combat, enemyId, action, rng);
}

// ============================================================
// 行动阶段派发
// ============================================================

/** 派发参与者动作（回避/弹反/攻击/技能） */
function resolveParticipantAction(
  activePart: CombatParticipant,
  targetId: string | undefined,
  action: {
    readonly type: "attack" | "skill" | "dodge" | "parry";
    readonly skillId?: string;
  },
  participants: readonly CombatParticipant[],
  rng: () => number,
  combat: PersonCombatState,
  logs: CombatLogEntry[],
): readonly CombatParticipant[] {
  switch (action.type) {
    case "dodge": {
      if (activePart.mp < 5) throw new DomainError("INSUFFICIENT_MP");
      const updated = { ...activePart, mp: activePart.mp - 5, isDodging: true };
      logs.push({
        round: combat.round,
        turnIndex: combat.currentTurnIndex,
        message: `${activePart.name} 消耗 5 MP 摆出了【回避】姿态，将免疫下一轮的攻击。`,
      });
      return updateParticipant(participants, activePart.id, updated);
    }
    case "parry": {
      if (activePart.mp < 8) throw new DomainError("INSUFFICIENT_MP");
      const updated = {
        ...activePart,
        mp: activePart.mp - 8,
        isParrying: true,
      };
      logs.push({
        round: combat.round,
        turnIndex: combat.currentTurnIndex,
        message: `${activePart.name} 消耗 8 MP 摆出了【弹反】姿态，准备反击物理攻击。`,
      });
      return updateParticipant(participants, activePart.id, updated);
    }
    case "attack": {
      if (!targetId) return participants;
      const result: ActionOutcome = performAttack({
        attacker: activePart,
        targetId,
        participants,
        rng,
        round: combat.round,
        turnIndex: combat.currentTurnIndex,
      });
      logs.push(...result.logs);
      return result.participants;
    }
    case "skill": {
      const result: ActionOutcome = performSkill({
        caster: activePart,
        targetId,
        skillId: action.skillId!,
        participants,
        rng,
        round: combat.round,
        turnIndex: combat.currentTurnIndex,
      });
      logs.push(...result.logs);
      return result.participants;
    }
    default:
      return participants;
  }
}

// ============================================================
// 回合处理
// ============================================================

/**
 * 处理单个角色的完整行动回合（含回合开始阶段与行动阶段）
 */
function processParticipantTurn(
  combat: PersonCombatState,
  partId: string,
  action: {
    readonly type: "attack" | "skill" | "dodge" | "parry";
    readonly skillId?: string;
    readonly targetId?: string;
  },
  rng: () => number = Math.random,
): PersonCombatState {
  const part = combat.participants.find((p) => p.id === partId);
  if (!part || part.hp <= 0) return advanceTurn(combat);

  // A. 回合开始阶段 (Status Phase)
  const statusResult = processStatusPhase(
    part,
    combat.round,
    combat.currentTurnIndex,
  );
  let participants = updateParticipant(
    combat.participants,
    partId,
    statusResult.part,
  );

  if (statusResult.dotKilled) {
    return checkCombatEnd(
      advanceTurn({
        ...combat,
        participants,
        logs: [...combat.logs, ...statusResult.logs],
      }),
    );
  }

  if (statusResult.isBlocked) {
    return checkCombatEnd(
      advanceTurn({
        ...combat,
        participants,
        logs: [...combat.logs, ...statusResult.logs],
      }),
    );
  }

  // B. 行动阶段 (Action Phase)
  const logs: CombatLogEntry[] = [];
  const activePart = statusResult.part;
  const targetId =
    action.targetId ||
    (activePart.type === "player"
      ? participants.find((p) => p.type === "enemy" && p.hp > 0)?.id
      : "player");

  if (!targetId && (action.type === "attack" || action.type === "skill")) {
    logs.push({
      round: combat.round,
      turnIndex: combat.currentTurnIndex,
      message: `${activePart.name} 找不到合法的攻击目标！`,
    });
    return checkCombatEnd(
      advanceTurn({
        ...combat,
        participants,
        logs: [...combat.logs, ...statusResult.logs, ...logs],
      }),
    );
  }

  // 派发动作
  participants = resolveParticipantAction(
    activePart,
    targetId,
    action,
    participants,
    rng,
    combat,
    logs,
  );

  return checkCombatEnd(
    advanceTurn({
      ...combat,
      participants,
      logs: [...combat.logs, ...statusResult.logs, ...logs],
    }),
  );
}

// ============================================================
// 战斗结果应用
// ============================================================

/**
 * 推进或结束战斗，应用到世界
 */
function applyCombatResultToWorld(
  world: World,
  nextCombat: PersonCombatState,
): World {
  if (nextCombat.status === "victory") {
    let result: World = { ...world, combat: null };
    result = incrementBountyProgress(gainExp(result, 50));
    if (result.voyage) {
      const filteredEvents = result.voyage.events.filter(
        (ev) => !(ev.day === 0 && ev.type === "combat"),
      );
      result = {
        ...result,
        voyage: {
          ...result.voyage,
          combatSelection: false,
          directBoarding: false,
          events: filteredEvents,
        },
      };
    }
    return result;
  }

  if (nextCombat.status === "defeat") {
    const nearestPort = world.voyage?.fromPortId || world.player.currentPortId;
    const goldLost = Math.floor(world.fleet.gold * 0.3);
    const clearShipsCargo = world.fleet.ships.map((s) => ({ ...s, cargo: [] }));
    return {
      ...world,
      player: { ...world.player, currentPortId: nearestPort },
      fleet: {
        ...world.fleet,
        gold: Math.max(0, world.fleet.gold - goldLost),
        ships: clearShipsCargo,
      },
      voyage: null,
      combat: null,
    };
  }

  return { ...world, combat: nextCombat };
}

// ============================================================
// 公开入口：执行玩家操作
// ============================================================

/**
 * 玩家执行战斗操作
 */
export function performCombatAction(
  world: World,
  action: {
    readonly type: "attack" | "skill" | "dodge" | "parry";
    readonly skillId?: string;
    readonly targetId?: string;
  },
  rng: () => number = Math.random,
): World {
  if (!world.combat) throw new DomainError("NOT_IN_COMBAT");

  const combat = world.combat;
  const currentTurnId = combat.turnOrder[combat.currentTurnIndex];
  if (currentTurnId !== "player") {
    throw new DomainError("NOT_YOUR_TURN");
  }

  const player = combat.participants.find((p) => p.id === "player");
  if (!player || player.hp <= 0) throw new DomainError("NOT_YOUR_TURN");

  let nextCombat = processParticipantTurn(combat, "player", action, rng);

  while (nextCombat.status === "in_progress") {
    const nextTurnId = nextCombat.turnOrder[nextCombat.currentTurnIndex];
    if (nextTurnId === "player") {
      const playerPart = nextCombat.participants.find((p) => p.id === "player");
      if (!playerPart) break;
      if (
        playerPart.statuses.some(
          (s) => s.type === "freeze" || s.type === "sleep",
        )
      ) {
        nextCombat = processParticipantTurn(
          nextCombat,
          "player",
          { type: "attack" },
          rng,
        );
        continue;
      }
      break;
    }
    nextCombat = processEnemyTurn(nextCombat, nextTurnId, rng);
  }

  return applyCombatResultToWorld(world, nextCombat);
}
