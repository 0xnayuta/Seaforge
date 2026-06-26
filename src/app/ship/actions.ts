"use server";
import { repairShip, upgradeShip } from "../../game/domain/ship";
import type { World } from "../../game/domain/types";
import { buildShipView } from "../../game/view-builder/buildGameView";
import { prisma } from "../../lib/prisma";
import { loadWorld, saveWorld } from "../../lib/repository";
import type { ShipView } from "../../types/game-view";
import type { PrismaTransactionClient } from "../../types/prisma";

/**
 * 加载造船厂视图（读档 + 组装 View）。
 * 无副作用。
 */
export async function loadShipView(): Promise<ShipView> {
  const world = await loadWorld(prisma);
  return buildShipView(world);
}

/**
 * 执行船只操作（升级/修理）的通用事务模板。
 * 读档 → 执行域变换 → 保存 → 返回新 View。
 */
function performShipAction(
  transform: (world: World) => World,
): (_prev: ShipView | null) => Promise<ShipView> {
  return async (_prev) =>
    await prisma.$transaction(async (tx: PrismaTransactionClient) => {
      const world = await loadWorld(tx);
      const newWorld = transform(world);
      await saveWorld(tx, newWorld);
      return buildShipView(newWorld);
    });
}

/** 升级船只（船型/货舱/速度） */
export const upgradeShipAction = performShipAction(upgradeShip);

/** 修理船只（恢复 HP） */
export const repairShipAction = performShipAction(repairShip);
