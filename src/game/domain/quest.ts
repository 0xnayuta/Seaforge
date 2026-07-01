// ============================================================
// 任务逻辑 — 纯函数
// ============================================================

import type { QuestConfig } from "../../data/quests";
import { QUESTS } from "../../data/quests";
import { DomainError, type World } from "./types";

/** 按 ID 获取任务配置 */
export function getQuestConfig(questId: string): QuestConfig {
  const q = QUESTS.find((x) => x.id === questId);
  if (!q) throw new DomainError("QUEST_NOT_FOUND");
  return q;
}

/**
 * 获取当前港口可接受的任务列表。
 * 过滤条件：发布港口 = 当前港口、等级达标、前置任务已完成、好感度达标、未在活跃中。
 */
export function getAvailableQuests(world: World): readonly QuestConfig[] {
  const portId = world.player.currentPortId;
  return QUESTS.filter((q) => {
    if (q.issuerPortId !== portId) return false;
    if (q.minLevel !== undefined && world.player.level < q.minLevel)
      return false;
    if (world.activeQuests.some((a) => a.questId === q.id)) return false;

    const rel = world.npcRelations[q.issuerNpcId];
    if (!rel) {
      // NPC 尚未互动过，但任务是可见的（无好感度要求时可直接接）
      if (q.minAffinity !== undefined && q.minAffinity > 0) return false;
    } else {
      if (q.minAffinity !== undefined && rel.affinity < q.minAffinity)
        return false;
    }

    // 前置任务检查
    if (q.prerequisiteQuestId) {
      if (!rel || !rel.completedQuests.includes(q.prerequisiteQuestId))
        return false;
    }

    return true;
  });
}

/** 接受任务 */
export function acceptQuest(world: World, questId: string): World {
  const q = getQuestConfig(questId);

  if (world.activeQuests.some((a) => a.questId === questId)) {
    throw new DomainError("QUEST_ALREADY_ACCEPTED");
  }
  if (world.player.currentPortId !== q.issuerPortId) {
    throw new DomainError("QUEST_NOT_AVAILABLE");
  }

  // 校验前置条件
  if (q.minLevel !== undefined && world.player.level < q.minLevel) {
    throw new DomainError("QUEST_REQUIREMENT_NOT_MET");
  }

  const rel = world.npcRelations[q.issuerNpcId];
  if (q.minAffinity !== undefined && q.minAffinity > 0) {
    if (!rel || rel.affinity < q.minAffinity) {
      throw new DomainError("AFFINITY_TOO_LOW");
    }
  }

  if (q.prerequisiteQuestId) {
    if (!rel || !rel.completedQuests.includes(q.prerequisiteQuestId)) {
      throw new DomainError("QUEST_REQUIREMENT_NOT_MET");
    }
  }

  // 计算目标值
  const target =
    q.requirement.type === "delivery"
      ? q.requirement.quantity
      : q.requirement.type === "collect"
        ? q.requirement.quantity
        : q.requirement.type === "bounty"
          ? q.requirement.count
          : 1;

  return {
    ...world,
    activeQuests: [
      ...world.activeQuests,
      { questId, progress: 0, target, acceptedAtDay: world.player.day },
    ],
  };
}

/** 检查活跃任务进度（基于当前游戏状态） */
export function checkQuestProgress(world: World): World {
  if (world.activeQuests.length === 0) return world;

  let result = world;
  for (const aq of result.activeQuests) {
    const q = getQuestConfig(aq.questId);
    const req = q.requirement;
    let newProgress = aq.progress;

    if (req.type === "delivery") {
      // 检查玩家是否在目标港口且有足够的货物
      if (world.player.currentPortId === req.toPortId) {
        const totalOnShips = world.fleet.ships.reduce(
          (sum, s) =>
            sum +
            s.cargo
              .filter((c) => c.goodId === req.goodId)
              .reduce((s2, c) => s2 + c.quantity, 0),
          0,
        );
        newProgress = Math.min(req.quantity, totalOnShips);
      }
    } else if (req.type === "collect") {
      // 检查背包中是否有目标物品
      const have = world.fleet.inventory
        .filter((i) => i.itemId === req.itemId)
        .reduce((sum, i) => sum + i.quantity, 0);
      newProgress = Math.min(req.quantity, have);
    } else if (req.type === "explore") {
      // 检查玩家是否到达目标港口
      if (world.player.currentPortId === req.targetPortId) {
        newProgress = 1;
      }
    }
    // bounty 进度由外部事件更新（combat encounter），此处不做自动检测

    if (newProgress !== aq.progress) {
      result = {
        ...result,
        activeQuests: result.activeQuests.map((a) =>
          a.questId === aq.questId ? { ...a, progress: newProgress } : a,
        ),
      };
    }
  }
  return result;
}

/** 完成任务：校验进度达标 → 发放奖励 → 从活跃列表移除 */
export function completeQuest(world: World, questId: string): World {
  const q = getQuestConfig(questId);
  const aqIdx = world.activeQuests.findIndex((a) => a.questId === questId);
  if (aqIdx === -1) throw new DomainError("QUEST_NOT_FOUND");

  const aq = world.activeQuests[aqIdx];
  if (aq.progress < aq.target) throw new DomainError("QUEST_NOT_COMPLETABLE");

  // 发放奖励
  let result: World = world;
  result = {
    ...result,
    player: {
      ...result.player,
      exp: result.player.exp + q.rewards.exp,
    },
    fleet: {
      ...result.fleet,
      gold: result.fleet.gold + q.rewards.gold,
    },
  };

  // 发放物品奖励
  if (q.rewards.itemIds) {
    const newItems = q.rewards.itemIds.map((itemId) => ({
      uid: `${itemId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      itemId,
      quantity: 1,
    }));
    result = {
      ...result,
      fleet: {
        ...result.fleet,
        inventory: [...result.fleet.inventory, ...newItems],
      },
    };
  }

  // 从活跃列表移除，记录到 NPC 关系
  result = {
    ...result,
    activeQuests: result.activeQuests.filter((_, i) => i !== aqIdx),
    npcRelations: {
      ...result.npcRelations,
      [q.issuerNpcId]: {
        ...(result.npcRelations[q.issuerNpcId] ?? {
          affinity: 0,
          recruited: false,
          dialogPhase: 0,
          completedQuests: [] as readonly string[],
        }),
        completedQuests: [
          ...(result.npcRelations[q.issuerNpcId]?.completedQuests ?? []),
          questId,
        ],
      },
    },
  };

  return result;
}

/** 增加 bounty 类任务进度（由战斗事件触发） */
export function incrementBountyProgress(world: World): World {
  if (world.activeQuests.length === 0) return world;
  let result = world;
  for (const aq of result.activeQuests) {
    const q = getQuestConfig(aq.questId);
    if (q.requirement.type === "bounty" && aq.progress < aq.target) {
      result = {
        ...result,
        activeQuests: result.activeQuests.map((a) =>
          a.questId === aq.questId
            ? { ...a, progress: Math.min(a.target, a.progress + 1) }
            : a,
        ),
      };
    }
  }
  return result;
}
