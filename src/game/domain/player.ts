import { STARTING_DAY, STARTING_GOLD } from "../../data/formulas";
import { SHIPS } from "../../data/ships";
import { applyDayPass, initMarketPrices } from "./market";
import type { World } from "./types";

// ============================================================
// 玩家 / 世界初始化的纯函数
// ============================================================

export function createDefaultWorld(): World {
  const defaultShip = SHIPS[0]; // sloop

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
      currentHp: defaultShip.baseHp,
      maxHp: defaultShip.baseHp,
      armamentLevel: 0,
      cargo: [],
    },
    market: initMarketPrices(),
    voyage: null,
  };
}

/**
 * 推进 N 天：玩家天数 + 全市场价格向均衡回归 + 随机波动。
 * 每次航行到达时调用，天数等于航行耗时。
 */
export function advanceDay(world: World, days: number): World {
  let result: World = {
    ...world,
    player: {
      ...world.player,
      day: world.player.day + days,
    },
  };

  // 每过一天，价格推进一次
  for (let i = 0; i < days; i++) {
    result = applyDayPass(result);
  }

  return result;
}
