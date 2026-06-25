"use server"

import { prisma } from "../../lib/prisma"
import { loadWorld } from "../../lib/repository"
import { buildCargoView } from "../../game/view-builder/buildGameView"
import type { CargoView } from "../../types/game-view"

export async function loadCargoView(): Promise<CargoView> {
  return await prisma.$transaction(async (tx) => {
    const world = await loadWorld(tx)
    return buildCargoView(world)
  })
}
