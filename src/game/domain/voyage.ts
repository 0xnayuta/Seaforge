// ============================================================
// 航行逻辑 — 纯函数
// ============================================================

import { EVENT_CONFIGS, type EventTemplate } from "../../data/events";
import { EVENT_EXP } from "../../data/formulas";
import { PORTS } from "../../data/ports";
import { REGIONS } from "../../data/regions";
import { applyCombatOutcome, resolveCombat } from "./combat";
import { getEffectiveCapacityForShip } from "./navigation";
import { gainExp } from "./player";
import { getActiveShip, getNearestPort } from "./ship";
import { getMaxCapacity, getUsedCapacity } from "./trade";
import type { CargoItem, VoyageEvent, VoyageState, World } from "./types";
import { DomainError } from "./types";

/** 按区域调整事件概率权重 */
function adjustEventsByRegion(region: string): {
  events: readonly EventTemplate[];
  totalChance: number;
} {
  const adjusted = EVENT_CONFIGS.map((e) => {
    const mult = e.regionProbMultiplier?.[region] ?? 1.0;
    return { ...e, chance: e.chance * mult };
  });
  const totalChance = adjusted.reduce((sum, e) => sum + e.chance, 0);
  return { events: adjusted, totalChance };
}

/** 判断当日是否触发事件 */
function isEventTriggered(roll: number, totalChance: number): boolean {
  return roll < totalChance;
}

/** 按权重选择事件模板 */
function pickEvent(
  roll: number,
  events: readonly EventTemplate[],
): EventTemplate | null {
  let cumulative = 0;
  for (const e of events) {
    cumulative += e.chance;
    if (roll < cumulative) return e;
  }
  return null;
}

/** 创建战斗事件 */
function createCombatEvent(day: number, tmpl: EventTemplate): VoyageEvent {
  return {
    day,
    description: tmpl.triggerText,
    goldChange: 0,
    cargoLoss: 0,
    type: "combat",
  };
}

/** 创建普通事件（即时生成数值） */
function createDefaultEvent(day: number, tmpl: EventTemplate): VoyageEvent {
  const goldChange =
    tmpl.minGold + Math.round(Math.random() * (tmpl.maxGold - tmpl.minGold));
  const cargoLoss =
    Math.random() < tmpl.cargoLossChance
      ? 1 + Math.floor(Math.random() * tmpl.maxCargoLoss)
      : 0;
  return { day, description: tmpl.triggerText, goldChange, cargoLoss };
}

/** 每天最多一个事件：按权重随机选择并生成 */
function generateSingleDayEvent(
  day: number,
  events: readonly EventTemplate[],
  totalChance: number,
): VoyageEvent | null {
  if (!isEventTriggered(Math.random(), totalChance)) return null;
  const tmpl = pickEvent(Math.random() * totalChance, events);
  if (!tmpl) return null;

  if (tmpl.type === "combat") return createCombatEvent(day, tmpl);
  return createDefaultEvent(day, tmpl);
}

/** 生成航行事件 */
export function generateVoyageEvents(
  world: World,
  travelDays: number,
): readonly VoyageEvent[] {
  const port = PORTS.find((p) => p.id === world.player.currentPortId);
  const region = port?.regionId ?? "unknown";
  const { events, totalChance } = adjustEventsByRegion(region);

  const result: VoyageEvent[] = [];
  for (let day = 1; day <= travelDays; day++) {
    const event = generateSingleDayEvent(day, events, totalChance);
    if (event) result.push(event);
  }
  return result;
}

/** 随机从 cargo 中扣除指定数量货物 */
function subtractCargoLoss(
  cargo: readonly CargoItem[],
  lossAmount: number,
): readonly CargoItem[] {
  let remainingLoss = lossAmount;
  let result = [...cargo];
  while (remainingLoss > 0 && result.length > 0) {
    const idx = Math.floor(Math.random() * result.length);
    const item = result[idx];
    if (item.quantity <= remainingLoss) {
      remainingLoss -= item.quantity;
      result = result.filter((_, i) => i !== idx);
    } else {
      result = result.map((c, i) =>
        i === idx ? { ...c, quantity: c.quantity - remainingLoss } : c,
      );
      remainingLoss = 0;
    }
  }
  return result;
}

