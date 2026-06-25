"use server"

import { prisma } from "../../lib/prisma"
import { loadWorld } from "../../lib/repository"
import { buildShipView } from "../../game/view-builder/buildGameView"
import type { ShipView } from "../../types/game-view"

export async function loadShipView(): Promise<ShipView> {
  return await prisma.$transaction(async (tx) => {
    const world = await loadWorld(tx)
    return buildShipView(world)
  })
}
