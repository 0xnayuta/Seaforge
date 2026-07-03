// ============================================================
// 成就系统领域逻辑 — 纯函数
// 成就解锁状态通过 World 数据现场推导
// ============================================================

import {
  ACHIEVEMENTS,
  type AchievementCondition,
  type AchievementReward,
} from "../../data/achievements";
import { gainExp } from "./player";
import { DomainError, type World } from "./types";

export interface AchievementProgress {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly unlocked: boolean;
  readonly claimed: boolean;
  readonly progress: number;
  readonly target: number;
  readonly reward: AchievementReward;
}

/** 获得所有成就的进度状态 */
export function getAchievementProgress(world: World): AchievementProgress[] {
  return ACHIEVEMENTS.map((a) => {
    const { progress, target } = getConditionProgress(a.condition, world);
    const unlocked = progress >= target;
    const claimed = world.claimedAchievements.includes(a.id);
    return {
      id: a.id,
      name: a.name,
      description: a.description,
      unlocked,
      claimed,
      progress,
      target,
      reward: a.reward,
    };
  });
}

/** 领取成就奖励 */
export function claimAchievementReward(
  world: World,
  achievementId: string,
): World {
  const achievement = ACHIEVEMENTS.find((a) => a.id === achievementId);
  if (!achievement) throw new DomainError("ACHIEVEMENT_NOT_FOUND");

  const { progress, target } = getConditionProgress(
    achievement.condition,
    world,
  );
  if (progress < target) throw new DomainError("ACHIEVEMENT_NOT_UNLOCKED");

  if (world.claimedAchievements.includes(achievementId)) {
    throw new DomainError("ACHIEVEMENT_ALREADY_CLAIMED");
  }

  let newWorld = world;
  if (achievement.reward.gold) {
    newWorld = {
      ...newWorld,
      fleet: {
        ...newWorld.fleet,
        gold: newWorld.fleet.gold + achievement.reward.gold,
      },
    };
  }
  if (achievement.reward.exp) {
    newWorld = gainExp(newWorld, achievement.reward.exp);
  }

  newWorld = {
    ...newWorld,
    claimedAchievements: [...newWorld.claimedAchievements, achievementId],
  };

  return newWorld;
}

// ---- 条件检查 ----

const CONDITION_HANDLERS: Record<
  AchievementCondition["type"],
  (world: World) => number
> = {
  level: (w) => w.player.level,
  totalSalesRevenue: (w) => w.player.totalSalesRevenue,
  bestSingleProfit: (w) => w.player.bestSingleProfit,
  totalMileage: (w) => w.player.totalMileage,
  combatWins: (w) => w.player.combatWins,
  voyagesCompleted: (w) => w.player.voyagesCompleted,
  portsVisited: (w) => w.collection.visitedPorts.length,
  itemsCollected: (w) => w.collection.collectedItems.length,
  shipsOwned: (w) => w.collection.ownedShips.length,
};

function getConditionProgress(
  condition: AchievementCondition,
  world: World,
): { progress: number; target: number } {
  const handler = CONDITION_HANDLERS[condition.type];
  if (!handler) {
    return { progress: 0, target: condition.threshold };
  }
  return { progress: handler(world), target: condition.threshold };
}
