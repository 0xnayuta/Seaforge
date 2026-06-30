// ============================================================
// GameView 类型 — 渲染快照
// 由 View Builder 从 World 计算生成，不进入 SQLite
// ============================================================

/** 港口总览页（/） */
export interface HarborView {
  readonly portName: string;
  readonly portDescription: string;
  readonly region: string;
  readonly playerGold: number;
  readonly cargoCount: number;
  readonly cargoCapacity: number;
  readonly currentDay: number;
  readonly shipName: string;
  readonly shipCurrentHp: number;
  readonly shipMaxHp: number;
  readonly playerLevel: number;
  readonly playerExp: number;
  readonly playerExpToNext: number;
  readonly crew: number;
  readonly maxCrew: number;
}

export interface AvailableEquipmentView {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly typeLabel: string;
  readonly effectDescription: string;
  readonly price: number;
  readonly canAfford: boolean;
}

/** 交易所页（/market） */
export interface MarketView {
  readonly portName: string;
  readonly goods: GoodView[];
  readonly playerGold: number;
  readonly cargoCount: number;
  readonly cargoCapacity: number;
}

export interface GoodView {
  readonly id: string;
  readonly name: string;
  readonly category: string;
  readonly buyPrice: number;
  readonly sellPrice: number;
  readonly inCargo: number;
  readonly canAfford: boolean;
  readonly volume: number;
  readonly priceChangePercent: number; // 行情涨跌（与世界均价对比）
  readonly cargoBuyPrice?: number; // 持仓加权平均买入价（仅当 inCargo > 0 时有值）
  readonly estimatedProfit?: number; // 当前港口预期利润
}

export interface DestinationView {
  readonly portId: string;
  readonly portName: string;
  readonly region: string;
  readonly distance: number;
  readonly travelDays: number;
  readonly estimatedProfit: number;
  readonly baseDangerScore: number;
}

/** 航海图页（/navigation） */
export interface NavigationView {
  readonly currentPortName: string;
  readonly destinations: DestinationView[];
  readonly currentCargoCount: number;
  readonly fleetShips: FleetShipSummaryView[];
  readonly crew: number;
  readonly maxCrew: number;
}

/** 船舱页（/cargo） */
export interface CargoView {
  readonly shipName: string;
  readonly usedCapacity: number;
  readonly maxCapacity: number;
  readonly effectiveCapacity: number;
  readonly items: CargoItemView[];
}

export interface CargoItemView {
  readonly goodId: string;
  readonly goodName: string;
  readonly quantity: number;
  readonly category: string;
  readonly buyPrice: number;
  readonly sellPrice: number;
  readonly volume: number;
  readonly estimatedProfit: number;
}
export interface ComponentView {
  readonly id: string;
  readonly label: string;
  readonly level: number;
  readonly maxLevel: number;
  readonly nextCost: number | null;
  readonly canUpgrade: boolean;
  readonly upgradeDescription: string;
}

export interface EquippedItemView {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly typeLabel: string;
  readonly effectDescription: string;
  readonly sellPrice: number;
}

export interface ShipView {
  readonly shipName: string;
  readonly fleetGold: number;
  readonly durability: number;
  readonly maxDurability: number;
  readonly repairCost: number;
  readonly canRepair: boolean;
  readonly blockedByVoyage: boolean;
  readonly components: ComponentView[];
  readonly equippedItems: readonly EquippedItemView[];
  readonly fleetInventory: readonly EquippedItemView[];
}

/** 舰队中单艘船只摘要 */
export interface FleetShipSummaryView {
  readonly id: string;
  readonly name: string;
  readonly typeName: string;
  readonly durability: number;
  readonly maxDurability: number;
  readonly cargoUsed: number;
  readonly cargoCapacity: number;
  readonly speed: number;
  readonly isActive: boolean;
  readonly armamentLevel: number;
  readonly armamentLabel: string;
  readonly defenseMultiplier: number;
  readonly cargo: readonly CargoItemView[];
  readonly baseCrew: number;
}

/** 当前港口可购买的船只 */
export interface AvailableShipView {
  readonly typeId: string;
  readonly name: string;
  readonly capacity: number;
  readonly speed: number;
  readonly price: number;
  readonly canAfford: boolean;
  readonly fleetFull: boolean;
}

/** 舰队管理页（/fleet） */
export interface FleetView {
  readonly ships: FleetShipSummaryView[];
  readonly maxShips: number;
  readonly fleetGold: number;
  readonly blockedByVoyage: boolean;
}

export interface ShipyardView {
  readonly portName: string;
  readonly ships: FleetShipSummaryView[];
  readonly selectedShipId: string;
  readonly selectedShipDetail: ShipView | null;
  readonly availableShips: AvailableShipView[];
  readonly availableEquipments: readonly AvailableEquipmentView[];
  readonly maxShips: number;
  readonly fleetGold: number;
  readonly blockedByVoyage: boolean;
}
/** 航行中页（/voyage） */
/** 战斗日志条目 */
export interface CombatLogEntryView {
  readonly result: string;
  readonly description: string;
  readonly hpDamage: number;
  readonly cargoLoss: number;
  readonly allCargoLost?: true;
}

export interface VoyageEventView {
  readonly day: number;
  readonly description: string;
  readonly effect: string;
  readonly combatLog?: CombatLogEntryView;
}

/** 航行中页（/voyage） */
export interface VoyageView {
  readonly fromPortName: string;
  readonly toPortName: string;
  readonly travelDays: number;
  readonly isUnderway: boolean;
  readonly events: VoyageEventView[];
  readonly fleetShipCount: number;
}
/** 航海家酒馆页（/tavern） */
export interface TavernView {
  readonly portName: string;
  readonly gold: number;
  readonly crew: number;
  readonly maxCrew: number;
  readonly minCrew: number;
  readonly hireCost: number;
  readonly maxHireable: number;
  readonly blockedByVoyage: boolean;
  readonly ships: readonly {
    readonly id: string;
    readonly name: string;
    readonly typeName: string;
    readonly baseCrew: number;
  }[];
}

/** 存档槽位预览（/saves 及启动页） */
export interface SaveSlotView {
  readonly slot: number; // 0=自动存档, 1-3=手动存档
  readonly slotName: string;
  readonly exists: boolean;
  readonly playerLevel: number;
  readonly shipCount: number;
  readonly gold: number;
  readonly currentPortName: string;
  readonly day: number;
  readonly updatedAt: string; // ISO 字符串，便于序列化
}
