import { describe, it, expect } from "vitest"
import { createTestWorld, createEmptyWorld } from "./helpers"
import {
  executeBuy,
  executeSell,
  getUsedCapacity,
  getMaxCapacity,
} from "../trade"
import { getBuyPrice, getSellPrice } from "../market"

describe("getUsedCapacity", () => {
  it("should compute total volume across all cargo", () => {
    const world = createTestWorld()
    // silk vol=2 × 5 + spice vol=1 × 3 = 10 + 3 = 13
    expect(getUsedCapacity(world)).toBe(13)
  })

  it("should return 0 for empty cargo", () => {
    const world = createEmptyWorld()
    expect(getUsedCapacity(world)).toBe(0)
  })
})

describe("getMaxCapacity", () => {
  it("should return sloop capacity 30 at level 0", () => {
    const world = createTestWorld()
    expect(getMaxCapacity(world)).toBe(30)
  })

  it("should scale with upgrade level (每级 +20%)", () => {
    const world = createTestWorld({ ship: { ...createTestWorld().ship, upgradeLevel: 2 } })
    // floor(30 * (1 + 2 * 0.2)) = floor(30 * 1.4) = 42
    expect(getMaxCapacity(world)).toBe(42)
  })
})

describe("executeBuy", () => {
  it("should deduct gold and add cargo with weighted average buyPrice", () => {
    const world = createTestWorld()
    const price = getBuyPrice("silk", world.player.currentPortId, world)
    const quantity = 2
    const totalCost = price * quantity

    const result = executeBuy(world, { goodId: "silk", quantity })
    const newWorld = result.world

    // gold deducted
    expect(newWorld.player.gold).toBe(world.player.gold - totalCost)
    expect(result.totalCost).toBe(totalCost)

    // cargo updated
    const cargo = newWorld.ship.cargo.find((c) => c.goodId === "silk")
    expect(cargo).toBeDefined()
    expect(cargo!.quantity).toBe(5 + quantity)

    // weighted average = (5 * 102 + 2 * 102) / 7 = 102
    expect(cargo!.buyPrice).toBe(102)
  })

  it("should add new cargo entry when good not already in cargo", () => {
    const world = createEmptyWorld()
    const price = getBuyPrice("silk", world.player.currentPortId, world)
    const quantity = 2
    const totalCost = price * quantity

    const result = executeBuy(world, { goodId: "silk", quantity })

    expect(result.world.player.gold).toBe(world.player.gold - totalCost)
    const cargo = result.world.ship.cargo.find((c) => c.goodId === "silk")
    expect(cargo).toBeDefined()
    expect(cargo!.quantity).toBe(2)
    expect(cargo!.buyPrice).toBe(price)
  })

  it("should throw when not enough gold", () => {
    const world = createTestWorld()
    const price = getBuyPrice("silk", world.player.currentPortId, world)
    // 1000 * price = 102000 > 5000
    expect(1000 * price).toBeGreaterThan(world.player.gold)
    expect(() => executeBuy(world, { goodId: "silk", quantity: 1000 })).toThrow("金币不足")
  })

  it("should throw when not enough cargo capacity", () => {
    const world = createTestWorld()
    // used = 13, max = 30, silk vol = 2
    // buy 10 silk → 13 + 20 = 33 > 30; cost 10*102 = 1020 < 5000 (gold check passes)
    expect(() => executeBuy(world, { goodId: "silk", quantity: 10 })).toThrow("舱容不足")
  })

  it("should throw when quantity is zero or negative", () => {
    const world = createTestWorld()
    expect(() => executeBuy(world, { goodId: "silk", quantity: 0 })).toThrow("购买数量必须大于 0")
    expect(() => executeBuy(world, { goodId: "silk", quantity: -1 })).toThrow("购买数量必须大于 0")
  })
})

describe("executeSell", () => {
  it("should add gold and reduce cargo quantity", () => {
    const world = createTestWorld()
    const price = getSellPrice("silk", world.player.currentPortId, world)
    const quantity = 3

    const result = executeSell(world, { goodId: "silk", quantity })

    // gold increased by revenue = price × quantity
    const expectedRevenue = price * quantity
    expect(result.world.player.gold).toBe(world.player.gold + expectedRevenue)
    expect(result.totalRevenue).toBe(expectedRevenue)

    // silk reduced from 5 to 2
    const cargo = result.world.ship.cargo.find((c) => c.goodId === "silk")
    expect(cargo).toBeDefined()
    expect(cargo!.quantity).toBe(2)
  })

  it("should throw when not enough cargo quantity", () => {
    const world = createTestWorld()
    // only 5 silk in cargo, try to sell 100
    expect(() => executeSell(world, { goodId: "silk", quantity: 100 })).toThrow("货物不足")
  })

  it("should throw when good not in cargo", () => {
    const world = createEmptyWorld()
    expect(() => executeSell(world, { goodId: "silk", quantity: 1 })).toThrow("货物不足")
  })

  it("should remove cargo entry entirely when selling exact amount", () => {
    const world = createTestWorld()
    const silkCargo = world.ship.cargo.find((c) => c.goodId === "silk")!
    const result = executeSell(world, { goodId: "silk", quantity: silkCargo.quantity })

    // cargo entry for silk should be gone
    expect(result.world.ship.cargo.find((c) => c.goodId === "silk")).toBeUndefined()

    // spice cargo should remain
    expect(result.world.ship.cargo.find((c) => c.goodId === "spice")).toBeDefined()
  })

  it("should compute profit as (sellPrice - buyPrice) * quantity", () => {
    const world = createTestWorld()
    const price = getSellPrice("silk", world.player.currentPortId, world)
    const quantity = 3
    const cargo = world.ship.cargo.find((c) => c.goodId === "silk")!

    const result = executeSell(world, { goodId: "silk", quantity })
    const expectedProfit = (price - cargo.buyPrice) * quantity

    expect(result.profit).toBe(expectedProfit)
  })
})
