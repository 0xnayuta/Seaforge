// ============================================================
// 任务逻辑 — 纯函数
// ============================================================

import { QUESTS, type QuestConfig } from "../../data/quests";
import { type ActiveQuest, DomainError, type World } from "./types";

let _uidCounter = 0;
export function resetUidCounter(): void {
  _uidCounter = 0;
}
function defaultUidGenerator(): string {
  _uidCounter++;
  return `quest-item-${_uidCounter}`;
}

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

/** 校验接受任务的前置条件 */
function validateQuestAccept(world: World, q: QuestConfig): void {
  if (world.activeQuests.some((a) => a.questId === q.id)) {
    throw new DomainError("QUEST_ALREADY_ACCEPTED");
  }
  if (world.player.currentPortId !== q.issuerPortId) {
    throw new DomainError("QUEST_NOT_AVAILABLE");
  }
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
}

/** 根据 requirement 类型计算任务目标值 */
function getQuestTarget(q: QuestConfig): number {
  switch (q.requirement.type) {
    case "delivery":
      return q.requirement.quantity;
    case "collect":
      return q.requirement.quantity;
    case "bounty":
      return q.requirement.count;
    default:
      return 1;
  }
}

/** 接受任务 */
export function acceptQuest(world: World, questId: string): World {
  const q = getQuestConfig(questId);
  validateQuestAccept(world, q);
  return {
    ...world,
    activeQuests: [
      ...world.activeQuests,
      {
        questId,
        progress: 0,
        target: getQuestTarget(q),
        acceptedAtDay: world.player.day,
      },
    ],
  };
}

/** 计算单个活跃任务的当前进度（根据 quest config 的 requirement 类型） */
function calcQuestProgress(aq: ActiveQuest, world: World): number {
  const q = getQuestConfig(aq.questId);
  const req = q.requirement;

  switch (req.type) {
    case "delivery": {
      if (world.player.currentPortId !== req.toPortId) return aq.progress;
      const totalOnShips = world.fleet.ships.reduce(
        (sum, s) =>
          sum +
          s.cargo
            .filter((c) => c.goodId === req.goodId)
            .reduce((s2, c) => s2 + c.quantity, 0),
        0,
      );
      return Math.min(req.quantity, totalOnShips);
    }
    case "collect": {
      const have = world.fleet.inventory
        .filter((i) => i.itemId === req.itemId)
        .reduce((sum, i) => sum + i.quantity, 0);
      return Math.min(req.quantity, have);
    }
    case "explore": {
      return world.player.currentPortId === req.targetPortId ? 1 : aq.progress;
    }
    default:
      // bounty 进度由外部事件更新（combat encounter），此处不做自动检测
      return aq.progress;
  }
}

/** Iterate active quests, threading the accumulated world through each callback */
function forEachActiveQuest(
  world: World,
  fn: (aq: ActiveQuest, current: World) => World,
): World {
  if (world.activeQuests.length === 0) return world;
  let result = world;
  for (const aq of result.activeQuests) {
    result = fn(aq, result);
  }
  return result;
}

/** 检查活跃任务进度（基于当前游戏状态） */
export function checkQuestProgress(world: World): World {
  return forEachActiveQuest(world, (aq, current) => {
    const newProgress = calcQuestProgress(aq, world);
    if (newProgress !== aq.progress) {
      return {
        ...current,
        activeQuests: current.activeQuests.map((a) =>
          a.questId === aq.questId ? { ...a, progress: newProgress } : a,
        ),
      };
    }
    return current;
  });
}

/** 完成任务：校验进度达标 → 发放奖励 → 从活跃列表移除 */
export function completeQuest(
  world: World,
  questId: string,
  generateUid: () => string = defaultUidGenerator,
): World {
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
      uid: generateUid(),
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
  return forEachActiveQuest(world, (aq, current) => {
    const q = getQuestConfig(aq.questId);
    if (q.requirement.type === "bounty" && aq.progress < aq.target) {
      return {
        ...current,
        activeQuests: current.activeQuests.map((a) =>
          a.questId === aq.questId
            ? { ...a, progress: Math.min(a.target, a.progress + 1) }
            : a,
        ),
      };
    }
    return current;
  });
}