/** 断言查找结果不为空 */
function findOrThrow<T extends { id: string }>(
  items: readonly T[],
  id: string,
  code: string,
): T {
  const item = items.find((i) => i.id === id);
  if (!item) throw new DomainError(code);
  return item;
}

/** 解析战斗事件并应用结果 */
function applyCombatEvent(world: World, event: VoyageEvent): World {
  const voyage = world.voyage;
  if (!voyage) throw new DomainError("IN_VOYAGE");

  const progress = event.day / voyage.travelDays;

  const depPort = findOrThrow(PORTS, voyage.fromPortId, "UNKNOWN_PORT");
  const arrPort = findOrThrow(PORTS, voyage.toPortId, "UNKNOWN_PORT");
  const depRegion = findOrThrow(REGIONS, depPort.regionId, "UNKNOWN_REGION");
  const arrRegion = findOrThrow(REGIONS, arrPort.regionId, "UNKNOWN_REGION");
  const curMod =
    depRegion.dangerModifier +
    (arrRegion.dangerModifier - depRegion.dangerModifier) * progress;
  const curDanger =
    depPort.danger + (arrPort.danger - depPort.danger) * progress;
  const difficulty = curMod * curDanger;

  const outcome = resolveCombat(world, difficulty);
  const nearestPort = getNearestPort(
    world.voyage?.fromPortId ?? world.player.currentPortId,
    world.voyage?.toPortId ?? world.player.currentPortId,
  );

  (event as VoyageEvent & { combatOutcome: typeof outcome }).combatOutcome =
    outcome;

  return applyCombatOutcome(world, outcome, nearestPort);
}

/** 应用金币变化 */
function applyGoldChange(world: World, delta: number): World {
  if (delta === 0) return world;
  return {
    ...world,
    fleet: { ...world.fleet, gold: Math.max(0, world.fleet.gold + delta) },
  };
}

/** 应用货物损失 */
function applyCargoLoss(world: World, loss: number): World {
  const activeShip = getActiveShip(world);
  if (loss <= 0 || activeShip.cargo.length === 0) return world;
  return {
    ...world,
    fleet: {
      ...world.fleet,
      ships: world.fleet.ships.map((s) =>
        s.id === activeShip.id
          ? { ...s, cargo: subtractCargoLoss(activeShip.cargo, loss) }
          : s,
      ),
    },
  };
}

/** 应用航行事件效果到 World */
export function applyVoyageEvents(
  world: World,
  events: readonly VoyageEvent[],
): World {
  let result = world;
  for (const event of events) {
    if (event.type === "combat") {
      result = applyCombatEvent(result, event);
    } else {
      result = applyGoldChange(result, event.goldChange);
      result = applyCargoLoss(result, event.cargoLoss);
    }
    result = gainExp(result, EVENT_EXP);
  }
  return result;
}

/** 出航参数 */
export interface StartVoyageOptions {
  readonly fromPortId: string;
  readonly toPortId: string;
  readonly travelDays: number;
  readonly armamentLevel: 0 | 1 | 2;
}

/** 创建航行状态（出航时调用）。校验有效舱容，超载则抛错。 */
export function startVoyage(
  world: World,
  options: StartVoyageOptions,
): VoyageState {
  const { fromPortId, toPortId, travelDays, armamentLevel } = options;
  const usedCapacity = getUsedCapacity(world);
  const maxCapacity = getMaxCapacity(world);
  const activeShip = getActiveShip(world);
  const effectiveCapacity = getEffectiveCapacityForShip(
    activeShip.typeId,
    maxCapacity,
    armamentLevel,
  );
  if (usedCapacity > effectiveCapacity) {
    throw new DomainError("CARGO_EXCEEDS_CAPACITY");
  }
  return {
    fromPortId,
    toPortId,
    departureDay: world.player.day,
    travelDays,
    events: generateVoyageEvents(world, travelDays),
    armamentLevel,
  };
}
