import {
  BASE_EXP,
  LEVEL_EXP_GROWTH,
  STARTING_DAY,
  STARTING_GOLD,
} from "../../data/formulas";
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
      currentPortId: "quanzhou",
      day: STARTING_DAY,
      level: 1,
      exp: 0,
      expToNext: BASE_EXP,
    },
    fleet: {
      ships: [
        {
          id: "ship-1",
          typeId: defaultShip.id,
          name: defaultShip.name,
          equipment: {
            hullLevel: 0,
            sailLevel: 0,
            armorLevel: 0,
            cannonLevel: 0,
          },
          durability: defaultShip.baseDurability,
          maxDurability: defaultShip.baseDurability,
          cargo: [],
          armamentLevel: 0,
          equippedItems: [],
        },
      ],
      activeShipId: "ship-1",
      maxShips: 1,
      crew: defaultShip.baseCrew,
      maxCrew: defaultShip.baseCrew * 2,
      gold: STARTING_GOLD,
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

/**
 * 给玩家增加经验，触发自动升级（可多级连升）。
 * 纯函数，返回新 World。
 */
export function gainExp(world: World, amount: number): World {
  if (amount <= 0) return world;
  return levelUp({
    ...world,
    player: { ...world.player, exp: world.player.exp + amount },
  });
}

/**
 * 递归升级：exp >= expToNext 则升级，溢出经验保留到下一级。
 */
function levelUp(world: World): World {
  const { level, exp, expToNext } = world.player;
  if (exp < expToNext) return world;
  const nextExp = exp - expToNext;
  const nextLevel = level + 1;
  const nextExpToNext = Math.floor(
    BASE_EXP * (1 + nextLevel * LEVEL_EXP_GROWTH),
  );
  return levelUp({
    ...world,
    player: {
      ...world.player,
      level: nextLevel,
      exp: nextExp,
      expToNext: nextExpToNext,
    },
  });
}
