"use server";

import { redirect } from "next/navigation";
import { PORTS } from "../../data/ports";
import { REGIONS } from "../../data/regions";
import {
  executePersonCombatAction,
  initPersonCombat,
} from "../../game/domain/combat-person";
import { findOrThrow, progressVoyage } from "../../game/domain/voyage";
import { buildVoyageView } from "../../game/view-builder/buildGameView";
import { getErrorMessage } from "../../lib/domain-errors";
import { prisma } from "../../lib/prisma";
import { loadWorld, saveWorld } from "../../lib/repository";
import type { VoyageView } from "../../types/game-view";
import type { PrismaTransactionClient } from "../../types/prisma";
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
    return await prisma.$transaction(async (tx: PrismaTransactionClient) => {
      const world = await loadWorld(tx);
      if (!world.combat) throw new Error("当前不在战斗中");

      const nextWorld = executePersonCombatAction(world, {
        type: finalActionType as "attack" | "skill" | "dodge" | "parry",
        skillId: skillId ?? undefined,
        targetId: targetId ?? undefined,
      });

      await saveWorld(tx, nextWorld);
      return buildVoyageView(nextWorld);
    });
  } catch (e) {
    throw new Error(getErrorMessage(e));
  }
}

/** 舰队战败后选择投降 */
export async function surrenderAfterFleetLoss(): Promise<void> {
  try {
    await prisma.$transaction(async (tx: PrismaTransactionClient) => {
      const world = await loadWorld(tx);
      if (!world.voyage || !world.voyage.combatSelection) {
        throw new Error("当前没有需要选择的战斗结算");
      }

      const voyage = world.voyage;
      const outcome = voyage.events.find(
        (ev) => ev.combatOutcome && ev.combatOutcome.result !== "victory",
      )?.combatOutcome;

      // 投降：根据舰队战败结果扣减
      const goldLost = outcome
        ? Math.floor(world.fleet.gold * 0.15)
        : Math.floor(world.fleet.gold * 0.2);

      const clearShipsCargo = world.fleet.ships.map((s) => ({
        ...s,
        cargo: [],
      }));

      // 找到战斗事件并移除
      const combatEventDay = voyage.events.find(
        (ev) => ev.combatOutcome && ev.combatOutcome.result !== "victory",
      )?.day;

      const remainingEvents =
        combatEventDay !== undefined
          ? voyage.events.filter(
              (ev) => !(ev.day === combatEventDay && ev.type === "combat"),
            )
          : voyage.events;

      const afterSurrender: typeof world = {
        ...world,
        fleet: {
          ...world.fleet,
          gold: Math.max(0, world.fleet.gold - goldLost),
          ships: clearShipsCargo,
        },
        voyage: {
          ...voyage,
          combatSelection: false,
          events: remainingEvents,
        },
      };

      // 继续处理剩余航行事件
      const result = progressVoyage(afterSurrender);
      await saveWorld(tx, result);
    });
  } catch (e) {
    throw new Error(getErrorMessage(e));
  }

  redirect("/");
}

/** 舰队战败后选择接舷战 */
export async function acceptBoarding(): Promise<void> {
  try {
    await prisma.$transaction(async (tx: PrismaTransactionClient) => {
      const world = await loadWorld(tx);
      if (!world.voyage || !world.voyage.combatSelection) {
        throw new Error("当前没有可以进入的接舷战");
      }

      const voyage = world.voyage;
      const combatEvent = voyage.events.find(
        (ev) => ev.combatOutcome && ev.combatOutcome.result !== "victory",
      );

      if (!combatEvent) {
        throw new Error("无法找到战斗事件");
      }

      // 计算难度（复用事件进度）
      const totalElapsed = world.player.day - voyage.departureDay;
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

      const nextWorld: typeof world = {
        ...world,
        voyage: {
          ...voyage,
          combatSelection: false,
          directBoarding: true,
          events: remainingEvents,
        },
        combat: initPersonCombat(world, difficulty),
      };

      await saveWorld(tx, nextWorld);
    });
  } catch (e) {
    throw new Error(getErrorMessage(e));
  }

  redirect("/voyage");
}
