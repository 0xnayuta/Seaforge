"use server";

import type { ComponentType } from "../../game/domain/ship";
import {
  buyShip,
  repairShip,
  sellShip,
  upgradeComponent,
} from "../../game/domain/ship";
import type { World } from "../../game/domain/types";
import { buildShipyardView } from "../../game/view-builder/buildGameView";
import { prisma } from "../../lib/prisma";
import { loadWorld, saveWorld } from "../../lib/repository";
import type { ShipyardView } from "../../types/game-view";
import type { PrismaTransactionClient } from "../../types/prisma";

/** 造船厂事务管道：读档 → domain → 保存 → 返回 ShipyardView */
async function shipyardTx(
  domainFn: (world: World) => World,
  shipId?: string,
): Promise<ShipyardView> {
  return await prisma.$transaction(async (tx: PrismaTransactionClient) => {
    const world = await loadWorld(tx);
    const nextWorld = domainFn(world);
    await saveWorld(tx, nextWorld);
    return buildShipyardView(nextWorld, shipId);
  });
}

export async function loadShipyardView(
  selectedShipId?: string,
): Promise<ShipyardView> {
  const world = await loadWorld(prisma);
  return buildShipyardView(world, selectedShipId);
}

export async function buyShipAction(formData: FormData): Promise<ShipyardView> {
  const typeId = formData.get("typeId") as string;
  if (!typeId) throw new Error("未选择船只类型");
  return shipyardTx((w) => buyShip(w, typeId));
}

export async function sellShipAction(
  formData: FormData,
): Promise<ShipyardView> {
  const shipId = formData.get("shipId") as string;
  return shipyardTx((w) => sellShip(w, shipId));
}

export async function upgradeComponentAction(
  _prev: ShipyardView | null,
  formData: FormData,
): Promise<ShipyardView> {
  const component = formData.get("component") as ComponentType;
  const shipId = formData.get("shipId") as string;
  if (!shipId) throw new Error("未指定船只");
  return shipyardTx((w) => upgradeComponent(w, shipId, component), shipId);
}

export async function repairShipAction(
  _prev: ShipyardView | null,
  formData: FormData,
): Promise<ShipyardView> {
  const shipId = formData.get("shipId") as string;
  if (!shipId) throw new Error("未指定船只");
  return shipyardTx((w) => repairShip(w, shipId), shipId);
}
