import type { CombatOutcome } from "./combat";
// ============================================================
// Domain Types — 游戏事实（World）
// 所有类型定义在 src/game/domain/，不依赖 React / Next.js / Prisma
// ============================================================

// ---- 商品 ----

export interface CargoItem {
  readonly goodId: string;
  readonly quantity: number;
  readonly buyPrice: number; // 每单位买入价
}

export interface ItemInstance {
  readonly uid: string; // 唯一 ID（uuid）
  readonly itemId: string; // 配置 ID（对应 items.ts）
  readonly quantity: number; // 数量（消耗品/材料）
  readonly durability?: number; // 当前耐久（装备专用）
  readonly maxDurability?: number; // 耐久上限（装备专用）
  readonly upgradeLevel?: number; // 强化等级（装备专用）
  readonly affixes?: readonly string[]; // 词缀 ID 列表（预留）
  readonly equippedSlot?: string; // 已装备时标记装备位名称
}

export interface CharacterEquipment {
  readonly weapon: string | null; // uid of ItemInstance or null
  readonly armor: string | null; // uid of ItemInstance or null
  readonly accessory1: string | null; // uid of ItemInstance or null
  readonly accessory2: string | null; // uid of ItemInstance or null
}

// ---- 船只 ----

export interface ShipEquipment {
  readonly hullLevel: number; // 舱容等级
  readonly sailLevel: number; // 速度等级
  readonly armorLevel: number; // 耐久等级
  readonly cannonLevel: number; // 攻击等级
}

export interface ShipInstance {
  readonly id: string;
  readonly typeId: string;
  readonly name: string;
  readonly equipment: ShipEquipment;
  readonly durability: number;
  readonly maxDurability: number;
  readonly cargo: readonly CargoItem[];
  readonly armamentLevel: 0 | 1 | 2;
  readonly equippedItems: readonly string[];
}

export interface FleetState {
  readonly ships: readonly ShipInstance[];
  readonly activeShipId: string;
  readonly maxShips: number;
  readonly crew: number;
  readonly maxCrew: number;
  readonly gold: number;
  readonly inventory: readonly ItemInstance[];
  readonly shipEquipmentInventory: readonly string[];
}

// ---- 市场 ----

/** 每个港口每种商品的当前价格 */
export interface MarketPriceState {
  /** portId → goodId → 当前价格 */
  readonly prices: Record<string, Record<string, number>>;
}
export interface VoyageEvent {
  readonly day: number;
  readonly description: string;
  readonly goldChange: number;
  readonly cargoLoss: number;
  readonly type?: "combat" | "storm";
  readonly combatOutcome?: CombatOutcome;
}
export interface VoyageState {
  readonly fromPortId: string;
  readonly toPortId: string;
  readonly departureDay: number;
  readonly travelDays: number;
  readonly events: readonly VoyageEvent[];
  readonly fleetShipIds: readonly string[];
}
export interface PlayerState {
  readonly name: string;
  readonly currentPortId: string;
  readonly day: number;
  readonly level: number;
  readonly exp: number;
  readonly expToNext: number;
  // 核心属性
  readonly str: number;
  readonly dex: number;
  readonly int: number;
  readonly fth: number;
  readonly arc: number;
  readonly attributePoints: number;
  // 装备栏
  readonly equipment: CharacterEquipment;
}

export interface World {
  readonly player: PlayerState;
  readonly fleet: FleetState;
  readonly market: MarketPriceState;
  readonly voyage: VoyageState | null;
}

// ---- 领域错误 ----

/** 领域层只抛出错误码，不包含展示文本 */
export class DomainError extends Error {
  readonly code: string;
  constructor(code: string) {
    super(code);
    this.code = code;
    this.name = "DomainError";
  }
}

export type DomainErrorCode =
  | "INSUFFICIENT_GOLD"
  | "INSUFFICIENT_CARGO"
  | "INVALID_QUANTITY"
  | "GOOD_NOT_FOUND"
  | "CARGO_NOT_FOUND"
  | "MAX_LEVEL_REACHED"
  | "INVALID_SHIP"
  | "IN_VOYAGE"
  | "UNKNOWN_PORT"
  | "UNKNOWN_REGION"
  | "NO_PRICE_DATA"
  | "NOT_AT_PORT"
  | "CARGO_EXCEEDS_CAPACITY"
  | "FLEET_FULL"
  | "LAST_SHIP"
  | "SHIP_HAS_CARGO"
  | "SHIP_NOT_AT_PORT"
  | "EMPTY_FLEET_SELECTION"
  | "SHIP_ZERO_DURABILITY"
  | "CREW_EXCEEDS_CAPACITY"
  | "INSUFFICIENT_CREW"
  | "EQUIPMENT_NOT_FOUND"
  | "EQUIPMENT_SLOT_FULL"
  | "DUPLICATE_EQUIPMENT_TYPE"
  | "SHIP_HAS_EQUIPMENT"
  | "INSUFFICIENT_ATTRIBUTE_POINTS"
  | "ITEM_NOT_FOUND"
  | "ITEM_NOT_EQUIPPABLE"
  | "EQUIPMENT_SLOT_INVALID";
