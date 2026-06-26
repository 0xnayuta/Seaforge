import { EVENT_CONFIGS, type EventTemplate } from "../../data/events";
import { PORTS } from "../../data/ports";
import type { CargoItem, VoyageEvent, VoyageState, World } from "./types";

// ============================================================
// 航行逻辑 — 纯函数
// ============================================================

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

/** 每天最多一个事件：按权重随机选择并生成，返回 null 表示今日无事 */
function generateSingleDayEvent(
  day: number,
  events: readonly EventTemplate[],
  totalChance: number,
): VoyageEvent | null {
  const roll = Math.random();
  if (roll >= totalChance) return null;

  let cumulative = 0;
  for (const tmpl of events) {
    cumulative += tmpl.chance;
    if (roll < cumulative) {
      const goldChange =
        tmpl.minGold +
        Math.round(Math.random() * (tmpl.maxGold - tmpl.minGold));
      const cargoLoss =
        Math.random() < tmpl.cargoLossChance
          ? 1 + Math.floor(Math.random() * tmpl.maxCargoLoss)
          : 0;

      return { day, description: tmpl.triggerText, goldChange, cargoLoss };
    }
  }
  return null;
}

/** 生成航行事件（在出航时一次性确定）。每天有概率触发 0-1 个事件。 */
export function generateVoyageEvents(
  world: World,
  travelDays: number,
): readonly VoyageEvent[] {
  const port = PORTS.find((p) => p.id === world.player.currentPortId);
  const region = port?.region ?? "";
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

/**
 * 应用航行事件效果到 World（扣金币、丢失货物）。
 * 在抵达时统一处理。
 */
export function applyVoyageEvents(
  world: World,
  events: readonly VoyageEvent[],
): World {
  let result = world;

  for (const event of events) {
    // 金币变化
    if (event.goldChange !== 0) {
      result = {
        ...result,
        player: {
          ...result.player,
          gold: Math.max(0, result.player.gold + event.goldChange),
        },
      };
    }

    if (event.cargoLoss > 0 && result.ship.cargo.length > 0) {
      result = {
        ...result,
        ship: {
          ...result.ship,
          cargo: subtractCargoLoss(result.ship.cargo, event.cargoLoss),
        },
      };
    }
  }

  return result;
}

/** 创建航行状态（出航时调用） */
export function startVoyage(
  world: World,
  fromPortId: string,
  toPortId: string,
  travelDays: number,
): VoyageState {
  return {
    fromPortId,
    toPortId,
    departureDay: world.player.day,
    travelDays,
    events: generateVoyageEvents(world, travelDays),
  };
}
