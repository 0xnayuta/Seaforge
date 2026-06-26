import type { World, VoyageState, VoyageEvent, CargoItem } from "./types"

// ============================================================
// 航行逻辑 — 纯函数
// ============================================================

// 随机事件表
interface EventTemplate {
  readonly chance: number        // 每天触发概率
  readonly minGold: number       // 金币变化范围（负=损失）
  readonly maxGold: number
  readonly cargoLossChance: number // 丢失货物的概率
  readonly maxCargoLoss: number    // 最多丢多少单位
  readonly description: string
}

const VOYAGE_EVENTS: readonly EventTemplate[] = [
  {
    chance: 0.25,
    minGold: 0,
    maxGold: 0,
    cargoLossChance: 0,
    maxCargoLoss: 0,
    description: "海面风平浪静，航行顺利",
  },
  {
    chance: 0.18,
    minGold: 20,
    maxGold: 80,
    cargoLossChance: 0,
    maxCargoLoss: 0,
    description: "遇到一群海豚，心情大好",
  },
  {
    chance: 0.12,
    minGold: -50,
    maxGold: -10,
    cargoLossChance: 0,
    maxCargoLoss: 0,
    description: "一阵狂风暴雨，甲板上有物品被吹落海中",
  },
  {
    chance: 0.10,
    minGold: 50,
    maxGold: 200,
    cargoLossChance: 0,
    maxCargoLoss: 0,
    description: "发现了一艘遇难商船，打捞到一些财宝",
  },
  {
    chance: 0.08,
    minGold: 0,
    maxGold: 0,
    cargoLossChance: 1,
    maxCargoLoss: 3,
    description: "遭遇海盗袭击，部分货物被掠夺",
  },
  {
    chance: 0.07,
    minGold: -100,
    maxGold: -30,
    cargoLossChance: 0.5,
    maxCargoLoss: 2,
    description: "遭遇风暴袭击，货物损毁，还损失了一些金币",
  },
  {
    chance: 0.05,
    minGold: 100,
    maxGold: 500,
    cargoLossChance: 0,
    maxCargoLoss: 0,
    description: "在海上发现一座无人小岛，找到了宝藏",
  },
]

/** 每天最多一个事件：按权重随机选择并生成，返回 null 表示今日无事 */
function generateSingleDayEvent(
  day: number,
  totalChance: number,
): VoyageEvent | null {
  const roll = Math.random()
  if (roll >= totalChance) return null

  let cumulative = 0
  for (const tmpl of VOYAGE_EVENTS) {
    cumulative += tmpl.chance
    if (roll < cumulative) {
      const goldChange =
        tmpl.minGold +
        Math.round(Math.random() * (tmpl.maxGold - tmpl.minGold))
      const cargoLoss =
        Math.random() < tmpl.cargoLossChance
          ? 1 + Math.floor(Math.random() * tmpl.maxCargoLoss)
          : 0

      return { day, description: tmpl.description, goldChange, cargoLoss }
    }
  }
  return null
}


/*
 * 生成航行事件（在出航时一次性确定）。
 * 每天有概率触发 0-1 个事件。
 */
export function generateVoyageEvents(
  _world: World,
  travelDays: number,
): readonly VoyageEvent[] {
  const events: VoyageEvent[] = []
  const totalChance = VOYAGE_EVENTS.reduce((sum, t) => sum + t.chance, 0)

  for (let day = 1; day <= travelDays; day++) {
    const event = generateSingleDayEvent(day, totalChance)
    if (event) events.push(event)
  }

  return events
}

/** 随机从 cargo 中扣除指定数量货物（支持超额跨摊分） */
function subtractCargoLoss(
  cargo: readonly CargoItem[],
  lossAmount: number,
): readonly CargoItem[] {
  let remainingLoss = lossAmount
  let result = [...cargo]
  while (remainingLoss > 0 && result.length > 0) {
    const idx = Math.floor(Math.random() * result.length)
    const item = result[idx]
    if (item.quantity <= remainingLoss) {
      remainingLoss -= item.quantity
      result = result.filter((_, i) => i !== idx)
    } else {
      result = result.map((c, i) =>
        i === idx ? { ...c, quantity: c.quantity - remainingLoss } : c,
      )
      remainingLoss = 0
    }
  }
  return result
}

/**
 * 应用航行事件效果到 World（扣金币、丢失货物）。
 * 在抵达时统一处理。
 */
export function applyVoyageEvents(
  world: World,
  events: readonly VoyageEvent[],
): World {
  let result = world

  for (const event of events) {
    // 金币变化
    if (event.goldChange !== 0) {
      result = {
        ...result,
        player: {
          ...result.player,
          gold: Math.max(0, result.player.gold + event.goldChange),
        },
      }
    }

    if (event.cargoLoss > 0 && result.ship.cargo.length > 0) {
      result = {
        ...result,
        ship: {
          ...result.ship,
          cargo: subtractCargoLoss(result.ship.cargo, event.cargoLoss),
        },
      }
    }
  }

  return result
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
  }
}
