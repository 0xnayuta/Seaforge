// ============================================================
// Domain Types — 游戏事实（World）
// 所有类型定义在 src/game/domain/，不依赖 React / Next.js / Prisma
// ============================================================

// ---- 商品 ----

export interface GoodId {
  readonly id: string
}

export interface CargoItem {
  readonly goodId: string
  readonly quantity: number
  readonly buyPrice: number // 每单位买入价
}

// ---- 船只 ----

export interface ShipState {
  readonly typeId: string
  readonly upgradeLevel: number
  readonly cargo: readonly CargoItem[]
}

// ---- 玩家 ----

export interface PlayerState {
  readonly name: string
  readonly gold: number
  readonly currentPortId: string
  readonly day: number
}

// ---- World（事实集合） ----

export interface World {
  readonly player: PlayerState
  readonly ship: ShipState
  // 后续 Phase 增加：
  // quests: QuestState[]
  // worldEvents: WorldEventState[]
}
