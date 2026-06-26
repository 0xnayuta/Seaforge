import { afterEach, describe, expect, it, vi } from "bun:test";
import {
  applyDayPass,
  applyTradeImpact,
  getBuyPrice,
  getCurrentPrice,
  getPortGoods,
  getSellPrice,
} from "../market";
import { createTestWorld } from "./helpers";

describe("market pure functions", () => {
  describe("getCurrentPrice", () => {
    it("reads stored price for silk in quanzhou", () => {
      const world = createTestWorld();
      // silk basePrice=120 × 0.78 (quanzhou modifier) = 94
      expect(getCurrentPrice("silk", "quanzhou", world)).toBe(94);
    });

    it("reads stored price for spice in quanzhou", () => {
      const world = createTestWorld();
      // spice basePrice=200 × 1.25 (quanzhou modifier) = 250
      expect(getCurrentPrice("spice", "quanzhou", world)).toBe(250);
    });

    it("throws for unknown port", () => {
      const world = createTestWorld();
      expect(() => getCurrentPrice("silk", "atlantis", world)).toThrow(
        "UNKNOWN_PORT",
      );
    });

    it("throws for unknown good", () => {
      const world = createTestWorld();
      expect(() => getCurrentPrice("unicorn", "quanzhou", world)).toThrow(
        "NO_PRICE_DATA",
      );
    });
  });

  describe("getBuyPrice", () => {
    it("equals current price", () => {
      const world = createTestWorld();
      const price = getCurrentPrice("silk", "quanzhou", world);
      expect(getBuyPrice("silk", "quanzhou", world)).toBe(price);
    });
  });

  describe("getSellPrice", () => {
    it("equals current price", () => {
      const world = createTestWorld();
      const price = getCurrentPrice("silk", "quanzhou", world);
      expect(getSellPrice("silk", "quanzhou", world)).toBe(price);
    });
  });

  describe("getPortGoods", () => {
    it("returns all 5 goods with computed prices for quanzhou", () => {
      const world = createTestWorld();
      const goods = getPortGoods("quanzhou", world);

      expect(goods).toHaveLength(5);

      const silk = goods.find((g) => g.good.id === "silk");
      expect(silk).toBeDefined();
      expect(silk?.buyPrice).toBe(94);
      const spice = goods.find((g) => g.good.id === "spice");
      expect(spice).toBeDefined();
      expect(spice?.buyPrice).toBe(250);
      const timber = goods.find((g) => g.good.id === "timber");
      expect(timber).toBeDefined();
      expect(timber?.buyPrice).toBe(40); // 40 × 1.00
      const porcelain = goods.find((g) => g.good.id === "porcelain");
      expect(porcelain).toBeDefined();
      expect(porcelain?.buyPrice).toBe(108); // 150 × 0.72
      const jade = goods.find((g) => g.good.id === "jade");
      expect(jade).toBeDefined();
      expect(jade?.buyPrice).toBe(360); // 300 × 1.20
    });

    it("returns correct prices for a different port", () => {
      const world = createTestWorld();
      const goods = getPortGoods("malacca", world);

      expect(goods).toHaveLength(5);
      // malacca prices are calculated from the helper, just verify it runs
      // and returns prices > 0
      for (const entry of goods) {
        expect(entry.buyPrice).toBeGreaterThan(0);
        expect(entry.good.id).toBeTruthy();
      }
    });
  });

  describe("applyTradeImpact", () => {
    it("buy 10 silk in quanzhou increases price (TRADE_IMPACT=0.05)", () => {
      const world = createTestWorld();
      // 94 × (1 + 10 × 0.05) = 94 × 1.5 = 141
      const updated = applyTradeImpact(world, "quanzhou", "silk", 10, true);
      expect(getCurrentPrice("silk", "quanzhou", updated)).toBe(141);
    });

    it("sell 10 silk decreases price", () => {
      const world = createTestWorld();
      // 94 × (1 - 10 × 0.05) = 94 × 0.5 = 47
      const updated = applyTradeImpact(world, "quanzhou", "silk", 10, false);
      expect(getCurrentPrice("silk", "quanzhou", updated)).toBe(47);
    });

    it("quantity 0 returns original world unchanged", () => {
      const world = createTestWorld();
      const updated = applyTradeImpact(world, "quanzhou", "silk", 0, true);
      expect(updated).toBe(world);
      expect(getCurrentPrice("silk", "quanzhou", updated)).toBe(94);
    });

    it("price never drops below 1 after large sell", () => {
      const world = createTestWorld();
      const updated = applyTradeImpact(world, "quanzhou", "silk", 1000, false);
      expect(getCurrentPrice("silk", "quanzhou", updated)).toBe(1);
    });

    it("does not mutate original world", () => {
      const world = createTestWorld();
      const originalPrice = getCurrentPrice("silk", "quanzhou", world);
      applyTradeImpact(world, "quanzhou", "silk", 10, true);
      expect(getCurrentPrice("silk", "quanzhou", world)).toBe(originalPrice);
    });
  });

  describe("applyDayPass", () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("does not throw", () => {
      const world = createTestWorld();
      expect(() => applyDayPass(world)).not.toThrow();
    });

    it("all prices stay >= 1", () => {
      const world = createTestWorld();
      const updated = applyDayPass(world);
      const allPrices = Object.values(updated.market.prices).flatMap(
        Object.values,
      );
      for (const price of allPrices) {
        expect(price).toBeGreaterThanOrEqual(1);
      }
    });

    it("prices regress toward base after trade shock (zero noise)", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.5);

      const world = createTestWorld();
      // shock: buy 10 silk in quanzhou → 94 × 1.5 = 141
      const shocked = applyTradeImpact(world, "quanzhou", "silk", 10, true);
      expect(getCurrentPrice("silk", "quanzhou", shocked)).toBe(141);
      // day pass: regressed = 141 + (94-141)×0.03 = 141 - 1.41 = 139.59 → round 140
      const dayPassed = applyDayPass(shocked);
      expect(getCurrentPrice("silk", "quanzhou", dayPassed)).toBe(140);
    });

    it("sell shock price regresses upward toward base (zero noise)", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.5);

      const world = createTestWorld();
      // shock: sell 10 silk → 94 × 0.5 = 47
      const shocked = applyTradeImpact(world, "quanzhou", "silk", 10, false);
      expect(getCurrentPrice("silk", "quanzhou", shocked)).toBe(47);
      // day pass: regressed = 47 + (94-47)×0.03 = 47 + 1.41 = 48.41 → round 48
      const dayPassed = applyDayPass(shocked);
      expect(getCurrentPrice("silk", "quanzhou", dayPassed)).toBe(48);
    });

    it("does not mutate original world", () => {
      const world = createTestWorld();
      const snapshot = structuredClone(world);
      applyDayPass(world);
      expect(world).toEqual(snapshot);
    });
  });
});
