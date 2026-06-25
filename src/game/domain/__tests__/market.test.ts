import { describe, it, expect, afterEach, vi } from "vitest"
import { createTestWorld } from "./helpers"
import {
  getCurrentPrice,
  getBuyPrice,
  getSellPrice,
  getPortGoods,
  applyTradeImpact,
  applyDayPass,
} from "../market"

describe("market pure functions", () => {
  describe("getCurrentPrice", () => {
    it("reads stored price for silk in quanzhou", () => {
      const world = createTestWorld()
      // silk basePrice=120 × 0.85 (quanzhou modifier) = 102
      expect(getCurrentPrice("silk", "quanzhou", world)).toBe(102)
    })

    it("reads stored price for spice in quanzhou", () => {
      const world = createTestWorld()
      // spice basePrice=200 × 1.30 (quanzhou modifier) = 260
      expect(getCurrentPrice("spice", "quanzhou", world)).toBe(260)
    })

    it("throws for unknown port", () => {
      const world = createTestWorld()
      expect(() => getCurrentPrice("silk", "atlantis", world)).toThrow("未知港口")
    })

    it("throws for unknown good", () => {
      const world = createTestWorld()
      expect(() => getCurrentPrice("unicorn", "quanzhou", world)).toThrow("无商品")
    })
  })

  describe("getBuyPrice", () => {
    it("equals current price", () => {
      const world = createTestWorld()
      const price = getCurrentPrice("silk", "quanzhou", world)
      expect(getBuyPrice("silk", "quanzhou", world)).toBe(price)
    })
  })

  describe("getSellPrice", () => {
    it("equals current price", () => {
      const world = createTestWorld()
      const price = getCurrentPrice("silk", "quanzhou", world)
      expect(getSellPrice("silk", "quanzhou", world)).toBe(price)
    })
  })

  describe("getPortGoods", () => {
    it("returns all 5 goods with computed prices for quanzhou", () => {
      const world = createTestWorld()
      const goods = getPortGoods("quanzhou", world)

      expect(goods).toHaveLength(5)

      const silk = goods.find((g) => g.good.id === "silk")
      expect(silk).toBeDefined()
      expect(silk!.buyPrice).toBe(102)

      const spice = goods.find((g) => g.good.id === "spice")
      expect(spice).toBeDefined()
      expect(spice!.buyPrice).toBe(260)

      const timber = goods.find((g) => g.good.id === "timber")
      expect(timber).toBeDefined()
      expect(timber!.buyPrice).toBe(40) // 40 × 1.00

      const porcelain = goods.find((g) => g.good.id === "porcelain")
      expect(porcelain).toBeDefined()
      expect(porcelain!.buyPrice).toBe(120) // 150 × 0.80

      const jade = goods.find((g) => g.good.id === "jade")
      expect(jade).toBeDefined()
      expect(jade!.buyPrice).toBe(360) // 300 × 1.20
    })

    it("returns correct prices for a different port", () => {
      const world = createTestWorld()
      const goods = getPortGoods("malacca", world)

      expect(goods).toHaveLength(5)
      // malacca prices are calculated from the helper, just verify it runs
      // and returns prices > 0
      for (const entry of goods) {
        expect(entry.buyPrice).toBeGreaterThan(0)
        expect(entry.good.id).toBeTruthy()
      }
    })
  })

  describe("applyTradeImpact", () => {
    it("buy 10 silk in quanzhou increases price (TRADE_IMPACT=0.05)", () => {
      const world = createTestWorld()
      // 102 × (1 + 10 × 0.05) = 102 × 1.5 = 153
      const updated = applyTradeImpact(world, "quanzhou", "silk", 10, true)
      expect(getCurrentPrice("silk", "quanzhou", updated)).toBe(153)
    })

    it("sell 10 silk decreases price", () => {
      const world = createTestWorld()
      // 102 × (1 - 10 × 0.05) = 102 × 0.5 = 51
      const updated = applyTradeImpact(world, "quanzhou", "silk", 10, false)
      expect(getCurrentPrice("silk", "quanzhou", updated)).toBe(51)
    })

    it("quantity 0 returns original world unchanged", () => {
      const world = createTestWorld()
      const updated = applyTradeImpact(world, "quanzhou", "silk", 0, true)
      expect(updated).toBe(world)
      expect(getCurrentPrice("silk", "quanzhou", updated)).toBe(102)
    })

    it("price never drops below 1 after large sell", () => {
      const world = createTestWorld()
      // 102 × (1 - 1000 × 0.05) = 102 × -49 → clamped to 1
      const updated = applyTradeImpact(world, "quanzhou", "silk", 1000, false)
      expect(getCurrentPrice("silk", "quanzhou", updated)).toBe(1)
    })

    it("does not mutate original world", () => {
      const world = createTestWorld()
      const originalPrice = getCurrentPrice("silk", "quanzhou", world)
      applyTradeImpact(world, "quanzhou", "silk", 10, true)
      expect(getCurrentPrice("silk", "quanzhou", world)).toBe(originalPrice)
    })
  })

  describe("applyDayPass", () => {
    afterEach(() => {
      vi.restoreAllMocks()
    })

    it("does not throw", () => {
      const world = createTestWorld()
      expect(() => applyDayPass(world)).not.toThrow()
    })

    it("all prices stay >= 1", () => {
      const world = createTestWorld()
      const updated = applyDayPass(world)
      const { prices } = updated.market
      for (const portPrices of Object.values(prices)) {
        for (const price of Object.values(portPrices)) {
          expect(price).toBeGreaterThanOrEqual(1)
        }
      }
    })

    it("prices regress toward base after trade shock (zero noise)", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.5)

      const world = createTestWorld()
      // shock: buy 10 silk in quanzhou → 102 × 1.5 = 153
      const shocked = applyTradeImpact(world, "quanzhou", "silk", 10, true)
      expect(getCurrentPrice("silk", "quanzhou", shocked)).toBe(153)

      // day pass: regressed = 153 + (102-153)×0.03 = 153 - 1.53 = 151.47 → round 151
      const dayPassed = applyDayPass(shocked)
      expect(getCurrentPrice("silk", "quanzhou", dayPassed)).toBe(151)
    })

    it("sell shock price regresses upward toward base (zero noise)", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.5)

      const world = createTestWorld()
      // shock: sell 10 silk → 102 × 0.5 = 51
      const shocked = applyTradeImpact(world, "quanzhou", "silk", 10, false)
      expect(getCurrentPrice("silk", "quanzhou", shocked)).toBe(51)

      // day pass: regressed = 51 + (102-51)×0.03 = 51 + 1.53 = 52.53 → round 53
      const dayPassed = applyDayPass(shocked)
      expect(getCurrentPrice("silk", "quanzhou", dayPassed)).toBe(53)
    })

    it("does not mutate original world", () => {
      const world = createTestWorld()
      const snapshot = structuredClone(world)
      applyDayPass(world)
      expect(world).toEqual(snapshot)
    })
  })
})
