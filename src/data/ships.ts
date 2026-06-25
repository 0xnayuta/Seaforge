// ============================================================
// 船只配置
// ============================================================

export interface ShipConfig {
  readonly id: string
  readonly name: string
  readonly capacity: number     // 最大舱容
  readonly speed: number        // 速度系数（越大越快）
  readonly basePrice: number    // 购买价
  readonly maxUpgradeLevel: number
  readonly upgradeCosts: readonly number[] // 每级升级费用
}

export const SHIPS: readonly ShipConfig[] = [
  {
    id: "sloop",
    name: "单桅帆船",
    capacity: 30,
    speed: 1.0,
    basePrice: 0, // 初始免费赠送
    maxUpgradeLevel: 3,
    upgradeCosts: [500, 1200, 3000],
  },
  {
    id: "cog",
    name: "柯克帆船",
    capacity: 60,
    speed: 0.8,
    basePrice: 3000,
    maxUpgradeLevel: 3,
    upgradeCosts: [1500, 3500, 6000],
  },
] as const
