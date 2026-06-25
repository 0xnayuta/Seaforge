"use server"

import { prisma } from "../../lib/prisma"
import { loadWorld, saveWorld } from "../../lib/repository"
import { executeBuy, executeSell } from "../../game/domain/trade"
import { buildMarketView, buildCargoView } from "../../game/view-builder/buildGameView"
import type { MarketView, CargoView } from "../../types/game-view"



export async function buyGoods(
  _prev: MarketView | null,
  formData: FormData,
): Promise<MarketView> {
  const goodId = formData.get("goodId") as string
  const quantity = Number(formData.get("quantity"))

  if (!goodId || quantity <= 0) throw new Error("无效的购买请求")

  return await prisma.$transaction(async (tx) => {
    const world = await loadWorld(tx)
    const result = executeBuy(world, { goodId, quantity })
    await saveWorld(tx, result.world)
    return buildMarketView(result.world)
  })
}



export async function sellGoods(
  _prev: CargoView | null,
  formData: FormData,
): Promise<CargoView> {
  const goodId = formData.get("goodId") as string
  const quantity = Number(formData.get("quantity"))

  if (!goodId || quantity <= 0) throw new Error("无效的卖出请求")

  return await prisma.$transaction(async (tx) => {
    const world = await loadWorld(tx)
    const result = executeSell(world, { goodId, quantity })
    await saveWorld(tx, result.world)
    return buildCargoView(result.world)
  })
}
