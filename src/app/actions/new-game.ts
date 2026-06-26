"use server"

import { prisma } from "../../lib/prisma"
import { createDefaultWorld } from "../../game/domain/player"
import { saveWorld } from "../../lib/repository"
import { redirect } from "next/navigation"

/**
 * 创建新游戏存档并跳转到港口页
 */
export async function createNewGame() {
  const world = createDefaultWorld()

  await prisma.$transaction(async (tx) => {
    await saveWorld(tx, world)
  })

  redirect("/")
}
