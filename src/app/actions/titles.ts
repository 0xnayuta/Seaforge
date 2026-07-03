"use server";

import { selectTitle } from "../../game/domain/title";
import {
  buildHarborView,
  buildTitlesView,
} from "../../game/view-builder/buildGameView";
import { getErrorMessage } from "../../lib/domain-errors";
import { prisma } from "../../lib/prisma";
import { loadWorld } from "../../lib/repository";
import { withTransaction } from "../../lib/with-transaction";
import type { HarborView, TitlesView } from "../../types/game-view";

export async function loadTitlesView(): Promise<TitlesView> {
  const world = await loadWorld(prisma);
  return buildTitlesView(world);
}
export async function selectTitleAction(
  formData: FormData,
): Promise<HarborView> {
  const titleId = formData.get("titleId") as string | null;
  try {
    return await withTransaction(
      (w) => selectTitle(w, titleId),
      buildHarborView,
    )();
  } catch (e) {
    throw new Error(getErrorMessage(e));
  }
}
