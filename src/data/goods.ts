// ============================================================
// 商品配置
// ============================================================

export interface GoodConfig {
  readonly id: string
  readonly name: string
  readonly category: GoodCategory
  readonly basePrice: number // 参考价（行情围绕此值波动）
  readonly volume: number    // 每单位占多少舱容
  readonly tier: number      // 等级要求（MVP 全部为 0）
}

export type GoodCategory = "food" | "textile" | "metal" | "luxury" | "spice"

export const GOODS: readonly GoodConfig[] = [
  {
    id: "silk",
    name: "丝绸",
    category: "textile",
    basePrice: 120,
    volume: 2,
    tier: 0,
  },
  {
    id: "porcelain",
    name: "瓷器",
    category: "luxury",
    basePrice: 150,
    volume: 3,
    tier: 0,
  },
  {
    id: "spice",
    name: "香料",
    category: "spice",
    basePrice: 200,
    volume: 1,
    tier: 0,
  },
  {
    id: "timber",
    name: "木材",
    category: "metal",
    basePrice: 40,
    volume: 3,
    tier: 0,
  },
  {
    id: "jade",
    name: "玉石",
    category: "luxury",
    basePrice: 300,
    volume: 1,
    tier: 0,
  },
] as const
