// ============================================================
// 生存率计算 — 纯游戏公式
// ============================================================

import {
  SURVIVAL_DEFENSE_FACTOR,
  SURVIVAL_HP_PENALTY_FACTOR,
} from "../../data/formulas";
import { calcDefenseScore } from "./ship";

/**
 * 计算给定舰队平均防御和状态的生存率百分比（clamped 5–99）。
 * @param avgDefenseMultiplier - 舰队平均防御倍率
 * @param avgHpRatio - 舰队平均血量比（0–1）
 * @param baseDangerScore - 航线基础危险分
 */
export function computeSurvivalRate(
  avgDefenseMultiplier: number,
  avgHpRatio: number,
  baseDangerScore: number,
): number {
  const score = calcDefenseScore(
    avgDefenseMultiplier,
    avgHpRatio,
    SURVIVAL_DEFENSE_FACTOR,
    SURVIVAL_HP_PENALTY_FACTOR,
  );
  return Math.min(99, Math.max(5, Math.floor(score - baseDangerScore)));
}
