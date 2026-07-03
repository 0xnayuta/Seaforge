// ============================================================
// 航行逻辑 — 纯函数
// ============================================================

import { EVENT_CONFIGS, type EventTemplate } from "../../data/events";
import {
  EVENT_EXP,
  STORM_CREW_LOSS_CHANCE,
  STORM_CREW_LOSS_MAX,
  STORM_CREW_LOSS_MIN,
  STORM_HP_DAMAGE_MAX,
  STORM_HP_DAMAGE_MIN,
} from "../../data/formulas";
import { PORTS } from "../../data/ports";
import { REGIONS } from "../../data/regions";
import { SHIPS } from "../../data/ships";
import { applyCombatResult, resolveCombat } from "./combat";
import { initPersonCombat } from "./combat-person";
import { calcMinCrewForFleet, deductCrewUpkeep } from "./crew";
import { getFleetPirateEvasion, getShipCargoCapacity } from "./equipment";
import { arriveAtPort, getEffectiveCapacityForShip } from "./navigation";
import { advanceDay, gainExp } from "./player";
import { getActiveShip, getNearestPort, takeDamage } from "./ship";
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
function createDefaultEvent(day: number, tmpl: EventTemplate): VoyageEvent {
  const goldChange =
    tmpl.minGold + Math.round(Math.random() * (tmpl.maxGold - tmpl.minGold));
  const cargoLoss =
    Math.random() < tmpl.cargoLossChance
      ? 1 + Math.floor(Math.random() * tmpl.maxCargoLoss)
      : 0;
  return {
    day,
    description: tmpl.triggerText,
    goldChange,
    cargoLoss,
    type: tmpl.type,
  };
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
export function findOrThrow<T extends { id: string }>(
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

  // 判定是否成功回避海盗
  const evasionChance = getFleetPirateEvasion(world, voyage.fleetShipIds);
  if (Math.random() < evasionChance) {
    const outcome = {
      result: "victory" as const,
      hpDamage: 0,
      cargoLoss: 0,
      crewLoss: 0,
      description: "舰队在航行中遭遇海盗，但凭借装备成功避开了海盗袭击！",
    };
    (event as VoyageEvent & { combatResult: typeof outcome }).combatResult =
      outcome;
    (event as { description: string }).description += " (成功回避海盗袭击)";
    return world;
  }
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

  (event as VoyageEvent & { combatResult: typeof outcome }).combatResult =
    outcome;

  return applyCombatResult(world, outcome, nearestPort, voyage.fleetShipIds);
}

/** 应用金币变化 */
function applyGoldChange(world: World, delta: number): World {
  if (delta === 0) return world;
  return {
    ...world,
    fleet: { ...world.fleet, gold: Math.max(0, world.fleet.gold + delta) },
  };
}

/** 应用货物损失（舰队所有船只均分） */
function applyCargoLoss(world: World, loss: number): World {
  const fleetShipIds = world.voyage?.fleetShipIds ?? [getActiveShip(world).id];
  if (loss <= 0) return world;

  const fleetSize = fleetShipIds.length;
  const lossPerShip = Math.ceil(loss / fleetSize);

  let result = world;
  for (const shipId of fleetShipIds) {
    const ship = result.fleet.ships.find((s) => s.id === shipId);
    if (!ship || ship.cargo.length === 0) continue;
    result = {
      ...result,
      fleet: {
        ...result.fleet,
        ships: result.fleet.ships.map((s) =>
          s.id === shipId
            ? { ...s, cargo: subtractCargoLoss(s.cargo, lossPerShip) }
            : s,
        ),
      },
    };
  }
  return result;
}

/** 解析风暴事件并应用结果 */
function applyStormEvent(world: World, event: VoyageEvent): World {
  const voyage = world.voyage;
  if (!voyage) return world;

  let result = world;
  const fleetShipIds = voyage.fleetShipIds;

  // 1. 耐久度扣减
  for (const shipId of fleetShipIds) {
    const damage =
      STORM_HP_DAMAGE_MIN +
      Math.floor(
        Math.random() * (STORM_HP_DAMAGE_MAX - STORM_HP_DAMAGE_MIN + 1),
      );
    result = takeDamage(result, shipId, damage);
  }

  // 2. 船员损失
  let crewLost = 0;
  if (Math.random() < STORM_CREW_LOSS_CHANCE) {
    crewLost = Math.min(
      result.fleet.crew,
      STORM_CREW_LOSS_MIN +
        Math.floor(
          Math.random() * (STORM_CREW_LOSS_MAX - STORM_CREW_LOSS_MIN + 1),
        ),
    );
    result = {
      ...result,
      fleet: {
        ...result.fleet,
        crew: result.fleet.crew - crewLost,
      },
    };
  }

  // 3. 应用事件本身的货物和金币变动
  result = applyGoldChange(result, event.goldChange);
  result = applyCargoLoss(result, event.cargoLoss);

  // 4. 更新描述
  let descSuffix = "";
  if (crewLost > 0) {
    descSuffix += `，损失了 ${crewLost} 名船员！`;
  } else {
    descSuffix += "。";
  }
  const finalDesc = `${event.description} 船队在狂风巨浪中颠簸受损${descSuffix}`;
  (event as { description: string }).description = finalDesc;

  // 5. 旗舰沉没判定
  const activeShip = result.fleet.ships.find(
    (s) => s.id === result.fleet.activeShipId,
  );
  if (activeShip && activeShip.durability <= 0) {
    const nearestPort = getNearestPort(voyage.fromPortId, voyage.toPortId);
    result = {
      ...result,
      fleet: {
        ...result.fleet,
        crew: 0,
        ships: result.fleet.ships.map((s) =>
          fleetShipIds.includes(s.id) ? { ...s, durability: 1, cargo: [] } : s,
        ),
      },
      player: { ...result.player, currentPortId: nearestPort },
      voyage: null,
    };
    (event as { description: string }).description +=
      " 旗舰不幸触礁沉没，舰队被迫就近漂回港口避难……";
  }

  return result;
}

/** 应用航行事件效果到 World */
export function applyVoyageEvents(
  world: World,
  events: readonly VoyageEvent[],
): World {
  let result = world;
  for (const event of events) {
    if (world.voyage && !result.voyage) break;
    if (event.type === "combat") {
      result = applyCombatEvent(result, event);
    } else if (event.type === "storm") {
      result = applyStormEvent(result, event);
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
  readonly fleetShipIds?: readonly string[];
}

/** 创建航行状态（出航时调用）。校验有效舱容，超载则抛错。 */
export function startVoyage(
  world: World,
  options: StartVoyageOptions,
): VoyageState {
  const { fromPortId, toPortId, travelDays } = options;
  const fleetShipIds = options.fleetShipIds ?? [getActiveShip(world).id];

  if (fleetShipIds.length === 0) {
    throw new DomainError("EMPTY_FLEET_SELECTION");
  }

  const minCrew = calcMinCrewForFleet(world, fleetShipIds);
  if (world.fleet.crew < minCrew) {
    throw new DomainError("INSUFFICIENT_CREW");
  }

  // 校验所有船存在且耐久 > 0；累计舱容
  let totalUsedCapacity = 0;
  let totalEffectiveCapacity = 0;
  for (const shipId of fleetShipIds) {
    const ship = world.fleet.ships.find((s) => s.id === shipId);
    if (!ship) throw new DomainError("INVALID_SHIP");
    if (ship.durability <= 0) throw new DomainError("SHIP_ZERO_DURABILITY");

    totalUsedCapacity += ship.cargo.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );

    const shipConfig = SHIPS.find((s) => s.id === ship.typeId);
    if (!shipConfig) throw new DomainError("INVALID_SHIP");
    const maxCapForShip = getShipCargoCapacity(ship, shipConfig);
    const effectiveCapacity = getEffectiveCapacityForShip(
      ship.typeId,
      maxCapForShip,
      ship.armamentLevel,
    );
    totalEffectiveCapacity += effectiveCapacity;
  }

  if (totalUsedCapacity > totalEffectiveCapacity) {
    throw new DomainError("CARGO_EXCEEDS_CAPACITY");
  }

  return {
    fromPortId,
    toPortId,
    departureDay: world.player.day,
    travelDays,
    events: generateVoyageEvents(world, travelDays),
    fleetShipIds,
  };
}

/**
 * 推进航行天数，调整航程状态中的剩余天数和事件触发天数
 */
export function advanceVoyageDays(world: World, days: number): World {
  if (days <= 0) return world;
  let res = advanceDay(world, days);
  if (res.voyage) {
    const remainingEvents = res.voyage.events.map((ev) => ({
      ...ev,
      day: Math.max(0, ev.day - days),
    }));
    res = {
      ...res,
      voyage: {
        ...res.voyage,
        travelDays: Math.max(0, res.voyage.travelDays - days),
        events: remainingEvents,
      },
    };
  }
  return res;
}

// ============================================================
// 战斗事件处理
// ============================================================

/**
 * 处理单个战斗事件：海盗回避判定、接舷战、舰队战。
 * 返回 stopped=true 表示航行需要暂停等待玩家交互。
 */
function processCombatEvent(
  world: World,
  event: VoyageEvent,
  eventIndex: number,
  voyage: VoyageState,
): { world: World; stopped: boolean } {
  let result = world;
  const currentVoyage = result.voyage;
  if (!currentVoyage) return { world: result, stopped: false };

  // 根据航行进度计算当前难度
  const progress = voyage.travelDays > 0 ? event.day / voyage.travelDays : 0;

  const depPort = findOrThrow(PORTS, currentVoyage.fromPortId, "UNKNOWN_PORT");
  const arrPort = findOrThrow(PORTS, currentVoyage.toPortId, "UNKNOWN_PORT");
  const depRegion = findOrThrow(REGIONS, depPort.regionId, "UNKNOWN_REGION");
  const arrRegion = findOrThrow(REGIONS, arrPort.regionId, "UNKNOWN_REGION");
  const curMod =
    depRegion.dangerModifier +
    (arrRegion.dangerModifier - depRegion.dangerModifier) * progress;
  const curDanger =
    depPort.danger + (arrPort.danger - depPort.danger) * progress;
  const difficulty = curMod * curDanger;

  // 判定是否成功回避海盗
  const evasionChance = getFleetPirateEvasion(
    result,
    currentVoyage.fleetShipIds,
  );
  if (Math.random() < evasionChance) {
    const outcome = {
      result: "victory" as const,
      hpDamage: 0,
      cargoLoss: 0,
      crewLoss: 0,
      description: "舰队在航行中遭遇海盗，但凭借装备成功避开了海盗袭击！",
    };
    const updatedEvent = {
      ...event,
      combatResult: outcome,
      description: `${event.description} (成功回避海盗袭击)`,
    };
    result = {
      ...result,
      voyage: {
        ...currentVoyage,
        events: currentVoyage.events.map((ev, idx) =>
          idx === eventIndex ? updatedEvent : ev,
        ),
      },
    };
    result = gainExp(result, EVENT_EXP);
    return { world: result, stopped: false };
  }

  // 10% 几率直接触发接舷战
  if (Math.random() < 0.1) {
    const filteredEvents = currentVoyage.events.filter(
      (_, idx) => idx !== eventIndex,
    );
    const nextVoyage = {
      ...currentVoyage,
      directBoarding: true,
      combatSelection: false,
      events: filteredEvents,
    };
    result = {
      ...result,
      voyage: nextVoyage,
      combat: initPersonCombat(result, difficulty),
    };
    return { world: result, stopped: true };
  }

  // 90% 正常舰队战
  const outcome = resolveCombat(result, difficulty);
  const nearestPort = getNearestPort(
    currentVoyage.fromPortId,
    currentVoyage.toPortId,
  );
  const updatedEvent = { ...event, combatResult: outcome };

  if (outcome.result === "victory") {
    const victoryWorld = applyCombatResult(
      result,
      outcome,
      nearestPort,
      currentVoyage.fleetShipIds,
    );
    if (victoryWorld.voyage) {
      const filteredEvents = victoryWorld.voyage.events.filter(
        (_, idx) => idx !== eventIndex,
      );
      result = {
        ...victoryWorld,
        voyage: { ...victoryWorld.voyage, events: filteredEvents },
      };
    } else {
      result = victoryWorld;
    }
    result = gainExp(result, EVENT_EXP);
    return { world: result, stopped: false };
  }

  // 舰队战战败：暂停等待玩家 Interaction
  const nextVoyage = {
    ...currentVoyage,
    combatSelection: true,
    directBoarding: false,
    events: currentVoyage.events.map((ev, idx) =>
      idx === eventIndex ? updatedEvent : ev,
    ),
  };
  result = { ...result, voyage: nextVoyage };
  return { world: result, stopped: true };
}

// ============================================================
// 到达结算
// ============================================================

/**
 * 全部事件处理完成后，推进剩余天数、到达港口、结算里程与补给。
 */
function finalizeVoyageArrival(world: World): World {
  const finalVoyage = world.voyage;
  if (!finalVoyage) return world;

  const remainingDays = finalVoyage.travelDays;
  let result = advanceVoyageDays(world, remainingDays);
  const updatedVoyage = result.voyage;
  if (!updatedVoyage) return result;

  const totalDays =
    updatedVoyage.travelDays + (result.player.day - updatedVoyage.departureDay);

  result = arriveAtPort(result, updatedVoyage.toPortId, totalDays);
  result = deductCrewUpkeep(result, totalDays);

  // 称号统计：航行里程和完成航行次数
  const depPort = PORTS.find((p) => p.id === updatedVoyage.fromPortId);
  const arrPort = PORTS.find((p) => p.id === updatedVoyage.toPortId);
  const distance =
    depPort && arrPort
      ? Math.round(
          Math.sqrt(
            (depPort.x - arrPort.x) ** 2 + (depPort.y - arrPort.y) ** 2,
          ),
        )
      : 0;

  return {
    ...result,
    player: {
      ...result.player,
      totalMileage: result.player.totalMileage + distance,
      voyagesCompleted: result.player.voyagesCompleted + 1,
    },
    voyage: null,
  };
}

/**
 * 推进航行事件，如果遇到战斗事件需要玩家交互，则中途暂停。
 * 如果无事件或全部事件非战斗/战斗胜利，则直接推进到终点。
 */
export function progressVoyage(world: World): World {
  if (!world.voyage) return world;

  let result = world;
  const voyage = world.voyage;
  const events = [...voyage.events].sort((a, b) => a.day - b.day);
  let currentDayAdvanced = 0;

  for (let i = 0; i < events.length; i++) {
    if (!result.voyage) break;
    const event = events[i];
    const daysToAdvance = event.day - currentDayAdvanced;

    result = advanceVoyageDays(result, daysToAdvance);
    currentDayAdvanced += daysToAdvance;

    if (event.type === "combat") {
      const { world: newWorld, stopped } = processCombatEvent(
        result,
        event,
        i,
        voyage,
      );
      result = newWorld;
      if (stopped) return result;
    } else if (event.type === "storm") {
      result = applyStormEvent(result, event);
      result = gainExp(result, EVENT_EXP);
    } else {
      result = applyGoldChange(result, event.goldChange);
      result = applyCargoLoss(result, event.cargoLoss);
      result = gainExp(result, EVENT_EXP);
    }
  }

  return finalizeVoyageArrival(result);
}
