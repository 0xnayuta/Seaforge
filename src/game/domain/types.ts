import type { CombatOutcome } from "./combat";
// ============================================================
// Domain Types — 游戏事实（World）
// 所有类型定义在 src/game/domain/，不依赖 React / Next.js / Prisma
// ============================================================

// ---- 商品 ----

export interface CargoItem {
  readonly goodsId: string;
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
  /** portId → goodsId → 当前价格 */
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
  readonly combatSelection?: boolean;
  readonly directBoarding?: boolean;
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
  // 称号统计追踪
  readonly totalSalesRevenue: number;
  readonly bestSingleProfit: number;
  readonly totalMileage: number;
  readonly combatWins: number;
  readonly voyagesCompleted: number;
}

export interface CombatParticipant {
  readonly id: string; // "player", "ally-X", "enemy-X"
  readonly name: string;
  readonly type: "player" | "ally" | "enemy";
  readonly hp: number;
  readonly maxHp: number;
  readonly mp: number;
  readonly maxMp: number;
  readonly atk: number;
  readonly def: number;
  readonly mag: number;
  readonly mdf: number;
  readonly spd: number;
  readonly luk: number;
  readonly level: number;
  readonly weaponId: string | null;
  readonly statuses: readonly {
    readonly type:
      | "poison"
      | "bleed"
      | "burn"
      | "freeze"
      | "sleep"
      | "silence"
      | "blind";
    readonly duration: number;
  }[];
  readonly isDodging: boolean;
  readonly isParrying: boolean;
}

export interface CombatLogEntry {
  readonly round: number;
  readonly turnIndex: number;
  readonly message: string;
}

export interface PersonCombatState {
  readonly participants: readonly CombatParticipant[];
  readonly currentTurnIndex: number;
  readonly turnOrder: readonly string[]; // IDs of participants
  readonly round: number;
  readonly logs: readonly CombatLogEntry[];
  readonly status: "in_progress" | "victory" | "defeat" | "surrendered";
}

// ---- NPC 关系 ----

export interface NpcRelationState {
  readonly affinity: number; // 好感度 0-100
  readonly recruited: boolean; // 是否已招募为船长
  readonly dialogPhase: number; // 对话阶段
  readonly completedQuests: readonly string[]; // 已完成的任务 ID
}

// ---- 任务 ----

export interface ActiveQuest {
  readonly questId: string;
  readonly progress: number;
  readonly target: number;
  readonly acceptedAtDay: number;
}

// ---- 图鉴 ----

export interface CollectionState {
  readonly visitedPorts: readonly string[];
  readonly tradedGoods: readonly string[];
  readonly ownedShips: readonly string[];
  readonly collectedItems: readonly string[];
}

// ---- 副本 ----

export interface DungeonState {
  readonly dungeonId: string;
  readonly currentFloor: number;
  readonly totalFloors: number;
  readonly hpLoss: number;
  readonly goldGained: number;
  readonly itemsGained: readonly string[];
  readonly status: "in_progress" | "cleared" | "failed";
}

export interface World {
  readonly player: PlayerState;
  readonly fleet: FleetState;
  readonly market: MarketPriceState;
  readonly voyage: VoyageState | null;
  readonly combat: PersonCombatState | null;
  readonly npcRelations: Record<string, NpcRelationState>;
  readonly activeQuests: readonly ActiveQuest[];
  readonly selectedTitle: string | null;
  readonly collection: CollectionState;
  readonly claimedAchievements: readonly string[];
  readonly dungeon: DungeonState | null;
  readonly dungeonCooldowns: Record<string, number>;
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
  | "EQUIPMENT_SLOT_INVALID"
  | "NOT_IN_COMBAT"
  | "NOT_YOUR_TURN"
  | "INVALID_COMBAT_TARGET"
  | "INSUFFICIENT_MP"
  | "INVALID_COMBAT_ACTION"
  | "SILENCED"
  | "NPC_NOT_FOUND"
  | "AFFINITY_TOO_LOW"
  | "NPC_NOT_RECRUITABLE"
  | "NPC_ALREADY_RECRUITED"
  | "NPC_NOT_AT_THIS_PORT"
  | "QUEST_NOT_FOUND"
  | "QUEST_ALREADY_ACCEPTED"
  | "QUEST_NOT_AVAILABLE"
  | "QUEST_NOT_COMPLETABLE"
  | "QUEST_REQUIREMENT_NOT_MET"
  | "ITEM_NOT_FOUND_IN_INVENTORY"
  | "TITLE_NOT_FOUND"
  | "TITLE_NOT_UNLOCKED"
  | "ACHIEVEMENT_NOT_FOUND"
  | "ACHIEVEMENT_NOT_UNLOCKED"
  | "ACHIEVEMENT_ALREADY_CLAIMED"
  | "DUNGEON_NOT_FOUND"
  | "DUNGEON_WRONG_PORT"
  | "DUNGEON_LEVEL_TOO_LOW"
  | "DUNGEON_ON_COOLDOWN"
  | "DUNGEON_IN_PROGRESS"
  | "DUNGEON_NOT_IN_PROGRESS"
  | "RECIPE_NOT_FOUND"
  | "INSUFFICIENT_MATERIALS"
  | "RECIPE_WRONG_PORT"
  | "RECIPE_AFFINITY_TOO_LOW";
