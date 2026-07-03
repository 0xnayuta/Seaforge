// ============================================================
// 人物战斗 — 动作执行（攻击 / 技能 / 弹反反击）
// ============================================================

import { SKILLS, type SkillConfig } from "../../data/skills";
import {
  calcPersonDamage,
  type DamageResult,
  getStatusLabel,
} from "./combat-person-damage";
import {
  updateParticipant,
  updateTwoParticipants,
} from "./combat-person-utils";
import type { CombatLogEntry, CombatParticipant } from "./types";
import { DomainError } from "./types";

// ---- 参数类型 ----

export interface AttackActionParams {
  readonly attacker: CombatParticipant;
  readonly targetId: string;
  readonly participants: readonly CombatParticipant[];
  readonly rng: () => number;
  readonly round: number;
  readonly turnIndex: number;
}

export interface SkillActionParams {
  readonly caster: CombatParticipant;
  readonly targetId: string | undefined;
  readonly skillId: string;
  readonly participants: readonly CombatParticipant[];
  readonly rng: () => number;
  readonly round: number;
  readonly turnIndex: number;
}

export interface ActionOutcome {
  readonly participants: readonly CombatParticipant[];
  readonly logs: readonly CombatLogEntry[];
}

// ---- 弹反反击 ----

/**
 * 被弹反后，防御方发动一次物理反击
 */
export function applyCounterDamage(
  defender: CombatParticipant,
  attacker: CombatParticipant,
  rng: () => number,
  round: number,
  turnIndex: number,
): { attacker: CombatParticipant; logs: readonly CombatLogEntry[] } {
  const counterOutcome = calcPersonDamage(defender, attacker, null, rng);
  const dmg = counterOutcome.damage;
  const updatedAttacker: CombatParticipant = {
    ...attacker,
    hp: Math.max(0, attacker.hp - dmg),
  };
  const logs: CombatLogEntry[] = [
    {
      round,
      turnIndex,
      message: `${defender.name} 发起弹反反击，对 ${attacker.name} 造成 ${dmg} 点伤害！`,
    },
  ];
  if (updatedAttacker.hp <= 0) {
    logs.push({ round, turnIndex, message: `${attacker.name} 倒下了！` });
  }
  return { attacker: updatedAttacker, logs };
}

// ---- 伤害命中后处理 ----

/** 受到伤害后解除睡眠状态 */
function wakeIfAsleep(target: CombatParticipant): CombatParticipant {
  if (target.statuses.some((s) => s.type === "sleep")) {
    return {
      ...target,
      statuses: target.statuses.filter((s) => s.type !== "sleep"),
    };
  }
  return target;
}

/** 构建伤害命中日志消息 */
function buildHitMessage(
  attackerName: string,
  targetName: string,
  dmg: number,
  outcome: DamageResult,
  wasAsleep: boolean,
): string {
  const critMsg = outcome.isCrit ? "（暴击！）" : "";
  const sleepMsg = wasAsleep ? `，并把 ${targetName} 从梦中痛醒！` : "。";
  return `${attackerName} 对 ${targetName} 发起普攻，造成 ${dmg} 点伤害${critMsg}${sleepMsg}`;
}

/** 构建技能命中日志消息 */
function buildSkillHitMessage(
  casterName: string,
  skillName: string,
  targetName: string,
  dmg: number,
  outcome: DamageResult,
  wasAsleep: boolean,
): string {
  const critMsg = outcome.isCrit ? "（暴击！）" : "";
  const sleepMsg = wasAsleep ? `，并把 ${targetName} 从梦中痛醒！` : "。";
  return `${casterName} 施放【${skillName}】命中 ${targetName}，造成 ${dmg} 点伤害${critMsg}${sleepMsg}`;
}

// ---- 普通攻击 ----

/**
 * 执行普通物理攻击：命中判定、回避、弹反反击、伤害结算
 */
