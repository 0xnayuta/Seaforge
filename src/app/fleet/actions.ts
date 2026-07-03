"use server";

import { getActiveShip, setArmamentLevel } from "../../game/domain/ship";
import { buildFleetView } from "../../game/view-builder/buildGameView";
import { getErrorMessage } from "../../lib/domain-errors";
import { prisma } from "../../lib/prisma";
import { loadWorld } from "../../lib/repository";
import { withTransaction } from "../../lib/with-transaction";
import type { FleetView } from "../../types/game-view";

export async function loadFleetView(): Promise<FleetView> {
  const world = await loadWorld(prisma);
  return buildFleetView(world);
}

export async function switchActiveShipAction(
  formData: FormData,
): Promise<FleetView> {
  const shipId = formData.get("shipId") as string;
  if (!shipId) throw new Error("未指定船只");

  try {
    return await withTransaction((w) => {
      if (w.voyage) throw new Error("航行中无法更换旗舰");
      const shipExists = w.fleet.ships.some((s) => s.id === shipId);
      if (!shipExists) throw new Error("无效船只");
      return {
        ...w,
        fleet: { ...w.fleet, activeShipId: shipId },
      };
    }, buildFleetView)();
  } catch (e) {
    throw new Error(getErrorMessage(e));
  }
}

export async function setArmamentAction(
  formData: FormData,
): Promise<FleetView> {
  const levelRaw = formData.get("level");
  const level = parseInt(levelRaw as string, 10) as 0 | 1 | 2;
  const shipId = formData.get("shipId") as string;
  if (![0, 1, 2].includes(level)) throw new Error("无效武装等级");

  try {
    return await withTransaction((w) => {
      const targetShipId = shipId || getActiveShip(w).id;
      const shipExists = w.fleet.ships.some((s) => s.id === targetShipId);
      if (!shipExists) throw new Error("无效船只");
      return setArmamentLevel(w, targetShipId, level);
    }, buildFleetView)();
  } catch (e) {
    throw new Error(getErrorMessage(e));
  }
}
