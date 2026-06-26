// ============================================================
// 区域配置 — 五大贸易区域
// ============================================================

import type { GoodCategory } from "./goods";

export interface RegionConfig {
  readonly id: string;
  readonly name: string;
  /// 区域级价格系数（品类 → 乘数），低于 1 为产区便宜，高于 1 为进口昂贵
  readonly basePriceModifiers: Record<GoodCategory, number>;
  /// 战斗难度系数（越高越危险）
  readonly dangerModifier: number;
}

export const REGIONS: readonly RegionConfig[] = [
  {
    id: "east_asia",
    name: "东亚",
    basePriceModifiers: {
      food: 0.9,
      textile: 0.8,
      craft: 0.85,
      material: 1.15,
    },
    dangerModifier: 1.0,
  },
  {
    id: "indian_ocean",
    name: "印度洋",
    basePriceModifiers: {
      food: 1.0,
      textile: 1.05,
      craft: 1.1,
      material: 0.8,
    },
    dangerModifier: 0.9,
  },
  {
    id: "africa",
    name: "非洲",
    basePriceModifiers: {
      food: 0.9,
      textile: 1.2,
      craft: 1.2,
      material: 0.75,
    },
    dangerModifier: 0.7,
  },
  {
    id: "mediterranean",
    name: "地中海",
    basePriceModifiers: {
      food: 1.1,
      textile: 0.95,
      craft: 0.9,
      material: 1.1,
    },
    dangerModifier: 1.2,
  },
  {
    id: "north_sea",
    name: "北海",
    basePriceModifiers: {
      food: 0.95,
      textile: 1.15,
      craft: 1.15,
      material: 1.0,
    },
    dangerModifier: 0.8,
  },
] as const;
