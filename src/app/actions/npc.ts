"use server";

import { giveGift, recruitNpc, talkToNpc } from "../../game/domain/npc";
import { checkQuestProgress } from "../../game/domain/quest";
import type { World } from "../../game/domain/types";
import { buildNpcDetailView } from "../../game/view-builder/buildGameView";
import { getErrorMessage } from "../../lib/domain-errors";
import { prisma } from "../../lib/prisma";
import { loadWorld } from "../../lib/repository";
import { withTransaction } from "../../lib/with-transaction";
import type { NpcDetailView } from "../../types/game-view";

export async function loadNpcView(
  npcId: string,
): Promise<NpcDetailView | null> {
  const world = await loadWorld(prisma);
  return buildNpcDetailView(world, npcId);
}

/** 通用 NPC 操作事务管道：读档 → checkQuestProgress → domain → 保存 */
async function npcTx(fn: (world: World) => World): Promise<void> {
  try {
    await withTransaction(
      (w) => fn(checkQuestProgress(w)),
      () => undefined,
    )();
  } catch (e) {
    throw new Error(getErrorMessage(e));
  }
}

export async function talkToNpcAction(npcId: string): Promise<void> {
  return npcTx((w) => talkToNpc(w, npcId));
}

export async function giveGiftAction(
  npcId: string,
  itemUid: string,
): Promise<void> {
  return npcTx((w) => giveGift(w, npcId, itemUid));
}

export async function recruitNpcAction(npcId: string): Promise<void> {
  return npcTx((w) => recruitNpc(w, npcId));
}
