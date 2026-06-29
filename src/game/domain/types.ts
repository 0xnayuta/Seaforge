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

// ---- 船只 ----

export interface ShipState {
  readonly typeId: string;
  readonly upgradeLevel: number;
  readonly currentHp: number;
  readonly maxHp: number;
  readonly armamentLevel: 0 | 1 | 2;
  readonly cargo: readonly CargoItem[];
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
  readonly type?: "combat";
  readonly combatOutcome?: CombatOutcome;
}
export interface VoyageState {
  readonly fromPortId: string;
  readonly toPortId: string;
  readonly departureDay: number;
  readonly travelDays: number;
  readonly events: readonly VoyageEvent[];
  readonly armamentLevel: 0 | 1 | 2;
}

// ---- 玩家 ----

export interface PlayerState {
  readonly name: string;
  readonly gold: number;
  readonly currentPortId: string;
  readonly day: number;
}

// ---- World（事实集合） ----

export interface World {
  readonly player: PlayerState;
  readonly ship: ShipState;
  readonly market: MarketPriceState;
  readonly voyage: VoyageState | null;
  // 后续 Phase 增加：
  // quests: QuestState[]
  // worldEvents: WorldEventState[]
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
  | "CARGO_EXCEEDS_CAPACITY";
