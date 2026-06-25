"use server"

import { prisma } from "../../lib/prisma"
import { loadWorld } from "../../lib/repository"
import { buildMarketView } from "../../game/view-builder/buildGameView"
import type { MarketView } from "../../types/game-view"

export async function loadMarketView(): Promise<MarketView> {
  return await prisma.$transaction(async (tx) => {
    const world = await loadWorld(tx)
    return buildMarketView(world)
  })
}