export function executeAttackAction(params: AttackActionParams): ActionOutcome {
  const { attacker, targetId, participants, rng, round, turnIndex } = params;
  const logs: CombatLogEntry[] = [];
  const target = participants.find((p) => p.id === targetId);

  if (!target || target.hp <= 0) {
    logs.push({
      round,
      turnIndex,
      message: `${attacker.name} 的普攻目标已倒下。`,
    });
    return { participants, logs };
  }

  const outcome = calcPersonDamage(attacker, target, null, rng);

  if (outcome.isDodged) {
    logs.push({
      round,
      turnIndex,
      message: `${attacker.name} 发起普攻，但被 ${target.name} 回避了！`,
    });
    return { participants, logs };
  }

  if (outcome.isParried) {
    logs.push({
      round,
      turnIndex,
      message: `${attacker.name} 发起普攻，但被 ${target.name} 成功弹反！`,
    });
    const { attacker: counterAttacker, logs: counterLogs } = applyCounterDamage(
      target,
      attacker,
      rng,
      round,
      turnIndex,
    );
    return {
      participants: updateTwoParticipants(
        participants,
        attacker.id,
        counterAttacker,
        target.id,
        target,
      ),
      logs: [...logs, ...counterLogs],
    };
  }

  // 命中
  const dmg = outcome.damage;
  let updatedTarget: CombatParticipant = {
    ...target,
    hp: Math.max(0, target.hp - dmg),
  };

  const wasAsleep = target.statuses.some((s) => s.type === "sleep");
  updatedTarget = wakeIfAsleep(updatedTarget);

  logs.push({
    round,
    turnIndex,
    message: buildHitMessage(
      attacker.name,
      target.name,
      dmg,
      outcome,
      wasAsleep,
    ),
  });

  if (updatedTarget.hp <= 0) {
    logs.push({ round, turnIndex, message: `${target.name} 倒下了！` });
  }

  return {
    participants: updateTwoParticipants(
      participants,
      attacker.id,
      attacker,
      target.id,
      updatedTarget,
    ),
    logs,
  };
}

// ---- 技能动作 ----

/** 应用治疗技能效果 */
function applyHealSkill(
  updatedCaster: CombatParticipant,
  targetId: string | undefined,
  skill: SkillConfig,
  participants: readonly CombatParticipant[],
  round: number,
  turnIndex: number,
): ActionOutcome {
  const logs: CombatLogEntry[] = [];
  const healTarget =
    participants.find((p) => p.id === targetId) || updatedCaster;
  if (healTarget.hp <= 0) {
    logs.push({
      round,
      turnIndex,
      message: `${updatedCaster.name} 试图对已倒下的目标施放【${skill.name}】，施法失败。`,
    });
    return { participants, logs };
  }

  const healAmt = Math.round(updatedCaster.mag * skill.power);
  const updatedTarget: CombatParticipant = {
    ...healTarget,
    hp: Math.min(healTarget.maxHp, healTarget.hp + healAmt),
  };
  logs.push({
    round,
    turnIndex,
    message: `${updatedCaster.name} 施放【${skill.name}】，为 ${healTarget.name} 回复了 ${healAmt} 点生命。`,
  });

  // 自愈：同时应用 MP 消耗与 HP 恢复
  if (updatedCaster.id === healTarget.id) {
    const merged: CombatParticipant = {
      ...updatedCaster,
      hp: updatedTarget.hp,
    };
    return {
      participants: updateParticipant(participants, updatedCaster.id, merged),
      logs,
    };
  }

  return {
    participants: updateTwoParticipants(
      participants,
      updatedCaster.id,
      updatedCaster,
      healTarget.id,
      updatedTarget,
    ),
    logs,
  };
}

/** 应用状态效果 */
function applyStatusEffectToTarget(
  target: CombatParticipant,
  skill: SkillConfig,
  rng: () => number,
): { target: CombatParticipant; applied: boolean } {
  if (!skill.statusEffect || rng() >= skill.statusEffect.chance) {
    return { target, applied: false };
  }

  const otherStatuses = target.statuses.filter(
    (s) => s.type !== skill.statusEffect!.type,
  );
  return {
    target: {
      ...target,
      statuses: [
        ...otherStatuses,
        {
          type: skill.statusEffect.type,
          duration: skill.statusEffect.duration,
        },
      ],
    },
    applied: true,
  };
}

