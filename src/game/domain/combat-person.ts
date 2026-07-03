import { ITEMS } from "../../data/items";
import { SKILLS, type SkillConfig } from "../../data/skills";
import { calcPanelStats, gainExp } from "./player";
import type {
  CombatLogEntry,
  CombatParticipant,
  PersonCombatState,
  World,
} from "./types";
import { DomainError } from "./types";

// ============================================================
// 人物回合制战斗领域逻辑 — 纯函数
// ============================================================

/**
 * 初始化人物战斗状态
 */
export function initPersonCombat(
  world: World,
  difficulty: number,
): PersonCombatState {
  const stats = calcPanelStats(world.player, world.fleet.inventory);

  const playerPart: CombatParticipant = {
    id: "player",
    name: world.player.name || "船长",
    type: "player",
    hp: stats.hp,
    maxHp: stats.hp,
    mp: stats.mp,
    maxMp: stats.mp,
    atk: stats.atk,
    def: stats.def,
    mag: stats.mag,
    mdf: stats.mdf,
    spd: stats.spd,
    luk: stats.luk,
    level: world.player.level,
    weaponId: world.player.equipment.weapon
      ? world.fleet.inventory.find(
          (i) => i.uid === world.player.equipment.weapon,
        )?.itemId || null
      : null,
    statuses: [],
    isDodging: false,
    isParrying: false,
  };

  const participants: CombatParticipant[] = [playerPart];

  // 根据难度生成敌人 (1 - 3 个)
  const enemyLevel = Math.max(1, Math.round(difficulty * 2));
  if (difficulty < 1.5) {
    // 简单：1个海盗水手
    participants.push({
      id: "enemy-1",
      name: "海盗水手",
      type: "enemy",
      hp: 40 + enemyLevel * 8,
      maxHp: 40 + enemyLevel * 8,
      mp: 20,
      maxMp: 20,
      atk: 8 + enemyLevel * 1.2,
      def: 4 + enemyLevel * 0.8,
      mag: 3,
      mdf: 3 + enemyLevel * 0.5,
      spd: 7 + enemyLevel * 0.6,
      luk: 3 + enemyLevel * 0.4,
      level: enemyLevel,
      weaponId: "rusted_sword",
      statuses: [],
      isDodging: false,
      isParrying: false,
    });
  } else if (difficulty < 3.0) {
    // 中等：1个海盗水手 + 1个海盗火枪手
    participants.push(
      {
        id: "enemy-1",
        name: "海盗水手",
        type: "enemy",
        hp: 45 + enemyLevel * 8,
        maxHp: 45 + enemyLevel * 8,
        mp: 20,
        maxMp: 20,
        atk: 9 + enemyLevel * 1.2,
        def: 5 + enemyLevel * 0.8,
        mag: 3,
        mdf: 4 + enemyLevel * 0.5,
        spd: 8 + enemyLevel * 0.6,
        luk: 4 + enemyLevel * 0.4,
        level: enemyLevel,
        weaponId: "rusted_sword",
        statuses: [],
        isDodging: false,
        isParrying: false,
      },
      {
        id: "enemy-2",
        name: "海盗火枪手",
        type: "enemy",
        hp: 35 + enemyLevel * 6,
        maxHp: 35 + enemyLevel * 6,
        mp: 25,
        maxMp: 25,
        atk: 12 + enemyLevel * 1.5,
        def: 3 + enemyLevel * 0.6,
        mag: 4,
        mdf: 4 + enemyLevel * 0.6,
        spd: 10 + enemyLevel * 0.8,
        luk: 5 + enemyLevel * 0.5,
        level: enemyLevel,
        weaponId: "pirate_cutlass",
        statuses: [],
        isDodging: false,
        isParrying: false,
      },
    );
  } else {
    // 困难：1个海盗船长 + 1个海盗水手 + 1个海盗火枪手
    participants.push(
      {
        id: "enemy-1",
        name: "海盗船长",
        type: "enemy",
        hp: 70 + enemyLevel * 12,
        maxHp: 70 + enemyLevel * 12,
        mp: 30,
        maxMp: 30,
        atk: 15 + enemyLevel * 2.0,
        def: 8 + enemyLevel * 1.2,
        mag: 6,
        mdf: 7 + enemyLevel * 1.0,
        spd: 11 + enemyLevel * 0.8,
        luk: 8 + enemyLevel * 0.6,
        level: enemyLevel + 2,
        weaponId: "pirate_cutlass",
        statuses: [],
        isDodging: false,
        isParrying: false,
      },
      {
        id: "enemy-2",
        name: "海盗水手",
        type: "enemy",
        hp: 45 + enemyLevel * 8,
        maxHp: 45 + enemyLevel * 8,
        mp: 20,
        maxMp: 20,
        atk: 9 + enemyLevel * 1.2,
        def: 5 + enemyLevel * 0.8,
        mag: 3,
        mdf: 4 + enemyLevel * 0.5,
        spd: 8 + enemyLevel * 0.6,
        luk: 4 + enemyLevel * 0.4,
        level: enemyLevel,
        weaponId: "rusted_sword",
        statuses: [],
        isDodging: false,
        isParrying: false,
      },
      {
        id: "enemy-3",
        name: "海盗火枪手",
        type: "enemy",
        hp: 35 + enemyLevel * 6,
        maxHp: 35 + enemyLevel * 6,
        mp: 25,
        maxMp: 25,
        atk: 12 + enemyLevel * 1.5,
        def: 3 + enemyLevel * 0.6,
        mag: 4,
        mdf: 4 + enemyLevel * 0.6,
        spd: 10 + enemyLevel * 0.8,
        luk: 5 + enemyLevel * 0.5,
        level: enemyLevel,
        weaponId: "pirate_cutlass",
        statuses: [],
        isDodging: false,
        isParrying: false,
      },
    );
  }

  const turnOrder = calcInitiative(participants);

  return {
    participants,
    currentTurnIndex: 0,
    turnOrder,
    round: 1,
    logs: [{ round: 1, turnIndex: 0, message: "接舷战开始！海盗登船了！" }],
    status: "in_progress",
  };
}

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

