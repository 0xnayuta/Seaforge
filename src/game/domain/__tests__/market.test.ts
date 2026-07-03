import { afterEach, describe, expect, it, vi } from "bun:test";
import { GOODS } from "../../../data/goods";
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
      // east_asia textile=0.8 × quanzhou local=0.85 = 0.68 × 120 → 82
      expect(getCurrentPrice("silk", "quanzhou", world)).toBe(82);
    });

    it("reads stored price for spice in quanzhou", () => {
      const world = createTestWorld();
      // east_asia material=1.15 × quanzhou local=1.0 = 1.15 × 200 → 230
      expect(getCurrentPrice("spice", "quanzhou", world)).toBe(230);
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
    it("adds spread premium over mid price", () => {
      const world = createTestWorld();
      const mid = getCurrentPrice("silk", "quanzhou", world);
      // buyPrice = round(mid × (1 + 0.05/2)) = round(82 × 1.025) = 84
      expect(getBuyPrice("silk", "quanzhou", world)).toBe(84);
      expect(getBuyPrice("silk", "quanzhou", world)).toBeGreaterThan(mid);
    });
  });

  describe("getSellPrice", () => {
    it("subtracts spread discount from mid price", () => {
      const world = createTestWorld();
      const mid = getCurrentPrice("silk", "quanzhou", world);
      // sellPrice = round(mid × (1 - 0.05/2)) = round(82 × 0.975) = 80
      expect(getSellPrice("silk", "quanzhou", world)).toBe(80);
      expect(getSellPrice("silk", "quanzhou", world)).toBeLessThan(mid);
    });
  });

  describe("getPortGoods", () => {
    it(`returns all ${GOODS.length} goods with computed prices for quanzhou`, () => {
      const world = createTestWorld();
      const goods = getPortGoods("quanzhou", world);

      expect(goods).toHaveLength(GOODS.length);

      const silk = goods.find((g) => g.good.id === "silk");
      expect(silk).toBeDefined();
      // buyPrice = round(mid × 1.025). silk mid=82 → 84, spice mid=230 → 236
      expect(silk?.buyPrice).toBe(84);
      const spice = goods.find((g) => g.good.id === "spice");
      expect(spice).toBeDefined();
      expect(spice?.buyPrice).toBe(236);
    });

    it("returns correct prices for a different port", () => {
      const world = createTestWorld();
      const goods = getPortGoods("malacca", world);

      expect(goods).toHaveLength(GOODS.length);
      for (const entry of goods) {
        expect(entry.buyPrice).toBeGreaterThan(0);
        expect(entry.good.id).toBeTruthy();
      }
    });
  });

  describe("applyTradeImpact", () => {
    it("buy 10 silk in quanzhou increases price (sqrt decay)", () => {
      const world = createTestWorld();
      // impact = 0.05 × sqrt(10) ≈ 0.1581; new = round(82 × 1.1581) = 95
      const updated = applyTradeImpact({
        world: world,
        portId: "quanzhou",
        goodsId: "silk",
        quantity: 10,
        isBuy: true,
      });
      expect(getCurrentPrice("silk", "quanzhou", updated)).toBe(95);
    });

    it("sell 10 silk decreases price", () => {
      const world = createTestWorld();
      // impact = 0.05 × sqrt(10) ≈ 0.1581; new = round(82 × 0.8419) = 69
      const updated = applyTradeImpact({
        world: world,
        portId: "quanzhou",
        goodsId: "silk",
        quantity: 10,
        isBuy: false,
      });
      expect(getCurrentPrice("silk", "quanzhou", updated)).toBe(69);
    });

    it("quantity 0 returns original world unchanged", () => {
      const world = createTestWorld();
      const updated = applyTradeImpact({
        world: world,
        portId: "quanzhou",
        goodsId: "silk",
        quantity: 0,
        isBuy: true,
      });
      expect(updated).toBe(world);
      expect(getCurrentPrice("silk", "quanzhou", updated)).toBe(82);
    });

    it("price never drops below 1 after large sell", () => {
      const world = createTestWorld();
      const updated = applyTradeImpact({
        world: world,
        portId: "quanzhou",
        goodsId: "silk",
        quantity: 1000,
        isBuy: false,
      });
      expect(getCurrentPrice("silk", "quanzhou", updated)).toBe(1);
    });

    it("does not mutate original world", () => {
      const world = createTestWorld();
      const originalPrice = getCurrentPrice("silk", "quanzhou", world);
      applyTradeImpact({
        world: world,
        portId: "quanzhou",
        goodsId: "silk",
        quantity: 10,
        isBuy: true,
      });
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
      // shock: buy 10 silk → impact=0.05×√10≈0.1581 → 82×1.1581≈95
      const shocked = applyTradeImpact({
        world: world,
        portId: "quanzhou",
        goodsId: "silk",
        quantity: 10,
        isBuy: true,
      });
      expect(getCurrentPrice("silk", "quanzhou", shocked)).toBe(95);
      // day pass: regressed = 95 + (82-95)×0.03 = 95 - 0.39 = 94.61 → round 95
      const dayPassed = applyDayPass(shocked);
      expect(getCurrentPrice("silk", "quanzhou", dayPassed)).toBe(95);
    });

    it("sell shock price regresses upward toward base (zero noise)", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.5);

      const world = createTestWorld();
      // shock: sell 10 silk → impact=0.05×√10≈0.1581 → 82×0.8419≈69
      const shocked = applyTradeImpact({
        world: world,
        portId: "quanzhou",
        goodsId: "silk",
        quantity: 10,
        isBuy: false,
      });
      expect(getCurrentPrice("silk", "quanzhou", shocked)).toBe(69);
      // day pass: regressed = 69 + (82-69)×0.03 = 69 + 0.39 = 69.39 → round 69
      const dayPassed = applyDayPass(shocked);
      expect(getCurrentPrice("silk", "quanzhou", dayPassed)).toBe(69);
    });

    it("does not mutate original world", () => {
      const world = createTestWorld();
      const snapshot = structuredClone(world);
      applyDayPass(world);
      expect(world).toEqual(snapshot);
    });
  });
});
