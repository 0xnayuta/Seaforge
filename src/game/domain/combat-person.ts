// ============================================================
// 人物回合制战斗领域逻辑 — 纯函数
// ============================================================
// 此文件为 barrel 入口，重导出所有公开 API。
// 实现按职责拆分至：
//   combat-person-damage.ts  — 伤害计算 & 行动顺序
//   combat-person-utils.ts   — 通用工具函数
//   combat-person-status.ts  — 状态阶段处理
//   combat-person-actions.ts — 动作执行（攻击/技能/反击）
//   combat-person-turn.ts    — 回合编排 & 战斗结果应用
// ============================================================

import { calcInitiative } from "./combat-person-damage";
import { calcPanelStats } from "./player";
import type { CombatParticipant, PersonCombatState, World } from "./types";

export { calcInitiative, calcPersonDamage } from "./combat-person-damage";
export { performCombatAction } from "./combat-person-turn";

// ---- 敌方模板工厂 ----

interface EnemyTemplate {
  readonly id: string;
  readonly name: string;
  readonly weaponId: string;
  readonly baseStats: {
    readonly hp: number;
    readonly mp: number;
    readonly atk: number;
    readonly def: number;
    readonly mag: number;
    readonly mdf: number;
    readonly spd: number;
    readonly luk: number;
  };
  /** 中/高难度下使用的提升基础属性 */
  readonly mediumBaseStats?: {
    readonly hp: number;
    readonly atk: number;
    readonly def: number;
    readonly spd: number;
    readonly luk: number;
  };
  /** 每等级缩放系数（默认与 pirate_grunt 一致） */
  readonly scaling?: {
    readonly hp: number;
    readonly atk: number;
    readonly def: number;
    readonly spd: number;
    readonly luk: number;
    readonly mdf: number;
  };
  readonly levelOffset?: number;
}

const ENEMY_SCALING = {
  pirate_grunt: { hp: 8, atk: 1.2, def: 0.8, spd: 0.6, luk: 0.4, mdf: 0.5 },
  pirate_gunner: { hp: 6, atk: 1.5, def: 0.6, spd: 0.8, luk: 0.5, mdf: 0.6 },
  pirate_captain: { hp: 12, atk: 2.0, def: 1.2, spd: 0.8, luk: 0.6, mdf: 1.0 },
} as const satisfies Record<string, EnemyTemplate["scaling"]>;

// 敌方类型定义
const ENEMY_TEMPLATES: Record<string, EnemyTemplate> = {
  pirate_grunt: {
    id: "enemy-1",
    name: "海盗水手",
    weaponId: "rusted_sword",
    baseStats: {
      hp: 40,
      mp: 20,
      atk: 8,
      def: 4,
      mag: 3,
      mdf: 3,
      spd: 7,
      luk: 3,
    },
    mediumBaseStats: { hp: 45, atk: 9, def: 5, spd: 8, luk: 4 },
    scaling: ENEMY_SCALING.pirate_grunt,
  },
  pirate_gunner: {
    id: "enemy-2",
    name: "海盗火枪手",
    weaponId: "pirate_cutlass",
    baseStats: {
      hp: 35,
      mp: 25,
      atk: 12,
      def: 3,
      mag: 4,
      mdf: 4,
      spd: 10,
      luk: 5,
    },
    scaling: ENEMY_SCALING.pirate_gunner,
  },
  pirate_captain: {
    id: "enemy-1",
    name: "海盗船长",
    weaponId: "pirate_cutlass",
    baseStats: {
      hp: 70,
      mp: 30,
      atk: 15,
      def: 8,
      mag: 6,
      mdf: 7,
      spd: 11,
      luk: 8,
    },
    scaling: ENEMY_SCALING.pirate_captain,
    levelOffset: 2,
  },
};

/** 根据难度生成对应敌人组 */
function createEnemyGroup(
  difficulty: number,
  enemyLevel: number,
): CombatParticipant[] {
  if (difficulty < 1.5) {
    return [
      buildEnemyParticipant(
        ENEMY_TEMPLATES.pirate_grunt,
        "enemy-1",
        enemyLevel,
        false,
      ),
    ];
  }
  if (difficulty < 3.0) {
    return [
      buildEnemyParticipant(
        ENEMY_TEMPLATES.pirate_grunt,
        "enemy-1",
        enemyLevel,
        true,
      ),
      buildEnemyParticipant(
        ENEMY_TEMPLATES.pirate_gunner,
        "enemy-2",
        enemyLevel,
        true,
      ),
    ];
  }
  return [
    buildEnemyParticipant(
      ENEMY_TEMPLATES.pirate_captain,
      "enemy-1",
      enemyLevel,
      true,
    ),
    buildEnemyParticipant(
      ENEMY_TEMPLATES.pirate_grunt,
      "enemy-2",
      enemyLevel,
      true,
    ),
    buildEnemyParticipant(
      ENEMY_TEMPLATES.pirate_gunner,
      "enemy-3",
      enemyLevel,
      true,
    ),
  ];
}

/** 根据模板构建敌方参与者（带等级缩放） */
function buildEnemyParticipant(
  template: EnemyTemplate,
  id: string,
  level: number,
  isMediumOrHard: boolean,
): CombatParticipant {
  const lvl = level + (template.levelOffset ?? 0);
  const sc = template.scaling ?? {
    hp: 8,
    atk: 1.2,
    def: 0.8,
    spd: 0.6,
    luk: 0.4,
    mdf: 0.5,
  };
  const base =
    isMediumOrHard && template.mediumBaseStats
      ? { ...template.baseStats, ...template.mediumBaseStats }
      : template.baseStats;
  return {
    id,
    name: template.name,
    type: "enemy" as const,
    hp: base.hp + lvl * sc.hp,
    maxHp: base.hp + lvl * sc.hp,
    mp: template.baseStats.mp,
    maxMp: template.baseStats.mp,
    atk: base.atk + lvl * sc.atk,
    def: base.def + lvl * sc.def,
    mag: template.baseStats.mag,
    mdf: template.baseStats.mdf + lvl * sc.mdf,
    spd: base.spd + lvl * sc.spd,
    luk: base.luk + lvl * sc.luk,
    level: lvl,
    weaponId: template.weaponId,
    statuses: [],
    isDodging: false,
    isParrying: false,
  };
}

// ---- 公开 API ----

/** 构建玩家参与者 */
function createPlayerParticipant(world: World): CombatParticipant {
  const stats = calcPanelStats(world.player, world.fleet.inventory);
  return {
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
}

/**
 * 初始化人物战斗状态
 */
export function initPersonCombat(
  world: World,
  difficulty: number,
): PersonCombatState {
  const playerPart = createPlayerParticipant(world);
  const enemyLevel = Math.max(1, Math.round(difficulty * 2));
  const enemies = createEnemyGroup(difficulty, enemyLevel);

  const participants: CombatParticipant[] = [playerPart, ...enemies];
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
