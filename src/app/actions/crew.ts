"use server";

import { updateCollection } from "../../game/domain/collection";
import { fireCrew, hireCrew } from "../../game/domain/crew";
import { buildTavernView } from "../../game/view-builder/buildGameView";
import { getErrorMessage } from "../../lib/domain-errors";
import { withTransaction } from "../../lib/with-transaction";
import type { TavernView } from "../../types/game-view";

export async function hireCrewAction(formData: FormData): Promise<TavernView> {
  const quantity = Number(formData.get("quantity"));
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error("请输入招募船员的数量");
  }

  try {
    return await withTransaction(
      (w) => updateCollection(hireCrew(w, quantity)),
      buildTavernView,
    )();
  } catch (e) {
    throw new Error(getErrorMessage(e));
  }
}

export async function fireCrewAction(formData: FormData): Promise<TavernView> {
  const quantity = Number(formData.get("quantity"));
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error("请输入解雇船员的数量");
  }

  try {
    return await withTransaction(
      (w) => updateCollection(fireCrew(w, quantity)),
      buildTavernView,
    )();
  } catch (e) {
    throw new Error(getErrorMessage(e));
  }
}