/**
 * 计算单次伤害（含属性补正、暴击、闪避/弹反判定）
 */
export function calcPersonDamage(
  attacker: CombatParticipant,
  defender: CombatParticipant,
  skill: SkillConfig | null,
  rng: () => number = Math.random,
): {
  damage: number;
  isCrit: boolean;
  isDodged: boolean;
  isParried: boolean;
  isCountered: boolean;
} {
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
  if (defender.isParrying && isPhysical) {
    return {
      damage: 0,
      isCrit: false,
      isDodged: false,
      isParried: true,
      isCountered: true,
    };
  }

  // 3. 致盲判定（命中率减半）
  const hasBlind = attacker.statuses.some((s) => s.type === "blind");
  if (hasBlind && rng() < 0.5) {
    return {
      damage: 0,
      isCrit: false,
      isDodged: true,
      isParried: false,
      isCountered: false,
    };
  }

  // 4. 闪避概率判定（基于速度差和幸运值）
  const hasFrozenOrSleep = defender.statuses.some(
    (s) => s.type === "freeze" || s.type === "sleep",
  );
  if (!hasFrozenOrSleep) {
    const baseEvasion = 0.05;
    const spdDiffBonus = Math.max(0, (defender.spd - attacker.spd) * 0.01);
    const lukBonus = defender.luk * 0.005;
    const evasionChance = Math.min(0.3, baseEvasion + spdDiffBonus + lukBonus);
    if (rng() < evasionChance) {
      return {
        damage: 0,
        isCrit: false,
        isDodged: true,
        isParried: false,
        isCountered: false,
      };
    }
  }

  // 5. 伤害值计算
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

  let damage = Math.max(1, Math.round(baseDamage - defense));

  // 6. 暴击判定
  const critChance = Math.min(0.5, attacker.luk * 0.01);
  const isCrit = rng() < critChance;
  if (isCrit) {
    damage = Math.floor(damage * 1.5);
  }

  return {
    damage,
    isCrit,
    isDodged: false,
    isParried: false,
    isCountered: false,
  };
}

