import { prisma } from "../lib/prisma"
import { createDefaultWorld } from "../game/domain/player"
import { initMarketPrices } from "../game/domain/market"
import { buildHarborView } from "../game/view-builder/buildGameView"
import type { World } from "../game/domain/types"
import { NewGameForm } from "./NewGameForm"
import { HarborDashboard } from "./HarborDashboard"

export default async function HarborPage() {
  const save = await prisma.save.findUnique({
    where: { slot: 0 },
  })

  if (!save) {
    return <NewGameForm />
  }

  const world = JSON.parse(save.data) as World

  // 迁移：旧存档没有 market 字段 → 初始化价格
  const hydratedWorld: World = world.market
    ? world
    : { ...world, market: initMarketPrices() }

  const view = buildHarborView(hydratedWorld)
  return <HarborDashboard view={view} />
}
