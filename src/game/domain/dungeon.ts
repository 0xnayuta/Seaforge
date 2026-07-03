// ============================================================
// 副本系统领域逻辑 — 纯函数
// ============================================================

import {
  DUNGEONS,
  type DungeonConfig,
  type DungeonFloorEvent,
} from "../../data/dungeons";
import { initPersonCombat } from "./combat-person";
import { gainExp, gainItem } from "./player";
import { DomainError, type DungeonState, type World } from "./types";

/** 获取副本配置 */
function getDungeonConfig(dungeonId: string): DungeonConfig {
  const config = DUNGEONS.find((d) => d.id === dungeonId);
  if (!config) throw new DomainError("DUNGEON_NOT_FOUND");
  return config;
}

/** 进入副本 */
export function enterDungeon(world: World, dungeonId: string): World {
  if (world.dungeon) throw new DomainError("DUNGEON_IN_PROGRESS");
  if (world.combat) throw new DomainError("DUNGEON_IN_PROGRESS");

  const config = getDungeonConfig(dungeonId);

  // 校验港口
  if (world.player.currentPortId !== config.entryPortId) {
    throw new DomainError("DUNGEON_WRONG_PORT");
  }

  // 校验等级
  if (world.player.level < config.levelRequirement) {
    throw new DomainError("DUNGEON_LEVEL_TOO_LOW");
  }

  // 校验冷却
  const lastClearedDay = world.dungeonCooldowns[dungeonId];
  if (lastClearedDay !== undefined) {
    const nextAvailableDay = lastClearedDay + config.cooldownDays;
    if (world.player.day < nextAvailableDay) {
      throw new DomainError("DUNGEON_ON_COOLDOWN");
    }
  }

  const dungeon: DungeonState = {
    dungeonId,
    currentFloor: 0,
    totalFloors: config.floors.length,
    hpLoss: 0,
    goldGained: 0,
    itemsGained: [],
    status: "in_progress",
  };

  return { ...world, dungeon };
}

/** 推进当前楼层 */
export function advanceDungeonFloor(world: World, choiceId?: string): World {
  if (!world.dungeon) throw new DomainError("DUNGEON_NOT_IN_PROGRESS");
  if (world.dungeon.status !== "in_progress") {
    throw new DomainError("DUNGEON_NOT_IN_PROGRESS");
  }

  const config = getDungeonConfig(world.dungeon.dungeonId);

  // ---- 战斗结算：检查 combat 是否刚结束 ----
  if (world.combat) {
    if (world.combat.status === "in_progress") {
      return world; // 战斗尚未结束，等待
    }
    if (world.combat.status === "defeat") {
      return {
        ...world,
        dungeon: { ...world.dungeon, status: "failed" },
        combat: null,
      };
    }
    // victory
    const playerPart = world.combat.participants.find((p) => p.id === "player");
    const hpLossThisFight = playerPart ? playerPart.maxHp - playerPart.hp : 0;
    const result = {
      ...world,
      dungeon: {
        ...world.dungeon,
        hpLoss: world.dungeon.hpLoss + hpLossThisFight,
      },
      combat: null,
    };

    return advanceFloorToNext(result, config);
  }

  // ---- 处理当前楼层事件 ----
  const floorEvent = config.floors[world.dungeon.currentFloor];
  if (!floorEvent) throw new DomainError("DUNGEON_NOT_FOUND");

  const result = processFloorEvent(world, floorEvent, choiceId);

  // 战斗事件：战斗已初始化，等待玩家打完再推进
  // 选择事件未提供选择：等待玩家选择
  if (floorEvent.type === "choice" && !choiceId) {
    return result;
  }
  // 宝箱/选择事件：直接应用效果后推进到下一层
  if (
    floorEvent.type !== "combat" &&
    result.dungeon?.status === "in_progress"
  ) {
    return advanceFloorToNext(result, config);
  }
  return result;
}