/**
 * 玩家执行战斗操作
 */
export function executePersonCombatAction(
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

  // 执行玩家动作，更新 combat 状态
  let nextCombat = processParticipantTurn(combat, "player", action, rng);
  // 持续推进回合，直到再次轮到玩家，或者战斗结束
  while (nextCombat.status === "in_progress") {
    const nextTurnId = nextCombat.turnOrder[nextCombat.currentTurnIndex];
    if (nextTurnId === "player") {
      // 轮到玩家，且玩家需要行动，暂停并等待输入
      // 注意：玩家可能因为控制状态（如冰冻、睡眠）导致在处理回合时被自动跳过。
      // 所以我们先执行 player 的自动回合阶段（扣毒伤、结算控制）。
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
          {
            type: "attack",
          },
          rng,
        );
        continue;
      }
      break;
    }

    // 敌人 AI 行动
    nextCombat = processEnemyTurn(nextCombat, nextTurnId, rng);
  }

  // 检查战斗结局并更新世界
  return applyCombatResultToWorld(world, nextCombat);
}

/**
 * 推进或结束战斗，应用到世界
 */
function applyCombatResultToWorld(
  world: World,
  nextCombat: PersonCombatState,
): World {
  if (nextCombat.status === "victory") {
    // 胜利：清空 combat，获得经验奖励并继续航程
    let result: World = {
      ...world,
      combat: null,
    };
    result = gainExp(result, 50); // 人物战斗胜利获得 50 EXP
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
  } else if (nextCombat.status === "defeat") {
    // 失败：扣除金币与全部货物，遣返最近港口，清空航海与战斗状态
    const nearestPort = world.voyage?.fromPortId || world.player.currentPortId;

    // 扣除 30% 金币
    const goldLost = Math.floor(world.fleet.gold * 0.3);

    // 清空所有船只的货物
    const clearShipsCargo = world.fleet.ships.map((s) => ({
      ...s,
      cargo: [],
    }));

    return {
      ...world,
      player: {
        ...world.player,
        currentPortId: nearestPort,
      },
      fleet: {
        ...world.fleet,
        gold: Math.max(0, world.fleet.gold - goldLost),
        ships: clearShipsCargo,
      },
      voyage: null,
      combat: null,
    };
  }

  // 战斗进行中，只保存 combat 状态
  return {
    ...world,
    combat: nextCombat,
  };
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

  // 敌人 AI 逻辑：
  // 1. 如果血量低于 40%，且持有治疗技能并有足够 MP，则有 50% 概率治疗自己。
  // 2. 否则，如果 MP 足够，有 30% 几率使用技能，70% 几率使用普攻。
  // 3. 目标始终是玩家。
  const hpRatio = enemy.hp / enemy.maxHp;
  let action: { type: "attack" | "skill"; skillId?: string; targetId: string } =
    {
      type: "attack",
      targetId: "player",
    };

  const weaponConfig = enemy.weaponId
    ? ITEMS.find((i) => i.id === enemy.weaponId)
    : null;
  const availableSkills = weaponConfig?.skills
    ? weaponConfig.skills
        .filter((s) => enemy.level >= s.levelRequired)
        .map((s) => SKILLS.find((sk) => sk.id === s.skillId))
        .filter((sk): sk is SkillConfig => sk !== undefined)
    : [];

  if (hpRatio < 0.4 && rng() < 0.5) {
    const healSkill = availableSkills.find((s) => s.type === "heal");
    if (healSkill && enemy.mp >= healSkill.mpCost) {
      action = { type: "skill", skillId: healSkill.id, targetId: enemyId };
    }
  } else if (availableSkills.length > 0 && rng() < 0.3) {
    const dmgSkills = availableSkills.filter((s) => s.type !== "heal");
    if (dmgSkills.length > 0) {
      const selectedSkill = dmgSkills[Math.floor(rng() * dmgSkills.length)];
      if (enemy.mp >= selectedSkill.mpCost) {
        action = {
          type: "skill",
          skillId: selectedSkill.id,
          targetId: "player",
        };
      }
    }
  }

  return processParticipantTurn(combat, enemyId, action, rng);
}

