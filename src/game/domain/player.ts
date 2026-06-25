import type { World } from "./types"
import { STARTING_GOLD, STARTING_DAY } from "../../data/formulas"
import { SHIPS } from "../../data/ships"

// ============================================================
// 玩家 / 世界初始化的纯函数
// ============================================================

export function createDefaultWorld(): World {
  const defaultShip = SHIPS[0] // sloop

  return {
    player: {
      name: "船长",
      gold: STARTING_GOLD,
      currentPortId: "quanzhou",
      day: STARTING_DAY,
    },
    ship: {
      typeId: defaultShip.id,
      upgradeLevel: 0,
      cargo: [],
    },
  }
}

export function advanceDay(world: World, days: number): World {
  return {
    ...world,
    player: {
      ...world.player,
      day: world.player.day + days,
    },
  }
}
