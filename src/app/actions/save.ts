"use server"

import { prisma } from "../../lib/prisma"
import { loadWorld, saveWorld } from "../../lib/repository"
import { buildHarborView } from "../../game/view-builder/buildGameView"
import type { HarborView } from "../../types/game-view"
/**
 * 加载或创建游戏存档
 * 无参数，始终操作 slot 0（自动存档）
 */
export async function loadGame(): Promise<HarborView> {
  return await prisma.$transaction(async (tx) => {
    const world = await loadWorld(tx)
    return buildHarborView(world)
  })
}