// ============================================================
// 工具函数
// ============================================================

/** 更新 participants 列表中指定 ID 的参与者 */
function updateParticipant(
  participants: readonly CombatParticipant[],
  id: string,
  updated: CombatParticipant,
): readonly CombatParticipant[] {
  return participants.map((p) => (p.id === id ? updated : p));
}

/** 同时更新 participants 列表中两个参与者 */
function updateTwoParticipants(
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

// ============================================================
// 状态阶段处理
// ============================================================

interface StatusPhaseResult {
  readonly part: CombatParticipant;
  readonly logs: readonly CombatLogEntry[];
  readonly dotKilled: boolean;
  readonly isBlocked: boolean;
}

const DOT_CONFIGS = [
  { type: "poison", rate: 0.08, label: "中毒" },
  { type: "bleed", rate: 0.12, label: "出血" },
  { type: "burn", rate: 0.1, label: "燃烧" },
] as const;

/**
 * 处理回合开始阶段：
 * 1. 状态持续递减，移除过期状态
 * 2. 结算 DOT 伤害（中毒/出血/燃烧）
 * 3. 检查控制状态（冰冻/睡眠）
 */
function processStatusPhase(
  part: CombatParticipant,
  round: number,
  turnIndex: number,
): StatusPhaseResult {
  const logs: CombatLogEntry[] = [];

  // 1. 降低所有状态持续时间 1 回合，过滤掉已过期的状态
  const activeStatuses = part.statuses.map((s) => ({
    ...s,
    duration: s.duration - 1,
  }));
  const expiredStatuses = part.statuses.filter(
    (_, idx) => activeStatuses[idx].duration <= 0,
  );
  const remainingStatuses = activeStatuses.filter((s) => s.duration > 0);

  for (const exp of expiredStatuses) {
    logs.push({
      round,
      turnIndex,
      message: `${part.name} 的【${getStatusLabel(exp.type)}】状态消退了。`,
    });
  }

  let updatedPart: CombatParticipant = {
    ...part,
    statuses: remainingStatuses,
    isDodging: false,
    isParrying: false,
  };

  // 2. 状态异常伤害结算（只在状态依然存活时触发，刚过期的状态不触发）
  let dotDamage = 0;
  const dotParts: string[] = [];

  for (const dot of DOT_CONFIGS) {
    if (updatedPart.statuses.some((s) => s.type === dot.type)) {
      const dmg = Math.max(1, Math.round(part.maxHp * dot.rate));
      dotDamage += dmg;
      dotParts.push(`【${dot.label}】造成 ${dmg} 点伤害`);
    }
  }

  let dotKilled = false;
  if (dotDamage > 0) {
    const newHp = Math.max(0, updatedPart.hp - dotDamage);
    updatedPart = { ...updatedPart, hp: newHp };
    logs.push({
      round,
      turnIndex,
      message: `${part.name} 因异常状态（${dotParts.join("；")}）受到 ${dotDamage} 点伤害。`,
    });
    if (newHp <= 0) {
      logs.push({ round, turnIndex, message: `${part.name} 倒下了！` });
      dotKilled = true;
    }
  }

  // 3. 控制状态结算（冰冻、睡眠无法行动）
  const isFrozen = updatedPart.statuses.some((s) => s.type === "freeze");
  const isAsleep = updatedPart.statuses.some((s) => s.type === "sleep");
  const isBlocked = isFrozen || isAsleep;

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

  return { part: updatedPart, logs, dotKilled, isBlocked };
}

// ============================================================
// 弹反反击伤害
// ============================================================

/**
 * 被弹反后，防御方发动一次物理反击
 */
function applyCounterDamage(
  defender: CombatParticipant,
  attacker: CombatParticipant,
  rng: () => number,
  round: number,
  turnIndex: number,
): {
  attacker: CombatParticipant;
  logs: readonly CombatLogEntry[];
} {
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

// ============================================================
// 攻击动作执行
// ============================================================

/**
 * 执行普通物理攻击：命中判定、回避、弹反反击、伤害结算
 */
function executeAttackAction(
  attacker: CombatParticipant,
  targetId: string,
  participants: readonly CombatParticipant[],
  rng: () => number,
  round: number,
  turnIndex: number,
): {
  participants: readonly CombatParticipant[];
  logs: readonly CombatLogEntry[];
} {
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

  // 受到伤害解除睡眠
  const wasAsleep = target.statuses.some((s) => s.type === "sleep");
  if (wasAsleep) {
    updatedTarget = {
      ...updatedTarget,
      statuses: updatedTarget.statuses.filter((s) => s.type !== "sleep"),
    };
  }

  const critMsg = outcome.isCrit ? "（暴击！）" : "";
  const sleepMsg = wasAsleep ? `，并把 ${target.name} 从梦中痛醒！` : "。";
  logs.push({
    round,
    turnIndex,
    message: `${attacker.name} 对 ${target.name} 发起普攻，造成 ${dmg} 点伤害${critMsg}${sleepMsg}`,
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

// ============================================================
// 技能动作执行
// ============================================================

/**
 * 执行技能动作：沉默检查、MP 校验、治疗/伤害分发、状态效果施加
 */
function executeSkillAction(
  caster: CombatParticipant,
  targetId: string | undefined,
  skillId: string,
  participants: readonly CombatParticipant[],
  rng: () => number,
  round: number,
  turnIndex: number,
): {
  participants: readonly CombatParticipant[];
  logs: readonly CombatLogEntry[];
} {
  const logs: CombatLogEntry[] = [];
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
    // 治疗技能
    const healTarget = participants.find((p) => p.id === targetId) || caster;
    if (healTarget.hp <= 0) {
      logs.push({
        round,
        turnIndex,
        message: `${caster.name} 试图对已倒下的目标施放【${skill.name}】，施法失败。`,
      });
      return { participants: casterUpdated, logs };
    }
    const healAmt = Math.round(caster.mag * skill.power);
    const updatedTarget: CombatParticipant = {
      ...healTarget,
      hp: Math.min(healTarget.maxHp, healTarget.hp + healAmt),
    };
    logs.push({
      round,
      turnIndex,
      message: `${caster.name} 施放【${skill.name}】，为 ${healTarget.name} 回复了 ${healAmt} 点生命。`,
    });

    // 自愈：同时应用 MP 消耗与 HP 恢复
    if (caster.id === healTarget.id) {
      const merged: CombatParticipant = {
        ...updatedCaster,
        hp: updatedTarget.hp,
      };
      return {
        participants: updateParticipant(participants, caster.id, merged),
        logs,
      };
    }

    return {
      participants: updateTwoParticipants(
        participants,
        caster.id,
        updatedCaster,
        healTarget.id,
        updatedTarget,
      ),
      logs,
    };
  }

  // 伤害性技能
  const target = participants.find((p) => p.id === targetId);
  if (!target || target.hp <= 0) {
    logs.push({
      round,
      turnIndex,
      message: `${caster.name} 试图使用技能【${skill.name}】，但目标已倒下。`,
    });
    return { participants: casterUpdated, logs };
  }

  const outcome = calcPersonDamage(caster, target, skill, rng);

  if (outcome.isDodged) {
    logs.push({
      round,
      turnIndex,
      message: `${caster.name} 施放【${skill.name}】，但被 ${target.name} 回避了！`,
    });
    return { participants: casterUpdated, logs };
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

  // 受到伤害解除睡眠
  const wasAsleep = target.statuses.some((s) => s.type === "sleep");
  if (wasAsleep) {
    updatedTarget = {
      ...updatedTarget,
      statuses: updatedTarget.statuses.filter((s) => s.type !== "sleep"),
    };
  }

  const critMsg = outcome.isCrit ? "（暴击！）" : "";
  const sleepMsg = wasAsleep ? `，并把 ${target.name} 从梦中痛醒！` : "。";
  logs.push({
    round,
    turnIndex,
    message: `${caster.name} 施放【${skill.name}】命中 ${target.name}，造成 ${dmg} 点伤害${critMsg}${sleepMsg}`,
  });

  if (updatedTarget.hp <= 0) {
    logs.push({ round, turnIndex, message: `${target.name} 倒下了！` });
  } else if (skill.statusEffect && rng() < skill.statusEffect.chance) {
    // 施加状态效果
    const otherStatuses = updatedTarget.statuses.filter(
      (s) => s.type !== skill.statusEffect!.type,
    );
    updatedTarget = {
      ...updatedTarget,
      statuses: [
        ...otherStatuses,
        {
          type: skill.statusEffect.type,
          duration: skill.statusEffect.duration,
        },
      ],
    };
    logs.push({
      round,
      turnIndex,
      message: `${target.name} 陷入了【${getStatusLabel(skill.statusEffect.type)}】状态（持续 ${skill.statusEffect.duration} 回合）！`,
    });
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

  switch (action.type) {
    case "dodge": {
      if (activePart.mp < 5) throw new DomainError("INSUFFICIENT_MP");
      const updated = { ...activePart, mp: activePart.mp - 5, isDodging: true };
      participants = updateParticipant(participants, partId, updated);
      logs.push({
        round: combat.round,
        turnIndex: combat.currentTurnIndex,
        message: `${activePart.name} 消耗 5 MP 摆出了【回避】姿态，将免疫下一轮的攻击。`,
      });
      break;
    }
    case "parry": {
      if (activePart.mp < 8) throw new DomainError("INSUFFICIENT_MP");
      const updated = {
        ...activePart,
        mp: activePart.mp - 8,
        isParrying: true,
      };
      participants = updateParticipant(participants, partId, updated);
      logs.push({
        round: combat.round,
        turnIndex: combat.currentTurnIndex,
        message: `${activePart.name} 消耗 8 MP 摆出了【弹反】姿态，准备反击物理攻击。`,
      });
      break;
    }
    case "attack": {
      if (!targetId) break;
      const result = executeAttackAction(
        activePart,
        targetId,
        participants,
        rng,
        combat.round,
        combat.currentTurnIndex,
      );
      participants = result.participants;
      logs.push(...result.logs);
      break;
    }
    case "skill": {
      const result = executeSkillAction(
        activePart,
        targetId,
        action.skillId!,
        participants,
        rng,
        combat.round,
        combat.currentTurnIndex,
      );
      participants = result.participants;
      logs.push(...result.logs);
      break;
    }
  }

  return checkCombatEnd(
    advanceTurn({
      ...combat,
      participants,
      logs: [...combat.logs, ...statusResult.logs, ...logs],
    }),
  );
}

/**
 * 推进到下一位行动的角色，进入下一回合（或新轮次）
 */
function advanceTurn(combat: PersonCombatState): PersonCombatState {
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
function checkCombatEnd(combat: PersonCombatState): PersonCombatState {
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

function getStatusLabel(type: string): string {
  return (
    {
      poison: "中毒",
      bleed: "出血",
      burn: "燃烧",
      freeze: "冰冻",
      sleep: "睡眠",
      silence: "沉默",
      blind: "暗闇",
    }[type] || type
  );
}
