// ============================================================
// NPC 逻辑 — 纯函数
// ============================================================

import type { NpcConfig } from "../../data/npcs";
import { NPCS } from "../../data/npcs";
import { DomainError, type World } from "./types";

/** 按 ID 获取 NPC 配置，查不到抛 NPC_NOT_FOUND */
export function getNpcConfig(npcId: string): NpcConfig {
  const npc = NPCS.find((n) => n.id === npcId);
  if (!npc) throw new DomainError("NPC_NOT_FOUND");
  return npc;
}

/** 获取 NPC 关系，不存在则返回初始状态 */
function getRelation(world: World, npcId: string) {
  return (
    world.npcRelations[npcId] ?? {
      affinity: 0,
      recruited: false,
      dialogPhase: 0,
      completedQuests: [] as readonly string[],
    }
  );
}

/** 对话：推进对话阶段 */
export function talkToNpc(world: World, npcId: string): World {
  const npc = getNpcConfig(npcId);
  if (npc.portId !== world.player.currentPortId) {
    throw new DomainError("NPC_NOT_AT_THIS_PORT");
  }
  const rel = getRelation(world, npcId);
  return {
    ...world,
    npcRelations: {
      ...world.npcRelations,
      [npcId]: { ...rel, dialogPhase: rel.dialogPhase + 1 },
    },
  };
}

/** 送礼：增加好感度并消耗物品 */
export function giveGift(world: World, npcId: string, itemUid: string): World {
  const npc = getNpcConfig(npcId);
  if (npc.portId !== world.player.currentPortId) {
    throw new DomainError("NPC_NOT_AT_THIS_PORT");
  }

  const itemIdx = world.fleet.inventory.findIndex((i) => i.uid === itemUid);
  if (itemIdx === -1) throw new DomainError("ITEM_NOT_FOUND_IN_INVENTORY");

  const item = world.fleet.inventory[itemIdx];
  const pref = npc.giftPreferences.find((g) => g.itemId === item.itemId);
  if (!pref) throw new DomainError("ITEM_NOT_FOUND"); // NPC 不感兴趣

  const rel = getRelation(world, npcId);
  const newAffinity = Math.min(100, rel.affinity + pref.affinityGain);

  return {
    ...world,
    fleet: {
      ...world.fleet,
      inventory: world.fleet.inventory.filter((_, i) => i !== itemIdx),
    },
    npcRelations: {
      ...world.npcRelations,
      [npcId]: { ...rel, affinity: newAffinity },
    },
  };
}

/** @throws if NPC is not at the player's current port */
function assertNpcAtPort(npc: NpcConfig, currentPortId: string): void {
  if (npc.portId !== currentPortId) {
    throw new DomainError("NPC_NOT_AT_THIS_PORT");
  }
}

/** Validate all recruit conditions; throws DomainError on first failure */
function validateRecruitConditions(world: World, npcId: string): void {
  const npc = getNpcConfig(npcId);
  if (!npc.recruitable) throw new DomainError("NPC_NOT_RECRUITABLE");

  const rel = getRelation(world, npcId);
  if (rel.recruited) throw new DomainError("NPC_ALREADY_RECRUITED");

  const cond = npc.recruitCondition;
  if (!cond) throw new DomainError("NPC_NOT_RECRUITABLE");

  if (rel.affinity < cond.minAffinity)
    throw new DomainError("AFFINITY_TOO_LOW");
  if (world.fleet.gold < cond.goldCost)
    throw new DomainError("INSUFFICIENT_GOLD");

  if (cond.requiredQuestIds) {
    for (const qId of cond.requiredQuestIds) {
      if (!rel.completedQuests.includes(qId)) {
        throw new DomainError("QUEST_REQUIREMENT_NOT_MET");
      }
    }
  }
}

/** 招募 NPC 为船长 */
export function recruitNpc(world: World, npcId: string): World {
  // Guard clauses
  const npc = getNpcConfig(npcId);
  assertNpcAtPort(npc, world.player.currentPortId);
  validateRecruitConditions(world, npcId);

  // Business logic
  const rel = getRelation(world, npcId);
  const cond = npc.recruitCondition!;
  const recruitedCount = Object.values(world.npcRelations).filter(
    (r) => r.recruited,
  ).length;

  return {
    ...world,
    fleet: {
      ...world.fleet,
      gold: world.fleet.gold - cond.goldCost,
      maxShips: 1 + recruitedCount + 1,
    },
    npcRelations: {
      ...world.npcRelations,
      [npcId]: { ...rel, recruited: true },
    },
  };
}

/** 计算当前已招募船长数 */
export function countRecruitedCaptains(world: World): number {
  return Object.values(world.npcRelations).filter((r) => r.recruited).length;
}

/** 从已招募船长数计算 maxShips */
export function calcMaxShips(world: World): number {
  return 1 + countRecruitedCaptains(world);
}
