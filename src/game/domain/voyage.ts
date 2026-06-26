// ============================================================
// 航行逻辑 — 纯函数
// ============================================================

import { EVENT_CONFIGS, type EventTemplate } from "../../data/events";
import { PORTS } from "../../data/ports";
import { applyCombatOutcome, resolveCombat } from "./combat";
import { getEffectiveCapacityForShip } from "./navigation";
import { getNearestPort } from "./ship";
import { getMaxCapacity, getUsedCapacity } from "./trade";
import type { CargoItem, VoyageEvent, VoyageState, World } from "./types";
import { DomainError } from "./types";

/**
 * 按区域调整事件概率权重。
 * 返回调整后的事件列表和调整后的总概率（用于每日触发判定）。
 */
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

/** 按权重选择事件模板，返回 null 表示无匹配 */
function pickEvent(
  roll: number,
  events: readonly EventTemplate[],
): EventTemplate | null {
  let cumulative = 0;
  for (const tmpl of events) {
    cumulative += tmpl.chance;
    if (roll < cumulative) return tmpl;
  }
  return null;
}

/** 创建战斗事件（数值由抵达时结算） */
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
/** 每天最多一个事件：按权重随机选择并生成，返回 null 表示今日无事 */
function generateSingleDayEvent(
  day: number,
  events: readonly EventTemplate[],
  totalChance: number,
): VoyageEvent | null {
  const roll = Math.random();
  if (!isEventTriggered(roll, totalChance)) return null;

  const tmpl = pickEvent(roll, events);
  if (!tmpl) return null;

  return tmpl.type === "combat"
    ? createCombatEvent(day, tmpl)
    : createDefaultEvent(day, tmpl);
}

/** 生成航行事件（在出航时一次性确定）。每天有概率触发 0-1 个事件。 */
export function generateVoyageEvents(
  world: World,
  travelDays: number,
): readonly VoyageEvent[] {
  const port = PORTS.find((p) => p.id === world.player.currentPortId);
  const region = port?.regionId ?? "";
  const { events, totalChance } = adjustEventsByRegion(region);

  const result: VoyageEvent[] = [];
  for (let day = 1; day <= travelDays; day++) {
    const event = generateSingleDayEvent(day, events, totalChance);
    if (event) result.push(event);
  }
  return result;
}

/** 随机从 cargo 中扣除指定数量货物（支持超额跨摊分） */
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

/** 解析战斗事件并应用结果 */
function applyCombatEvent(world: World, event: VoyageEvent): World {
  const port = PORTS.find((p) => p.id === world.player.currentPortId);
  const region = port?.regionId ?? "";
  const outcome = resolveCombat(world, region);
  const nearestPort = getNearestPort(
    world.voyage?.fromPortId ?? world.player.currentPortId,
    world.voyage?.toPortId ?? world.player.currentPortId,
  );

  // 将 combatOutcome 存入事件（view builder 读取展示）
  (event as VoyageEvent & { combatOutcome: typeof outcome }).combatOutcome =
    outcome;

  return applyCombatOutcome(world, outcome, nearestPort);
}

/** 应用金币变化 */
function applyGoldChange(world: World, delta: number): World {
  if (delta === 0) return world;
  return {
    ...world,
    player: { ...world.player, gold: Math.max(0, world.player.gold + delta) },
  };
}

/** 应用货物损失 */
function applyCargoLoss(world: World, loss: number): World {
  if (loss <= 0 || world.ship.cargo.length === 0) return world;
  return {
    ...world,
    ship: { ...world.ship, cargo: subtractCargoLoss(world.ship.cargo, loss) },
  };
}
/**
 * 应用航行事件效果到 World（扣金币、丢失货物）。
 * 战斗事件在抵达时实时解析（考虑之前事件造成的 HP 变化）。
 * 在抵达时统一处理。
 */
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
  }

  return result;
}

/** 创建航行状态（出航时调用）。校验有效舱容，超载则抛错。 */
export function startVoyage(
  world: World,
  fromPortId: string,
  toPortId: string,
  travelDays: number,
  armamentLevel: 0 | 1 | 2 = 0,
): VoyageState {
  const usedCapacity = getUsedCapacity(world);
  const maxCapacity = getMaxCapacity(world);
  const effectiveCapacity = getEffectiveCapacityForShip(
    world.ship.typeId,
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
