"use server";

import {
  buyEquipment,
  equipItem,
  sellEquipment,
  unequipItem,
} from "../../game/domain/equipment";
import type { World } from "../../game/domain/types";
import { buildShipyardView } from "../../game/view-builder/buildGameView";
import { getErrorMessage } from "../../lib/domain-errors";
import { prisma } from "../../lib/prisma";
import { loadWorld, saveWorld } from "../../lib/repository";
import type { ShipyardView } from "../../types/game-view";
import type { PrismaTransactionClient } from "../../types/prisma";

/** 装备操作事务管道：读档 → domain → 保存 → 返回 ShipyardView */
async function shipyardTx(
  domainFn: (world: World) => World,
  shipId: string,
): Promise<ShipyardView> {
  try {
    return await prisma.$transaction(async (tx: PrismaTransactionClient) => {
      const world = await loadWorld(tx);
      const nextWorld = domainFn(world);
      await saveWorld(tx, nextWorld);
      return buildShipyardView(nextWorld, shipId);
    });
  } catch (e) {
    throw new Error(getErrorMessage(e));
  }
}

export async function buyEquipmentAction(
  formData: FormData,
): Promise<ShipyardView> {
  const equipmentId = formData.get("equipmentId") as string;
  const shipId = formData.get("shipId") as string;
  if (!equipmentId) throw new Error("未选择装备");
  if (!shipId) throw new Error("未指定船只");
  return shipyardTx((w) => buyEquipment(w, equipmentId), shipId);
}

export async function sellEquipmentAction(
  formData: FormData,
): Promise<ShipyardView> {
  const equipmentId = formData.get("equipmentId") as string;
  const shipId = formData.get("shipId") as string;
  if (!equipmentId) throw new Error("未选择装备");
  if (!shipId) throw new Error("未指定船只");
  return shipyardTx((w) => sellEquipment(w, equipmentId), shipId);
}

export async function equipItemAction(
  formData: FormData,
): Promise<ShipyardView> {
  const shipId = formData.get("shipId") as string;
  const equipmentId = formData.get("equipmentId") as string;
  if (!shipId || !equipmentId) throw new Error("未指定船只或装备");
  return shipyardTx((w) => equipItem(w, shipId, equipmentId), shipId);
}

export async function unequipItemAction(
  formData: FormData,
): Promise<ShipyardView> {
  const shipId = formData.get("shipId") as string;
  const equipmentId = formData.get("equipmentId") as string;
  if (!shipId || !equipmentId) throw new Error("未指定船只或装备");
  return shipyardTx((w) => unequipItem(w, shipId, equipmentId), shipId);
}
