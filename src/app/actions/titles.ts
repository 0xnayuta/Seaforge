"use server";

import { selectTitle } from "../../game/domain/title";
import {
  buildHarborView,
  buildTitlesView,
} from "../../game/view-builder/buildGameView";
import { getErrorMessage } from "../../lib/domain-errors";
import { prisma } from "../../lib/prisma";
import { loadWorld, saveWorld } from "../../lib/repository";
import type { HarborView, TitlesView } from "../../types/game-view";
import type { PrismaTransactionClient } from "../../types/prisma";

export async function loadTitlesView(): Promise<TitlesView> {
  const world = await loadWorld(prisma);
  return buildTitlesView(world);
}

/** 选中/取消称号 */
export async function selectTitleAction(
  formData: FormData,
): Promise<HarborView> {
  const titleId = formData.get("titleId") as string | null;
  try {
    return await prisma.$transaction(async (tx: PrismaTransactionClient) => {
      const world = await loadWorld(tx);
      const nextWorld = selectTitle(world, titleId);
      await saveWorld(tx, nextWorld);
      return buildHarborView(nextWorld);
    });
  } catch (e) {
    throw new Error(getErrorMessage(e));
  }
}
