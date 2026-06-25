"use server"

import { prisma } from "../../lib/prisma"
import { loadWorld, saveWorld } from "../../lib/repository"
import { arriveAtPort } from "../../game/domain/navigation"
import { buildHarborView } from "../../game/view-builder/buildGameView"
import type { HarborView, NavigationView } from "../../types/game-view"

export async function startTravel(
  _prev: NavigationView | null,
  formData: FormData,
): Promise<HarborView> {
  const targetPortId = formData.get("portId") as string
  if (!targetPortId) throw new Error("未选择目的港")

  return await prisma.$transaction(async (tx) => {
    const world = await loadWorld(tx)
    const newWorld = arriveAtPort(world, targetPortId, 0)
    await saveWorld(tx, newWorld)
    return buildHarborView(newWorld)
  })
}
