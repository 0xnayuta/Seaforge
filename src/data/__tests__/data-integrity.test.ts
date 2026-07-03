import { describe, expect, it } from "bun:test";
import { GOODS } from "../goods";
import { PORTS } from "../ports";
import { REGIONS } from "../regions";
import { SHIPS } from "../ships";

// ============================================================
// 数据完整性测试 — 确保配置数据内部一致
// ============================================================

describe("goods data integrity", () => {
  it("has 19 goods across 4 categories", () => {
    expect(GOODS.length).toBe(19);
  });

  it("every good has unique id", () => {
    const ids = GOODS.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every good has positive basePrice", () => {
    for (const good of GOODS) {
      expect(good.basePrice).toBeGreaterThan(0);
    }
  });

  it("every good has positive volume", () => {
    for (const good of GOODS) {
      expect(good.volume).toBeGreaterThan(0);
    }
  });

  it("every good belongs to a valid category", () => {
    const VALID: Record<string, true> = {
      food: true,
      textile: true,
      craft: true,
      material: true,
    };
    for (const good of GOODS) {
      expect(VALID[good.category]).toBe(true);
    }
  });

  it("every good has tier >= 0", () => {
    for (const good of GOODS) {
      expect(good.tier).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("ports data integrity", () => {
  it("has 12 ports", () => {
    expect(PORTS.length).toBe(12);
  });

  it("every port has unique id", () => {
    const ids = PORTS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every port has 2-4 specialties", () => {
    for (const port of PORTS) {
      expect(port.specialties.length).toBeGreaterThanOrEqual(2);
      expect(port.specialties.length).toBeLessThanOrEqual(4);
      // every specialty references an existing good
      for (const s of port.specialties) {
        expect(GOODS.some((g) => g.id === s)).toBe(true);
      }
    }
  });

  it("every port belongs to an existing region", () => {
    const regionIds = new Set(REGIONS.map((r) => r.id));
    for (const port of PORTS) {
      expect(regionIds.has(port.regionId)).toBe(true);
    }
  });

  it("every localPriceModifier key references an existing good", () => {
    const goodIds = new Set(GOODS.map((g) => g.id));
    for (const port of PORTS) {
      if (!port.localPriceModifiers) continue;
      for (const key of Object.keys(port.localPriceModifiers)) {
        expect(goodIds.has(key)).toBe(true);
        const val = port.localPriceModifiers[key];
        expect(val).toBeGreaterThanOrEqual(0.5);
        expect(val).toBeLessThanOrEqual(1.5);
      }
    }
  });

  it("every specialty has a localPriceModifier entry below 1.0", () => {
    for (const port of PORTS) {
      for (const s of port.specialties) {
        const mod = port.localPriceModifiers?.[s];
        expect(mod).toBeDefined();
        expect(mod).toBeLessThan(1.0); // specialties should be cheaper
      }
    }
  });

  it("all port descriptions are non-empty", () => {
    for (const port of PORTS) {
      expect(port.description.length).toBeGreaterThan(0);
    }
  });
});

describe("regions data integrity", () => {
  it("has 5 regions", () => {
    expect(REGIONS.length).toBe(5);
  });

  it("every region has unique id", () => {
    const ids = REGIONS.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every region has basePriceModifiers covering all 4 categories", () => {
    const categories = ["food", "textile", "craft", "material"] as const;
    for (const region of REGIONS) {
      for (const cat of categories) {
        const mod = region.basePriceModifiers[cat];
        expect(mod).toBeDefined();
        expect(mod).toBeGreaterThan(0);
        expect(mod).toBeLessThanOrEqual(2.0);
      }
    }
  });

  it("every region has non-negative dangerModifier", () => {
    for (const region of REGIONS) {
      expect(region.dangerModifier).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("route integrity", () => {
  it("every pair of distinct ports has a valid travel distance", () => {
    for (const a of PORTS) {
      for (const b of PORTS) {
        if (a.id === b.id) continue;
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const distance = Math.round(Math.sqrt(dx * dx + dy * dy));
        expect(distance).toBeGreaterThan(0);
      }
    }
  });
});

describe("ships data integrity", () => {
  it("has at least 2 ships", () => {
    expect(SHIPS.length).toBeGreaterThanOrEqual(2);
  });

  it("every ship has unique id", () => {
    const ids = SHIPS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every ship has positive speed, capacity and durability", () => {
    for (const ship of SHIPS) {
      expect(ship.speed).toBeGreaterThan(0);
      expect(ship.capacity).toBeGreaterThan(0);
      expect(ship.baseDurability).toBeGreaterThan(0);
    }
  });

  it("every ship has positive baseCrew and repairCostPerDurability", () => {
    for (const ship of SHIPS) {
      expect(ship.baseCrew).toBeGreaterThan(0);
      expect(ship.repairCostPerDurability).toBeGreaterThan(0);
    }
  });

  it("every ship has positive maxComponentLevel", () => {
    for (const ship of SHIPS) {
      expect(ship.maxComponentLevel).toBeGreaterThan(0);
    }
  });

  it("every ship has upgradeCosts arrays matching maxComponentLevel", () => {
    for (const ship of SHIPS) {
      expect(ship.upgradeCosts.hull).toHaveLength(ship.maxComponentLevel);
      expect(ship.upgradeCosts.sail).toHaveLength(ship.maxComponentLevel);
      expect(ship.upgradeCosts.armor).toHaveLength(ship.maxComponentLevel);
      expect(ship.upgradeCosts.cannon).toHaveLength(ship.maxComponentLevel);
      for (const cost of ship.upgradeCosts.hull)
        expect(cost).toBeGreaterThan(0);
      for (const cost of ship.upgradeCosts.sail)
        expect(cost).toBeGreaterThan(0);
      for (const cost of ship.upgradeCosts.armor)
        expect(cost).toBeGreaterThan(0);
      for (const cost of ship.upgradeCosts.cannon)
        expect(cost).toBeGreaterThan(0);
    }
  });
});

describe("cross-region profit ranges", () => {
  // Reuses the same equilibrium-price logic as the game engine
  function getPriceModifier(portId: string, goodsId: string): number {
    const port = PORTS.find((p) => p.id === portId);
    const good = GOODS.find((g) => g.id === goodsId);
    if (!port || !good) return 1.0;
    const region = REGIONS.find((r) => r.id === port.regionId);
    if (!region) return 1.0;
    const regionMod = region.basePriceModifiers[good.category];
    const localMod = port.localPriceModifiers?.[goodsId] ?? 1.0;
    return regionMod * localMod;
  }

  function basePriceFor(goodsId: string, portId: string): number {
    const good = GOODS.find((g) => g.id === goodsId);
    if (!good) return 0;
    return Math.round(good.basePrice * getPriceModifier(portId, goodsId));
  }

  function profitRate(
    goodsId: string,
    fromPort: string,
    toPort: string,
  ): number {
    const buy = basePriceFor(goodsId, fromPort);
    const sell = basePriceFor(goodsId, toPort);
    if (buy <= 0) return 0;
    return (sell - buy) / buy;
  }

  // ---- luxury goods have high cross-region profit ----
  const LUXURY_GOODS = ["jade", "ivory", "gold", "silk", "porcelain", "spice"];
  const STAPLE_GOODS = ["rice", "timber", "jerky", "wool", "tin"];

  for (const luxury of LUXURY_GOODS) {
    it(`${luxury} has at least one cross-region route with >30% profit`, () => {
      let maxProfit = -Infinity;
      for (const from of PORTS) {
        for (const to of PORTS) {
          if (from.id === to.id) continue;
          if (from.regionId === to.regionId) continue;
          const rate = profitRate(luxury, from.id, to.id);
          if (rate > maxProfit) maxProfit = rate;
        }
      }
      expect(maxProfit).toBeGreaterThan(0.3);
    });
  }

  for (const staple of STAPLE_GOODS) {
    it(`${staple} cross-region profit does not exceed 80%`, () => {
      let maxProfit = -Infinity;
      for (const from of PORTS) {
        for (const to of PORTS) {
          if (from.id === to.id) continue;
          if (from.regionId === to.regionId) continue;
          const rate = profitRate(staple, from.id, to.id);
          if (rate > maxProfit) maxProfit = rate;
        }
      }
      // Staples shouldn't have extreme pricing spread
      expect(maxProfit).toBeLessThan(0.8);
    });
  }

  // ---- no extreme profit values ----
  it("no route yields >300% or <-60% profit", () => {
    const MIN_PROFIT = -0.6;
    const MAX_PROFIT = 3.0;
    for (const good of GOODS) {
      for (const from of PORTS) {
        for (const to of PORTS) {
          if (from.id === to.id) continue;
          const rate = profitRate(good.id, from.id, to.id);
          expect(rate).toBeGreaterThan(MIN_PROFIT);
          expect(rate).toBeLessThan(MAX_PROFIT);
        }
      }
    }
  });

  // ---- intra-region profit is low ----
  it("intra-region profit is <=25% for all goods", () => {
    for (const good of GOODS) {
      for (const region of REGIONS) {
        const portsInRegion = PORTS.filter((p) => p.regionId === region.id);
        if (portsInRegion.length < 2) continue;
        for (const a of portsInRegion) {
          for (const b of portsInRegion) {
            if (a.id === b.id) continue;
            const rate = profitRate(good.id, a.id, b.id);
            expect(Math.abs(rate)).toBeLessThanOrEqual(0.25);
          }
        }
      }
    }
  });
});
