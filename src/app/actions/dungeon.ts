"use server";

import { updateCollection } from "../../game/domain/collection";
import { performCombatAction as domainPerformCombatAction } from "../../game/domain/combat-person";
import {
  advanceDungeonFloor,
  enterDungeon,
  escapeDungeon,
} from "../../game/domain/dungeon";
import { buildDungeonView } from "../../game/view-builder/buildGameView";
import { getErrorMessage } from "../../lib/domain-errors";
import { withTransaction } from "../../lib/with-transaction";
import type { DungeonView } from "../../types/game-view";

/** buildDungeonView(null) 时返回的兜底视图 */
function buildDungeonViewSafe(
  w: Parameters<typeof buildDungeonView>[0],
): DungeonView {
  const nullView: DungeonView = {
    dungeonId: "",
    name: "",
    currentFloor: 0,
    totalFloors: 0,
    hpLoss: 0,
    goldGained: 0,
    itemsGained: [],
    status: "failed",
    currentEvent: null,
    combatView: null,
  };
  return buildDungeonView(w) ?? nullView;
}

export async function enterDungeonAction(
  dungeonId: string,
): Promise<DungeonView> {
  try {
    return await withTransaction(
      (w) => updateCollection(enterDungeon(w, dungeonId)),
      buildDungeonViewSafe,
    )();
  } catch (e) {
    throw new Error(getErrorMessage(e));
  }
}

export async function advanceDungeonFloorAction(
  choiceId?: string,
): Promise<DungeonView> {
  try {
    return await withTransaction(
      (w) => updateCollection(advanceDungeonFloor(w, choiceId)),
      buildDungeonViewSafe,
    )();
  } catch (e) {
    throw new Error(getErrorMessage(e));
  }
}

export async function escapeDungeonAction(): Promise<DungeonView> {
  try {
    return await withTransaction(
      (w) => updateCollection(escapeDungeon(w)),
      buildDungeonViewSafe,
    )();
  } catch (e) {
    throw new Error(getErrorMessage(e));
  }
}

/**
 * 副本中的战斗动作。
 * 与 performCombatAction 相同的行为，但返回 DungeonView。
 */
export async function performDungeonCombatAction(
  _prev: DungeonView | null,
  formData: FormData,
): Promise<DungeonView> {
  const actionType = formData.get("action") as string | null;
  const skillAction = formData.get("skill_action") as string | null;
  const targetId = formData.get("targetId") as string | null;

  const isSkill = skillAction?.startsWith("skill_") ?? false;
  const finalActionType = isSkill ? "skill" : (actionType ?? "attack");
  const skillId = isSkill ? skillAction!.slice(6) : null;

  if (
    finalActionType !== "attack" &&
    finalActionType !== "skill" &&
    finalActionType !== "dodge" &&
    finalActionType !== "parry"
  ) {
    throw new Error("无效的战斗动作");
  }

  try {
    return await withTransaction((w) => {
      if (!w.combat) throw new Error("当前不在战斗中");
      return updateCollection(
        domainPerformCombatAction(w, {
          type: finalActionType as "attack" | "skill" | "dodge" | "parry",
          skillId: skillId ?? undefined,
          targetId: targetId ?? undefined,
        }),
      );
    }, buildDungeonViewSafe)();
  } catch (e) {
    throw new Error(getErrorMessage(e));
  }
}
