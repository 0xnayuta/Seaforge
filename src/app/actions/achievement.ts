"use server";

import { claimAchievementReward } from "../../game/domain/achievement";
import { updateCollection } from "../../game/domain/collection";
import { getErrorMessage } from "../../lib/domain-errors";
import { withTransaction } from "../../lib/with-transaction";

export async function claimAchievementRewardAction(
  achievementId: string,
): Promise<void> {
  try {
    await withTransaction(
      (w) => updateCollection(claimAchievementReward(w, achievementId)),
      () => undefined,
    )();
  } catch (e) {
    throw new Error(getErrorMessage(e));
  }
}
