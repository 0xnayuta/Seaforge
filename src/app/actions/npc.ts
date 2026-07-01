"use server";

import { giveGift, recruitNpc, talkToNpc } from "../../game/domain/npc";
import { checkQuestProgress } from "../../game/domain/quest";
import { buildNpcDetailView } from "../../game/view-builder/buildGameView";
import { getErrorMessage } from "../../lib/domain-errors";
import { prisma } from "../../lib/prisma";
import { loadWorld, saveWorld } from "../../lib/repository";
import type { NpcDetailView } from "../../types/game-view";
import type { PrismaTransactionClient } from "../../types/prisma";

export async function loadNpcView(
  npcId: string,
): Promise<NpcDetailView | null> {
  const world = await loadWorld(prisma);
  return buildNpcDetailView(world, npcId);
}

export async function talkToNpcAction(npcId: string): Promise<void> {
  try {
    await prisma.$transaction(async (tx: PrismaTransactionClient) => {
      const world = await loadWorld(tx);
      const nextWorld = checkQuestProgress(world);
      const result = talkToNpc(nextWorld, npcId);
      await saveWorld(tx, result);
    });
  } catch (e) {
    throw new Error(getErrorMessage(e));
  }
}

export async function giveGiftAction(
  npcId: string,
  itemUid: string,
): Promise<void> {
  try {
    await prisma.$transaction(async (tx: PrismaTransactionClient) => {
      const world = await loadWorld(tx);
      const nextWorld = checkQuestProgress(world);
      const result = giveGift(nextWorld, npcId, itemUid);
      await saveWorld(tx, result);
    });
  } catch (e) {
    throw new Error(getErrorMessage(e));
  }
}

export async function recruitNpcAction(npcId: string): Promise<void> {
  try {
    await prisma.$transaction(async (tx: PrismaTransactionClient) => {
      const world = await loadWorld(tx);
      const nextWorld = checkQuestProgress(world);
      const result = recruitNpc(nextWorld, npcId);
      await saveWorld(tx, result);
    });
  } catch (e) {
    throw new Error(getErrorMessage(e));
  }
}
