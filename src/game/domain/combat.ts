import {
  COMBAT_BASE_DAMAGE_MAX,
  COMBAT_BASE_DAMAGE_MIN,
  COMBAT_CARGO_LOSS_MAX,
  COMBAT_CARGO_LOSS_MIN,
  COMBAT_DEFENSE_BONUS_FACTOR,
  COMBAT_HP_PENALTY_FACTOR,
  TOTAL_LOSS_THRESHOLD,
} from "../../data/formulas";
import { SHIPS } from "../../data/ships";
import { calcDefenseScore, getActiveShip, takeDamage } from "./ship";
import type { CargoItem, ShipInstance, World } from "./types";

/** 战斗结果类型 */
export type CombatResult = "victory" | "partialLoss" | "totalLoss";

/** 战斗结算输出 */
export interface CombatOutcome {
  readonly result: CombatResult;
  readonly hpDamage: number;
  readonly cargoLoss: number;
  readonly allCargoLost?: true;
  readonly description: string;
}

/** 随机因子来源（允许测试注入确定性值） */
export type RngSource = () => number;

/** 解析战斗：根据武装配置、船体状态判定结果 */
export function resolveCombat(
  world: World,
  difficulty: number,
  rng: RngSource = Math.random,
): CombatOutcome {
  const activeShip = getActiveShip(world);
  const shipConfig = SHIPS.find((s) => s.id === activeShip.typeId);
  if (!shipConfig) {
    return { result: "victory", hpDamage: 0, cargoLoss: 0, description: "" };
  }

  const score = calcCombatScore(world, activeShip, difficulty, rng, shipConfig);

  if (score < TOTAL_LOSS_THRESHOLD) return buildTotalLossOutcome(activeShip);
  if (score < 50) return buildPartialLossOutcome(rng);
  return buildVictoryOutcome(rng);
}

/** 计算战斗评分 */
function calcCombatScore(
  world: World,
  activeShip: ShipInstance,
  difficulty: number,
  rng: RngSource,
  shipConfig: (typeof SHIPS)[number],
): number {
  const armamentLevel = world.voyage?.armamentLevel ?? 0;
  const defenseMultiplier = shipConfig.armamentTiers[armamentLevel][1];

  const hpRatio =
    activeShip.maxDurability > 0
      ? activeShip.durability / activeShip.maxDurability
      : 0;

  let score = calcDefenseScore(
    defenseMultiplier,
    hpRatio,
    COMBAT_DEFENSE_BONUS_FACTOR,
    COMBAT_HP_PENALTY_FACTOR,
  );

  score = score * (0.6 + rng() * 0.8);
  score = score / difficulty;

  return score;
}

function buildTotalLossOutcome(activeShip: ShipInstance): CombatOutcome {
  return {
    result: "totalLoss",
    hpDamage: activeShip.durability,
    cargoLoss: 0,
    allCargoLost: true,
    description: "海盗登船洗劫一空，船体严重损毁，勉强漂回港口……",
  };
}

/** 部分损失结果 */
function buildPartialLossOutcome(rng: RngSource): CombatOutcome {
  const hpDamage = Math.floor(
    COMBAT_BASE_DAMAGE_MIN +
      rng() * (COMBAT_BASE_DAMAGE_MAX - COMBAT_BASE_DAMAGE_MIN),
  );
  const cargoLoss = Math.floor(
    COMBAT_CARGO_LOSS_MIN +
      rng() * (COMBAT_CARGO_LOSS_MAX - COMBAT_CARGO_LOSS_MIN),
  );
  return {
    result: "partialLoss",
    hpDamage,
    cargoLoss,
    description: `激战后击退海盗，船上损失 ${cargoLoss > 0 ? `${cargoLoss} 单位货物` : "部分物资"}，船体受损。`,
  };
}

/** 胜利结果 */
function buildVictoryOutcome(rng: RngSource): CombatOutcome {
  const hpDamage = Math.floor(rng() * 5);
  return {
    result: "victory",
    hpDamage,
    cargoLoss: 0,
    description: "船员奋力作战，成功击退海盗！",
  };
}

/** 应用战斗结果到 World */
export function applyCombatOutcome(
  world: World,
  outcome: CombatOutcome,
  nearestPortId: string,
): World {
  const activeShip = getActiveShip(world);
  let result = takeDamage(world, activeShip.id, outcome.hpDamage);

  if (outcome.result === "totalLoss") {
    result = {
      ...result,
      fleet: {
        ...result.fleet,
        ships: result.fleet.ships.map((s) =>
          s.id === activeShip.id ? { ...s, durability: 1, cargo: [] } : s,
        ),
      },
      player: { ...result.player, currentPortId: nearestPortId },
      voyage: null,
    };
  } else if (outcome.cargoLoss > 0) {
    const remainingCargo = subtractCargoLoss(
      activeShip.cargo,
      outcome.cargoLoss,
    );
    result = {
      ...result,
      fleet: {
        ...result.fleet,
        ships: result.fleet.ships.map((s) =>
          s.id === activeShip.id ? { ...s, cargo: remainingCargo } : s,
        ),
      },
    };
  }

  return result;
}

/** 随机从 cargo 中扣除指定数量货物 */
function subtractCargoLoss(
  cargo: readonly CargoItem[],
  lossAmount: number,
): readonly CargoItem[] {
  if (lossAmount <= 0 || cargo.length === 0) return cargo;

  const remaining = cargo.map((c) => ({ ...c }));
  let toLose = lossAmount;

  for (let i = remaining.length - 1; i >= 0 && toLose > 0; i--) {
    const canLose = Math.min(remaining[i].quantity, toLose);
    remaining[i].quantity -= canLose;
    toLose -= canLose;
  }

  return remaining.filter((c) => c.quantity > 0);
}
