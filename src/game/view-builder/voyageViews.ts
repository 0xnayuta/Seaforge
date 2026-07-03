import { PORTS } from "../../data/ports";
import type {
  CombatLogEntryView,
  VoyageEventView,
  VoyageView,
} from "../../types/game-view";
import type { CombatOutcome } from "../domain/combat";
import type { VoyageEvent, World } from "../domain/types";
import { buildCombatChoiceView, buildPersonCombatView } from "./combatViews";

function formatCombatLog(outcome: CombatOutcome): CombatLogEntryView {
  const resultLabel =
    outcome.result === "victory"
      ? "胜利"
      : outcome.result === "partialLoss"
        ? "受损"
        : "惨败";
  return {
    result: resultLabel,
    description: outcome.description,
    hpDamage: outcome.hpDamage,
    cargoLoss: outcome.cargoLoss,
    ...(outcome.allCargoLost ? { allCargoLost: true as const } : {}),
  };
}

/** 格式化金币变动文本 */
function formatGoldChange(goldChange: number): string | null {
  if (goldChange > 0) return `获得 ${goldChange} 金币`;
  if (goldChange < 0) return `损失 ${Math.abs(goldChange)} 金币`;
  return null;
}

/** 格式化单个航行事件视图 */
function buildEventView(event: VoyageEvent): VoyageEventView {
  const parts: string[] = [];
  const goldText = formatGoldChange(event.goldChange);
  if (goldText) parts.push(goldText);
  if (event.cargoLoss > 0) parts.push(`丢失 ${event.cargoLoss} 单位货物`);
  const combatLog = event.combatOutcome
    ? formatCombatLog(event.combatOutcome)
    : undefined;
  const effect =
    parts.length > 0 ? parts.join("，") : combatLog ? "" : "无影响";
  return { day: event.day, description: event.description, effect, combatLog };
}

export function buildVoyageView(world: World): VoyageView {
  const voyage = world.voyage;
  if (!voyage) {
    return {
      fromPortName: "未知",
      toPortName: "未知",
      travelDays: 0,
      isUnderway: false,
      events: [],
      fleetShipCount: 0,
      combatState: null,
      combatChoice: null,
    };
  }
  const fromPort = PORTS.find((p) => p.id === voyage.fromPortId);
  const toPort = PORTS.find((p) => p.id === voyage.toPortId);
  return {
    fromPortName: fromPort?.name ?? "未知",
    toPortName: toPort?.name ?? "未知",
    travelDays: voyage.travelDays,
    isUnderway: true,
    events: voyage.events.map(buildEventView),
    fleetShipCount: voyage.fleetShipIds ? voyage.fleetShipIds.length : 1,
    combatState: buildPersonCombatView(world),
    combatChoice: buildCombatChoiceView(world),
  };
}
