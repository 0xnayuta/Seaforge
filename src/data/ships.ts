// ============================================================
// 船只配置
// ============================================================

export interface ShipConfig {
  readonly id: string;
  readonly name: string;
  readonly capacity: number;
  readonly speed: number;
  readonly basePrice: number;
  readonly maxComponentLevel: number;
  readonly upgradeCosts: {
    readonly hull: readonly number[];
    readonly sail: readonly number[];
    readonly armor: readonly number[];
    readonly cannon: readonly number[];
  };
  readonly baseDurability: number;
  readonly repairCostPerDurability: number;
  readonly armamentTiers: readonly [
    [cargoRatio: number, defenseMultiplier: number],
    [cargoRatio: number, defenseMultiplier: number],
    [cargoRatio: number, defenseMultiplier: number],
  ];
  readonly baseCrew: number;
}

export const SHIPS: readonly ShipConfig[] = [
  {
    id: "sloop",
    name: "单桅帆船",
    capacity: 30,
    speed: 1.0,
    basePrice: 0,
    maxComponentLevel: 3,
    upgradeCosts: {
      hull: [500, 1200, 3000],
      sail: [300, 800, 2000],
      armor: [400, 1000, 2500],
      cannon: [600, 1500, 3500],
    },
    baseDurability: 50,
    repairCostPerDurability: 5,
    armamentTiers: [
      [1.0, 1.0],
      [0.75, 1.5],
      [0.5, 2.5],
    ],
    baseCrew: 3,
  },
  {
    id: "cog",
    name: "柯克帆船",
    capacity: 60,
    speed: 0.8,
    basePrice: 3000,
    maxComponentLevel: 3,
    upgradeCosts: {
      hull: [1500, 3500, 6000],
      sail: [1000, 2500, 4500],
      armor: [1200, 3000, 5000],
      cannon: [1800, 4000, 7000],
    },
    baseDurability: 80,
    repairCostPerDurability: 8,
    armamentTiers: [
      [1.0, 1.0],
      [0.75, 1.5],
      [0.5, 2.5],
    ],
    baseCrew: 5,
  },
] as const;
