"use server";

import { DUNGEONS } from "../../data/dungeons";
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

/**
 * enterDungeonAction 的 FormData 包装，用于 page.tsx 的 <form action={...}>。
 * 从表单中读取 dungeonId 隐藏字段。
 */
export async function enterDungeonFormAction(
  formData: FormData,
): Promise<void> {
  const dungeonId = formData.get("dungeonId") as string;
  await enterDungeonAction(dungeonId);
}

export async function advanceDungeonFloorAction(
  choiceId?: string,
): Promise<DungeonView> {
  try {
    // Capture dungeon state before transaction for completion summary
    let summary: DungeonView | null = null;
    return await withTransaction(
      (w) => {
        const dungeon = w.dungeon;
        if (dungeon) {
          const config = DUNGEONS.find((d) => d.id === dungeon.dungeonId);
          const willComplete =
            config && dungeon.currentFloor + 1 >= config.floors.length;
          if (willComplete) {
            summary = {
              dungeonId: dungeon.dungeonId,
              name: config!.name,
              currentFloor: dungeon.currentFloor,
              totalFloors: dungeon.totalFloors,
              hpLoss: dungeon.hpLoss,
              goldGained: dungeon.goldGained + config!.completionReward.gold,
              itemsGained: [
                ...dungeon.itemsGained,
                ...(config!.completionReward.itemIds ?? []),
              ],
              status: "cleared" as const,
              currentEvent: null,
              combatView: null,
            };
          }
        }
        return updateCollection(advanceDungeonFloor(w, choiceId));
      },
      (w) => buildDungeonView(w) ?? summary!,
    )();
  } catch (e) {
    throw new Error(getErrorMessage(e));
  }
}

export async function escapeDungeonAction(): Promise<DungeonView> {
  try {
    // Capture dungeon summary before domain function nullifies it
    let summary: DungeonView | null = null;
    return await withTransaction(
      (w) => {
        if (!w.dungeon) throw new Error("当前不在副本中");
        const d = w.dungeon;
        const cfg = DUNGEONS.find((c) => c.id === d.dungeonId);
        summary = {
          dungeonId: d.dungeonId,
          name: cfg?.name ?? "",
          currentFloor: d.currentFloor,
          totalFloors: d.totalFloors,
          hpLoss: d.hpLoss,
          goldGained: Math.floor(d.goldGained * 0.5),
          itemsGained: [...d.itemsGained],
          status: "failed",
          currentEvent: null,
          combatView: null,
        };
        return updateCollection(escapeDungeon(w));
      },
      (w) => buildDungeonView(w) ?? summary!,
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
