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
  readonly npcsAtPort: readonly NpcSummaryView[];
  readonly questsAvailable: number;
  readonly selectedTitleName: string | null;
  readonly unlockedTitleCount: number;
  readonly availableDungeonName: string | null;
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
  readonly goodsId: string;
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
export interface SkillView {
  readonly skillId: string;
  readonly name: string;
  readonly mpCost: number;
  readonly type: "physical" | "magical" | "status" | "heal";
  readonly description: string;
  readonly power: number;
}

export interface CombatStatusView {
  readonly type: string;
  readonly label: string;
  readonly duration: number;
}

export interface CombatParticipantView {
  readonly id: string;
  readonly name: string;
  readonly type: "player" | "ally" | "enemy";
  readonly hp: number;
  readonly maxHp: number;
  readonly mp: number;
  readonly maxMp: number;
  readonly spd: number;
  readonly level: number;
  readonly weaponName: string | null;
  readonly statuses: readonly CombatStatusView[];
  readonly isDodging: boolean;
  readonly isParrying: boolean;
  readonly isDead: boolean;
}

export interface CombatLogView {
  readonly round: number;
  readonly message: string;
}

export interface PersonCombatView {
  readonly participants: readonly CombatParticipantView[];
  readonly turnOrder: readonly string[];
  readonly currentTurnId: string;
  readonly round: number;
  readonly logs: readonly CombatLogView[];
  readonly status: "in_progress" | "victory" | "defeat" | "surrendered";
  readonly isPlayerTurn: boolean;
  readonly availableSkills: readonly SkillView[];
}

export interface CombatChoiceView {
  readonly hasSelection: boolean;
  readonly isDirectBoarding: boolean;
  readonly difficulty: number;
}