/** 处理单个楼层事件（不推进楼层） */
function processFloorEvent(
  world: World,
  event: DungeonFloorEvent,
  choiceId?: string,
): World {
  switch (event.type) {
    case "combat": {
      // 初始化人物战斗
      const combatState = initPersonCombat(world, event.difficulty ?? 1.0);
      return { ...world, combat: combatState };
    }

    case "treasure": {
      let result = world;
      if (event.goldReward) {
        result = {
          ...result,
          fleet: {
            ...result.fleet,
            gold: result.fleet.gold + event.goldReward,
          },
        };
      }
      if (event.expReward) {
        result = gainExp(result, event.expReward);
      }
      if (event.itemRewards) {
        for (const itemId of event.itemRewards) {
          result = gainItem(result, itemId);
        }
      }
      // 记录收益
      result = {
        ...result,
        dungeon: {
          ...result.dungeon!,
          goldGained: result.dungeon!.goldGained + (event.goldReward ?? 0),
          itemsGained: [
            ...result.dungeon!.itemsGained,
            ...(event.itemRewards ?? []),
          ],
        },
      };
      return result;
    }

    case "choice": {
      if (!choiceId || !event.options) {
        // 没有选择时返回当前状态，前端展示选项
        return world;
      }
      const option = event.options.find((o) => o.id === choiceId);
      if (!option) return world;

      let result = world;
      if (option.goldReward) {
        result = {
          ...result,
          fleet: {
            ...result.fleet,
            gold: result.fleet.gold + option.goldReward,
          },
        };
      }
      if (option.expReward) {
        result = gainExp(result, option.expReward);
      }
      if (option.itemRewards) {
        for (const itemId of option.itemRewards) {
          result = gainItem(result, itemId);
        }
      }
      if (option.hpDamage) {
        result = {
          ...result,
          dungeon: {
            ...result.dungeon!,
            hpLoss: result.dungeon!.hpLoss + option.hpDamage,
          },
        };
      }
      // 记录金币收益
      if (option.goldReward) {
        result = {
          ...result,
          dungeon: {
            ...result.dungeon!,
            goldGained: result.dungeon!.goldGained + option.goldReward,
          },
        };
      }
      // 记录物品收益
      if (option.itemRewards) {
        result = {
          ...result,
          dungeon: {
            ...result.dungeon!,
            itemsGained: [
              ...result.dungeon!.itemsGained,
              ...option.itemRewards,
            ],
          },
        };
      }
      return result;
    }
  }
}

/** 推进到下一层或标记通关 */
function advanceFloorToNext(world: World, config: DungeonConfig): World {
  const nextFloor = world.dungeon!.currentFloor + 1;
  if (nextFloor >= config.floors.length) {
    return {
      ...world,
      dungeon: {
        ...world.dungeon!,
        currentFloor: nextFloor,
        status: "cleared",
      },
    };
  }
  return {
    ...world,
    dungeon: { ...world.dungeon!, currentFloor: nextFloor },
  };
}

/** 通关结算：发放完成奖励，标记冷却 */
export function completeDungeon(world: World): World {
  if (!world.dungeon) throw new DomainError("DUNGEON_NOT_IN_PROGRESS");
  if (world.dungeon.status !== "cleared") {
    throw new DomainError("DUNGEON_NOT_IN_PROGRESS");
  }

  const config = getDungeonConfig(world.dungeon.dungeonId);
  let result = world;

  // 发放通关奖励
  result = {
    ...result,
    fleet: {
      ...result.fleet,
      gold: result.fleet.gold + config.completionReward.gold,
    },
  };
  result = gainExp(result, config.completionReward.exp);
  if (config.completionReward.itemIds) {
    for (const itemId of config.completionReward.itemIds) {
      result = gainItem(result, itemId);
    }
  }

  // 标记冷却
  result = {
    ...result,
    dungeon: null,
    dungeonCooldowns: {
      ...result.dungeonCooldowns,
      [world.dungeon.dungeonId]: result.player.day,
    },
  };

  return result;
}

/** 中途退出：保留 50% 累计金币和物品，丢弃副本状态 */
/** 中途退出：保留 50% 累计金币，全部物品 */
export function escapeDungeon(world: World): World {
  if (!world.dungeon) throw new DomainError("DUNGEON_NOT_IN_PROGRESS");
  if (world.dungeon.status !== "in_progress") {
    throw new DomainError("DUNGEON_NOT_IN_PROGRESS");
  }

  // 金币/物品已在 processFloorEvent 中全额发放到 fleet/inventory，
  // 此处减去超发的 50% 金币，实现保留 50% 的语义
  // 物品保留全部（已在 inventory 中，不移除）
  const excessGold = Math.floor(world.dungeon.goldGained * 0.5);
  const result: World = { ...world, dungeon: null, combat: null };
  return excessGold > 0
    ? {
        ...result,
        fleet: { ...result.fleet, gold: result.fleet.gold - excessGold },
      }
    : result;
}

/** 副本进入失败处理（如战斗失败） */
export function failDungeon(world: World): World {
  if (!world.dungeon) throw new DomainError("DUNGEON_NOT_IN_PROGRESS");
  return {
    ...world,
    dungeon: { ...world.dungeon, status: "failed" },
    combat: null,
  };
}

/** 获取当前楼层事件（供 View Builder 使用） */
export function getCurrentFloorEvent(world: World): DungeonFloorEvent | null {
  if (!world.dungeon) return null;
  const config = DUNGEONS.find((d) => d.id === world.dungeon!.dungeonId);
  if (!config) return null;
  return config.floors[world.dungeon.currentFloor] ?? null;
}
