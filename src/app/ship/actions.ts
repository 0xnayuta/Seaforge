"use server";
import { repairShip, upgradeShip } from "../../game/domain/ship";
import { buildShipView } from "../../game/view-builder/buildGameView";
import { withActionState } from "../../lib/with-transaction";
import { loadWorld } from "../../lib/repository";
import { prisma } from "../../lib/prisma";
import type { ShipView } from "../../types/game-view";

/**
 * 加载造船厂视图（读档 + 组装 View）。
 * 无副作用。
 */
export async function loadShipView(): Promise<ShipView> {
  const world = await loadWorld(prisma);
  return buildShipView(world);
}

/** 升级船只（船型/货舱/速度） */
export const upgradeShipAction = withActionState(upgradeShip, buildShipView);

/** 修理船只（恢复 HP） */
export const repairShipAction = withActionState(repairShip, buildShipView);

