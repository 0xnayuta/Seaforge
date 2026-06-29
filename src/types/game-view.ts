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
/** 武装配置选项 */
export interface ArmamentOptionView {
  readonly level: number;
  readonly label: string;
  readonly cargoRatio: number;
  readonly defenseMultiplier: number;
  readonly effectiveCapacity: number;
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
  readonly armamentOptions: ArmamentOptionView[];
  readonly currentCargoCount: number;
  readonly currentArmament: 0 | 1 | 2;
  readonly hpRatio: number;
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
export interface ShipView {
  readonly shipName: string;
  readonly upgradeLevel: number;
  readonly maxUpgradeLevel: number;
  readonly capacity: number;
  readonly speed: number;
  readonly playerGold: number;
  readonly upgradeCost: number | null;
  readonly canUpgrade: boolean;
  readonly blockedByVoyage: boolean;
  readonly currentHp: number;
  readonly maxHp: number;
  readonly repairCost: number;
  readonly canRepair: boolean;
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
  readonly armamentLevel: number;
  readonly armamentLabel: string;
}
