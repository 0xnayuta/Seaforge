"use server";
import { repairShip, upgradeShip } from "../../game/domain/ship";
import { buildShipView } from "../../game/view-builder/buildGameView";
import { prisma } from "../../lib/prisma";
import { loadWorld, saveWorld } from "../../lib/repository";
import type { ShipView } from "../../types/game-view";
import type { PrismaTransactionClient } from "../../types/prisma";

export async function loadShipView(): Promise<ShipView> {
  const world = await loadWorld(prisma);
  return buildShipView(world);
}

export async function upgradeShipAction(
  _prev: ShipView | null,
): Promise<ShipView> {
  return await prisma.$transaction(async (tx: PrismaTransactionClient) => {
    const world = await loadWorld(tx);
    const newWorld = upgradeShip(world);
    await saveWorld(tx, newWorld);
    return buildShipView(newWorld);
  });
}

export async function repairShipAction(
  _prev: ShipView | null,
): Promise<ShipView> {
  return await prisma.$transaction(async (tx: PrismaTransactionClient) => {
    const world = await loadWorld(tx);
    const newWorld = repairShip(world);
    await saveWorld(tx, newWorld);
    return buildShipView(newWorld);
  });
}
