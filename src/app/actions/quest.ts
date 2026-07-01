"use server";

import {
  acceptQuest,
  checkQuestProgress,
  completeQuest,
} from "../../game/domain/quest";
import { getErrorMessage } from "../../lib/domain-errors";
import { prisma } from "../../lib/prisma";
import { loadWorld, saveWorld } from "../../lib/repository";
import type { PrismaTransactionClient } from "../../types/prisma";

export async function acceptQuestAction(questId: string): Promise<void> {
  try {
    await prisma.$transaction(async (tx: PrismaTransactionClient) => {
      const world = await loadWorld(tx);
      const nextWorld = checkQuestProgress(world);
      const result = acceptQuest(nextWorld, questId);
      await saveWorld(tx, result);
    });
  } catch (e) {
    throw new Error(getErrorMessage(e));
  }
}

export async function completeQuestAction(questId: string): Promise<void> {
  try {
    await prisma.$transaction(async (tx: PrismaTransactionClient) => {
      const world = await loadWorld(tx);
      const nextWorld = checkQuestProgress(world);
      const result = completeQuest(nextWorld, questId);
      await saveWorld(tx, result);
    });
  } catch (e) {
    throw new Error(getErrorMessage(e));
  }
}
