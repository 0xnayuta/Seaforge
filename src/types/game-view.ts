// ============================================================
// GameView 类型 — 渲染快照
// 由 View Builder 从 World 计算生成，不进入 SQLite
// ============================================================

/** 港口总览页（/） */
export interface HarborView {
  readonly portName: string
  readonly portDescription: string
  readonly region: string
  readonly playerGold: number
  readonly cargoCount: number
  readonly cargoCapacity: number
  readonly currentDay: number
  readonly shipName: string
}

/** 交易所页（/market） */
export interface MarketView {
  readonly portName: string
  readonly goods: GoodView[]
  readonly playerGold: number
  readonly cargoCount: number
  readonly cargoCapacity: number
}

export interface GoodView {
  readonly id: string
  readonly name: string
  readonly category: string
  readonly buyPrice: number
  readonly sellPrice: number
  readonly inCargo: number
  readonly canAfford: boolean
}

/** 航海图页（/navigation） */
export interface NavigationView {
  readonly currentPortName: string
  readonly destinations: DestinationView[]
}

export interface DestinationView {
  readonly portId: string
  readonly portName: string
  readonly region: string
  readonly distance: number
  readonly travelDays: number
  readonly estimatedProfit: number
}

/** 船舱页（/cargo） */
export interface CargoView {
  readonly shipName: string
  readonly usedCapacity: number
  readonly maxCapacity: number
  readonly items: CargoItemView[]
}

export interface CargoItemView {
  readonly goodId: string
  readonly goodName: string
  readonly quantity: number
  readonly buyPrice: number
  readonly sellPrice: number
  readonly estimatedProfit: number
}

/** 造船厂页（/ship） */
export interface ShipView {
  readonly shipName: string
  readonly upgradeLevel: number
  readonly maxUpgradeLevel: number
  readonly capacity: number
  readonly speed: number
  readonly playerGold: number
  readonly upgradeCost: number | null
  readonly canUpgrade: boolean
}

/** 航行中页（/voyage） */
export interface VoyageView {
  readonly fromPortName: string
  readonly toPortName: string
  readonly travelDays: number
  readonly daysElapsed: number
  readonly isArrived: boolean
}
