"use server";
import type { ComponentType } from "../../game/domain/ship";
import {
  getActiveShip,
  repairShip,
  upgradeComponent,
} from "../../game/domain/ship";
import { buildShipView } from "../../game/view-builder/buildGameView";
import { prisma } from "../../lib/prisma";
import { loadWorld, saveWorld } from "../../lib/repository";
import type { ShipView } from "../../types/game-view";
import type { PrismaTransactionClient } from "../../types/prisma";

export async function loadShipView(): Promise<ShipView> {
  const world = await loadWorld(prisma);
  return buildShipView(world);
}

export async function upgradeComponentAction(
  _prev: ShipView | null,
  formData: FormData,
): Promise<ShipView> {
  const component = formData.get("component") as ComponentType;

  return await prisma.$transaction(async (tx: PrismaTransactionClient) => {
    const world = await loadWorld(tx);
    const newWorld = upgradeComponent(
      world,
      getActiveShip(world).id,
      component,
    );
    await saveWorld(tx, newWorld);
    return buildShipView(newWorld);
  });
}

export async function repairShipAction(
  _prev: ShipView | null,
  _formData?: FormData,
): Promise<ShipView> {
  return await prisma.$transaction(async (tx: PrismaTransactionClient) => {
    const world = await loadWorld(tx);
    const newWorld = repairShip(world, getActiveShip(world).id);
    await saveWorld(tx, newWorld);
    return buildShipView(newWorld);
  });
}
