"use server";

import {
  acceptQuest,
  checkQuestProgress,
  completeQuest,
} from "../../game/domain/quest";
import { getErrorMessage } from "../../lib/domain-errors";
import { withTransaction } from "../../lib/with-transaction";

export async function acceptQuestAction(questId: string): Promise<void> {
  try {
    await withTransaction(
      (w) => acceptQuest(checkQuestProgress(w), questId),
      () => undefined,
    )();
  } catch (e) {
    throw new Error(getErrorMessage(e));
  }
}

export async function completeQuestAction(questId: string): Promise<void> {
  try {
    await withTransaction(
      (w) => completeQuest(checkQuestProgress(w), questId),
      () => undefined,
    )();
  } catch (e) {
    throw new Error(getErrorMessage(e));
  }
}
