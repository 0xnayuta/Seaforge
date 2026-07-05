"use server";

import { updateCollection } from "../../game/domain/collection";
import { craftEquipment } from "../../game/domain/crafting";
import type { World } from "../../game/domain/types";
import { buildCraftingView } from "../../game/view-builder/buildGameView";
import { getErrorMessage } from "../../lib/domain-errors";
import { prisma } from "../../lib/prisma";
import { loadWorld } from "../../lib/repository";
import { withTransaction } from "../../lib/with-transaction";
import type { CraftingView } from "../../types/game-view";

export async function craftEquipmentAction(
  recipeId: string,
): Promise<CraftingView> {
  try {
    return await withTransaction(
      (w: World) => updateCollection(craftEquipment(w, recipeId)),
      buildCraftingView,
    )();
  } catch (e) {
    throw new Error(getErrorMessage(e));
  }
}

export async function loadCraftingView(): Promise<CraftingView> {
  const world = await loadWorld(prisma);
  return buildCraftingView(world);
}
