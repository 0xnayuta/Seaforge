import {
  COMBAT_BASE_DAMAGE_MAX,
  COMBAT_BASE_DAMAGE_MIN,
  COMBAT_CARGO_LOSS_MAX,
  COMBAT_CARGO_LOSS_MIN,
  COMBAT_DEFENSE_BONUS_FACTOR,
  COMBAT_HP_PENALTY_FACTOR,
  COMBAT_PARTIAL_LOSS_CREW_LOSS_MAX,
  COMBAT_PARTIAL_LOSS_CREW_LOSS_MIN,
  COMBAT_VICTORY_CREW_LOSS_CHANCE,
  TOTAL_LOSS_THRESHOLD,
} from "../../data/formulas";
import { SHIPS } from "../../data/ships";
import { calcMinCrewForFleet } from "./crew";
import { getShipDefenseMultiplier } from "./equipment";
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
  readonly crewLoss?: number;
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
    return {
      result: "victory",
      hpDamage: 0,
      cargoLoss: 0,
      crewLoss: 0,
      description: "",
    };
  }

  const score = calcCombatScore(world, difficulty, rng);

  if (score < TOTAL_LOSS_THRESHOLD)
    return buildTotalLossOutcome(activeShip, world);
  if (score < 50) return buildPartialLossOutcome(rng, world);
  return buildVictoryOutcome(rng, world);
}

/** 计算战斗评分 */
function calcCombatScore(
  world: World,
  difficulty: number,
  rng: RngSource,
): number {
  const fleetShipIds = world.voyage?.fleetShipIds ?? [getActiveShip(world).id];

  let totalDefenseMultiplier = 0;
  let totalHpRatio = 0;
  let fleetSize = 0;

  for (const shipId of fleetShipIds) {
    const ship = world.fleet.ships.find((s) => s.id === shipId);
    if (!ship) continue;
    const cfg = SHIPS.find((s) => s.id === ship.typeId);
    if (!cfg) continue;
    const defenseMultiplier = getShipDefenseMultiplier(ship, cfg);
    const hpRatio =
      ship.maxDurability > 0 ? ship.durability / ship.maxDurability : 0;
    totalDefenseMultiplier += defenseMultiplier;
    totalHpRatio += hpRatio;
    fleetSize++;
  }

  const avgDefenseMultiplier =
    fleetSize > 0 ? totalDefenseMultiplier / fleetSize : 1;
  const avgHpRatio = fleetSize > 0 ? totalHpRatio / fleetSize : 0;

  let score = calcDefenseScore(
    avgDefenseMultiplier,
    avgHpRatio,
    COMBAT_DEFENSE_BONUS_FACTOR,
    COMBAT_HP_PENALTY_FACTOR,
  );

  // 船员战斗加成
  const minCrew = calcMinCrewForFleet(world, fleetShipIds);
  const extraCrew = Math.max(0, world.fleet.crew - minCrew);
  const combatBonus = Math.min(0.3, extraCrew * 0.005);
  score = score * (1 + combatBonus);

  score = score * (0.6 + rng() * 0.8);
  score = score / difficulty;

  return score;
}

function buildTotalLossOutcome(
  activeShip: ShipInstance,
  world: World,
): CombatOutcome {
  return {
    result: "totalLoss",
    hpDamage: activeShip.durability,
    cargoLoss: 0,
    allCargoLost: true,
    crewLoss: world.fleet.crew,
    description: "海盗登船洗劫一空，船员全数失踪，船体严重损毁，勉强漂回港口……",
  };
}

/** 部分损失结果 */
function buildPartialLossOutcome(rng: RngSource, world: World): CombatOutcome {
  const hpDamage = Math.floor(
    COMBAT_BASE_DAMAGE_MIN +
      rng() * (COMBAT_BASE_DAMAGE_MAX - COMBAT_BASE_DAMAGE_MIN),
  );
  const cargoLoss = Math.floor(
    COMBAT_CARGO_LOSS_MIN +
      rng() * (COMBAT_CARGO_LOSS_MAX - COMBAT_CARGO_LOSS_MIN),
  );
  const minLoss = Math.min(world.fleet.crew, COMBAT_PARTIAL_LOSS_CREW_LOSS_MIN);
  const maxLoss = Math.min(world.fleet.crew, COMBAT_PARTIAL_LOSS_CREW_LOSS_MAX);
  const crewLoss =
    minLoss <= maxLoss
      ? Math.floor(rng() * (maxLoss - minLoss + 1)) + minLoss
      : 0;

  return {
    result: "partialLoss",
    hpDamage,
    cargoLoss,
    crewLoss,
    description: `激战后击退海盗，船体受损，损失 ${cargoLoss > 0 ? `${cargoLoss} 单位货物` : "部分物资"}${crewLoss > 0 ? `及 ${crewLoss} 名船员` : ""}。`,
  };
}

/** 胜利结果 */
function buildVictoryOutcome(rng: RngSource, world: World): CombatOutcome {
  const hpDamage = Math.floor(rng() * 5);
  const crewLoss =
    rng() < COMBAT_VICTORY_CREW_LOSS_CHANCE ? Math.min(1, world.fleet.crew) : 0;
  return {
    result: "victory",
    hpDamage,
    cargoLoss: 0,
    crewLoss,
    description: `船员奋力作战，成功击退海盗！${crewLoss > 0 ? "（损失 1 名船员）" : ""}`,
  };
}

/** 应用战斗结果到 World */
export function applyCombatOutcome(
  world: World,
  outcome: CombatOutcome,
  nearestPortId: string,
  fleetShipIds: readonly string[] = [getActiveShip(world).id],
): World {
  const fleetSize = fleetShipIds.length;
  const hpDamagePerShip = Math.ceil(outcome.hpDamage / fleetSize);

  // Apply HP damage to all fleet ships
  let result = world;
  for (const shipId of fleetShipIds) {
    result = takeDamage(result, shipId, hpDamagePerShip);
  }

  if (outcome.result === "totalLoss") {
    // All fleet ships lose cargo, durability set to 1, teleport to nearest port
    result = {
      ...result,
      fleet: {
        ...result.fleet,
        ships: result.fleet.ships.map((s) =>
          fleetShipIds.includes(s.id) ? { ...s, durability: 1, cargo: [] } : s,
        ),
      },
      player: { ...result.player, currentPortId: nearestPortId },
      voyage: null,
    };
  } else if (outcome.cargoLoss > 0) {
    // Split cargo loss across fleet ships
    const cargoLossPerShip = Math.ceil(outcome.cargoLoss / fleetSize);
    for (const shipId of fleetShipIds) {
      const ship = result.fleet.ships.find((s) => s.id === shipId);
      if (!ship || ship.cargo.length === 0) continue;
      const remainingCargo = subtractCargoLoss(ship.cargo, cargoLossPerShip);
      result = {
        ...result,
        fleet: {
          ...result.fleet,
          ships: result.fleet.ships.map((s) =>
            s.id === shipId ? { ...s, cargo: remainingCargo } : s,
          ),
        },
      };
    }
  }

  // 扣除船员损失
  if (outcome.crewLoss && outcome.crewLoss > 0) {
    result = {
      ...result,
      fleet: {
        ...result.fleet,
        crew: Math.max(0, result.fleet.crew - outcome.crewLoss),
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