export interface VoyageView {
  readonly fromPortName: string;
  readonly toPortName: string;
  readonly travelDays: number;
  readonly isUnderway: boolean;
  readonly events: VoyageEventView[];
  readonly fleetShipCount: number;
  readonly combatState: PersonCombatView | null;
  readonly combatChoice: CombatChoiceView | null;
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

/** 人物装备插槽项视图 */
export interface EquippedCharacterItemView {
  readonly uid: string;
  readonly itemId: string;
  readonly name: string;
  readonly typeLabel: string;
  readonly qualityLabel: string;
  readonly effectDescription: string;
  readonly description: string;
}

/** 背包物品项视图 */
export interface InventoryItemView {
  readonly uid: string;
  readonly itemId: string;
  readonly type: "weapon" | "armor" | "accessory" | "consumable" | "material";
  readonly name: string;
  readonly typeLabel: string;
  readonly qualityLabel: string;
  readonly quantity: number;
  readonly durability?: number;
  readonly maxDurability?: number;
  readonly upgradeLevel?: number;
  readonly equippedSlot?: string;
  readonly effectDescription: string;
  readonly description: string;
}

/** 人物界面视图（/character） */
export interface CharacterView {
  readonly name: string;
  readonly level: number;
  readonly exp: number;
  readonly expToNext: number;
  readonly gold: number;
  readonly attributePoints: number;
  readonly attributes: {
    readonly str: number;
    readonly dex: number;
    readonly int: number;
    readonly fth: number;
    readonly arc: number;
  };
  readonly panelStats: {
    readonly hp: number;
    readonly atk: number;
    readonly def: number;
    readonly mag: number;
    readonly mdf: number;
    readonly spd: number;
    readonly luk: number;
    readonly equipLoad: number;
  };
  readonly equipment: {
    readonly weapon: EquippedCharacterItemView | null;
    readonly armor: EquippedCharacterItemView | null;
    readonly accessory1: EquippedCharacterItemView | null;
    readonly accessory2: EquippedCharacterItemView | null;
  };
  readonly inventory: readonly InventoryItemView[];
  readonly blockedByVoyage: boolean;
}

// ---- NPC ----

export interface NpcSummaryView {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly typeLabel: string;
  readonly portName: string;
  readonly affinity: number;
  readonly recruited: boolean;
  readonly recruitable: boolean;
}

export interface NpcDetailView {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly typeLabel: string;
  readonly dialogText: string;
  readonly dialogPhase: number;
  readonly affinity: number;
  readonly maxAffinity: number;
  readonly recruited: boolean;
  readonly recruitable: boolean;
  readonly recruitCondition: {
    readonly minAffinity: number;
    readonly goldCost: number;
    readonly requiredQuestIds: readonly string[];
  } | null;
  readonly canRecruit: boolean;
  readonly availableQuests: readonly QuestSummaryView[];
  readonly completedQuests: readonly string[];
  readonly giftPreferences: readonly { itemId: string; affinityGain: number }[];
  readonly inventory: readonly InventoryItemView[];
}

// ---- 任务 ----

export interface QuestSummaryView {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly type: string;
  readonly progress: number;
  readonly target: number;
  readonly isActive: boolean;
  readonly canAccept: boolean;
}

export interface QuestDetailView {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly type: string;
  readonly progress: number;
  readonly target: number;
  readonly isActive: boolean;
  readonly canComplete: boolean;
  readonly rewards: {
    readonly gold: number;
    readonly exp: number;
    readonly items: readonly string[];
  };
  readonly issuerNpcName: string;
}

export interface QuestBoardView {
  readonly portName: string;
  readonly availableQuests: readonly QuestSummaryView[];
  readonly activeQuests: readonly QuestSummaryView[];
}

// ---- 称号 ----

/** 称号列表中单个称号的展示数据 */
export interface TitleItemView {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly unlocked: boolean;
  readonly effects: readonly string[];
  /** 称号条件的当前进度（仅未解锁时） */
  readonly progress?: number;
  /** 称号条件的总目标值（仅未解锁时） */
  readonly target?: number;
}

/** 称号页视图（/titles） */
export interface TitlesView {
  readonly titles: readonly TitleItemView[];
  readonly selectedTitleId: string | null;
}

// ---- 成就 ----

export interface AchievementRewardView {
  readonly gold?: number;
  readonly exp?: number;
}

/** 成就列表中单个成就的展示数据 */
export interface AchievementItemView {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly unlocked: boolean;
  readonly claimed: boolean;
  readonly progress: number;
  readonly target: number;
  readonly reward: AchievementRewardView;
}

/** 成就页视图（/achievements） */
export interface AchievementsView {
  readonly achievements: readonly AchievementItemView[];
  readonly totalClaimed: number;
  readonly totalCount: number;
}

// ---- 图鉴 ----

/** 图鉴各类别的进度摘要 */
export interface CollectionCategoryView {
  readonly label: string;
  readonly progress: number;
  readonly total: number;
  readonly items: readonly CollectionEntryView[];
}

/** 图鉴中单个条目 */
export interface CollectionEntryView {
  readonly id: string;
  readonly name: string;
  readonly unlocked: boolean;
}

/** 图鉴页视图（/collection） */
export interface CollectionView {
  readonly categories: readonly CollectionCategoryView[];
  readonly totalProgress: number;
  readonly totalCount: number;
}
// ---- 合成 ----

/** 合成配方视图 */
export interface CraftingRecipeView {
  readonly recipeId: string;
  readonly name: string;
  readonly goldCost: number;
  readonly ingredients: readonly {
    readonly itemId: string;
    readonly name: string;
    readonly required: number;
    readonly owned: number;
    readonly sufficient: boolean;
  }[];
  readonly resultName: string;
  readonly resultQuality: string;
  readonly resultDescription: string;
  readonly canCraft: boolean;
  readonly blockedReason: string | null;
  readonly affinityRequirement: {
    readonly npcName: string;
    readonly required: number;
    readonly current: number;
    readonly met: boolean;
  } | null;
}

/** 合成页视图 */
export interface CraftingView {
  readonly recipes: readonly CraftingRecipeView[];
  readonly fleetGold: number;
  readonly portName: string;
}

// ---- 副本 ----

/** 副本楼层事件视图 */
export interface DungeonFloorEventView {
  readonly type: "combat" | "treasure" | "choice";
  readonly flavorText?: string;
  readonly difficulty?: number;
  readonly goldReward?: number;
  readonly expReward?: number;
  readonly hpDamage?: number;
  readonly itemRewards?: readonly string[];
  readonly options?: readonly { readonly id: string; readonly text: string }[];
}

/** 副本视图 */
export interface DungeonView {
  readonly dungeonId: string;
  readonly name: string;
  readonly currentFloor: number;
  readonly totalFloors: number;
  readonly hpLoss: number;
  readonly goldGained: number;
  readonly itemsGained: readonly string[];
  readonly status: "in_progress" | "cleared" | "failed";
  readonly currentEvent: DungeonFloorEventView | null;
  readonly combatView: PersonCombatView | null;
}