/** 应用伤害性技能效果（处理弹反、命中、状态效果） */
function applyDamageSkill(
  caster: CombatParticipant,
  updatedCaster: CombatParticipant,
  targetId: string | undefined,
  skill: SkillConfig,
  participants: readonly CombatParticipant[],
  rng: () => number,
  round: number,
  turnIndex: number,
): ActionOutcome {
  const logs: CombatLogEntry[] = [];
  const target = participants.find((p) => p.id === targetId);

  if (!target || target.hp <= 0) {
    logs.push({
      round,
      turnIndex,
      message: `${caster.name} 试图使用技能【${skill.name}】，但目标已倒下。`,
    });
    return { participants, logs };
  }

  const outcome = calcPersonDamage(caster, target, skill, rng);

  if (outcome.isDodged) {
    logs.push({
      round,
      turnIndex,
      message: `${caster.name} 施放【${skill.name}】，但被 ${target.name} 回避了！`,
    });
    return { participants: participants, logs };
  }

  if (outcome.isParried) {
    logs.push({
      round,
      turnIndex,
      message: `${caster.name} 施放【${skill.name}】，但被 ${target.name} 成功弹反！`,
    });
    const { attacker: counterAttacker, logs: counterLogs } = applyCounterDamage(
      target,
      updatedCaster,
      rng,
      round,
      turnIndex,
    );
    return {
      participants: updateTwoParticipants(
        participants,
        counterAttacker.id,
        counterAttacker,
        target.id,
        target,
      ),
      logs: [...logs, ...counterLogs],
    };
  }

  // 命中
  const dmg = outcome.damage;
  let updatedTarget: CombatParticipant = {
    ...target,
    hp: Math.max(0, target.hp - dmg),
  };

  const wasAsleep = target.statuses.some((s) => s.type === "sleep");
  updatedTarget = wakeIfAsleep(updatedTarget);

  logs.push({
    round,
    turnIndex,
    message: buildSkillHitMessage(
      caster.name,
      skill.name,
      target.name,
      dmg,
      outcome,
      wasAsleep,
    ),
  });

  if (updatedTarget.hp <= 0) {
    logs.push({ round, turnIndex, message: `${target.name} 倒下了！` });
  } else {
    // 施加状态效果
    const { target: statusAppliedTarget, applied } = applyStatusEffectToTarget(
      updatedTarget,
      skill,
      rng,
    );
    if (applied) {
      updatedTarget = statusAppliedTarget;
      logs.push({
        round,
        turnIndex,
        message: `${target.name} 陷入了【${getStatusLabel(skill.statusEffect!.type)}】状态（持续 ${skill.statusEffect!.duration} 回合）！`,
      });
    }
  }

  return {
    participants: updateTwoParticipants(
      participants,
      caster.id,
      updatedCaster,
      target.id,
      updatedTarget,
    ),
    logs,
  };
}

/**
 * 执行技能动作：沉默检查、MP 校验、治疗/伤害分发、状态效果施加
 */
export function executeSkillAction(params: SkillActionParams): ActionOutcome {
  const { caster, targetId, skillId, participants, rng, round, turnIndex } =
    params;
  const skill = SKILLS.find((s) => s.id === skillId);
  if (!skill) throw new DomainError("INVALID_COMBAT_ACTION");

  // 沉默检查：沉默状态下无法使用魔法类技能
  if (
    caster.statuses.some((s) => s.type === "silence") &&
    skill.type === "magical"
  ) {
    throw new DomainError("SILENCED");
  }

  if (caster.mp < skill.mpCost) throw new DomainError("INSUFFICIENT_MP");

  const updatedCaster: CombatParticipant = {
    ...caster,
    mp: caster.mp - skill.mpCost,
  };
  const casterUpdated = updateParticipant(
    participants,
    caster.id,
    updatedCaster,
  );

  if (skill.type === "heal") {
    return applyHealSkill(
      updatedCaster,
      targetId,
      skill,
      casterUpdated,
      round,
      turnIndex,
    );
  }

  return applyDamageSkill(
    caster,
    updatedCaster,
    targetId,
    skill,
    participants,
    rng,
    round,
    turnIndex,
  );
}
