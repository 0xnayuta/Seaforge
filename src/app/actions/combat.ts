"use server";

import { redirect } from "next/navigation";
import { PORTS } from "../../data/ports";
import { REGIONS } from "../../data/regions";
import {
  performCombatAction as domainPerformCombatAction,
  initPersonCombat,
} from "../../game/domain/combat-person";
import { findOrThrow, progressVoyage } from "../../game/domain/voyage";
import { buildVoyageView } from "../../game/view-builder/buildGameView";
import { getErrorMessage } from "../../lib/domain-errors";
import { withTransaction } from "../../lib/with-transaction";
import type { VoyageView } from "../../types/game-view";
/** 执行人物战斗动作 */
export async function performCombatAction(
  _prev: VoyageView | null,
  formData: FormData,
): Promise<VoyageView> {
  const actionType = formData.get("action") as string | null;
  const skillAction = formData.get("skill_action") as string | null;
  const targetId = formData.get("targetId") as string | null;

  // 技能按钮使用 skill_action 格式 "skill_<skillId>"
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
      return domainPerformCombatAction(w, {
        type: finalActionType as "attack" | "skill" | "dodge" | "parry",
        skillId: skillId ?? undefined,
        targetId: targetId ?? undefined,
      });
    }, buildVoyageView)();
  } catch (e) {
    throw new Error(getErrorMessage(e));
  }
}

/** 舰队战败后选择投降 */
export async function surrenderAfterFleetLoss(): Promise<void> {
  try {
    await withTransaction(
      (w) => {
        if (!w.voyage || !w.voyage.combatSelection) {
          throw new Error("当前没有需要选择的战斗结算");
        }

        const voyage = w.voyage;
        const outcome = voyage.events.find(
          (ev) => ev.combatOutcome && ev.combatOutcome.result !== "victory",
        )?.combatOutcome;

        const goldLost = outcome
          ? Math.floor(w.fleet.gold * 0.15)
          : Math.floor(w.fleet.gold * 0.2);

        const clearShipsCargo = w.fleet.ships.map((s) => ({
          ...s,
          cargo: [],
        }));

        const combatEventDay = voyage.events.find(
          (ev) => ev.combatOutcome && ev.combatOutcome.result !== "victory",
        )?.day;

        const remainingEvents =
          combatEventDay !== undefined
            ? voyage.events.filter(
                (ev) => !(ev.day === combatEventDay && ev.type === "combat"),
              )
            : voyage.events;

        const afterSurrender: typeof w = {
          ...w,
          fleet: {
            ...w.fleet,
            gold: Math.max(0, w.fleet.gold - goldLost),
            ships: clearShipsCargo,
          },
          voyage: {
            ...voyage,
            combatSelection: false,
            events: remainingEvents,
          },
        };

        // 继续处理剩余航行事件
        return progressVoyage(afterSurrender);
      },
      () => undefined,
    )();
  } catch (e) {
    throw new Error(getErrorMessage(e));
  }

  redirect("/");
}

/** 舰队战败后选择接舷战 */
export async function acceptBoarding(): Promise<void> {
  try {
    await withTransaction(
      (w) => {
        if (!w.voyage || !w.voyage.combatSelection) {
          throw new Error("当前没有可以进入的接舷战");
        }

        const voyage = w.voyage;
        const combatEvent = voyage.events.find(
          (ev) => ev.combatOutcome && ev.combatOutcome.result !== "victory",
        );

        if (!combatEvent) {
          throw new Error("无法找到战斗事件");
        }

        // 计算难度（复用事件进度）
        const totalElapsed = w.player.day - voyage.departureDay;
        const totalTravel = voyage.travelDays + totalElapsed;
        const progress = totalTravel > 0 ? combatEvent.day / totalTravel : 0;

        const depPort = findOrThrow(PORTS, voyage.fromPortId, "UNKNOWN_PORT");
        const arrPort = findOrThrow(PORTS, voyage.toPortId, "UNKNOWN_PORT");
        const depRegion = findOrThrow(
          REGIONS,
          depPort.regionId,
          "UNKNOWN_REGION",
        );
        const arrRegion = findOrThrow(
          REGIONS,
          arrPort.regionId,
          "UNKNOWN_REGION",
        );
        const curMod =
          depRegion.dangerModifier +
          (arrRegion.dangerModifier - depRegion.dangerModifier) * progress;
        const curDanger =
          depPort.danger + (arrPort.danger - depPort.danger) * progress;
        const difficulty = curMod * curDanger;

        // 移除当前被选择的 combat 事件，标记直接接舷战
        const remainingEvents = voyage.events.filter(
          (ev) => !(ev.day === combatEvent.day && ev.type === "combat"),
        );

        const nextWorld: typeof w = {
          ...w,
          voyage: {
            ...voyage,
            combatSelection: false,
            directBoarding: true,
            events: remainingEvents,
          },
          combat: initPersonCombat(w, difficulty),
        };

        return nextWorld;
      },
      () => undefined,
    )();
  } catch (e) {
    throw new Error(getErrorMessage(e));
  }

  redirect("/voyage");
}
