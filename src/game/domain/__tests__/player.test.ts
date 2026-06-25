import { describe, it, expect, vi } from "vitest"
import { PORTS } from "../../../data/ports"
import { GOODS } from "../../../data/goods"
import { createTestWorld } from "./helpers"
import { createDefaultWorld, advanceDay } from "../player"

describe("createDefaultWorld", () => {
  it("returns World with correct defaults", () => {
    const world = createDefaultWorld()

    // Player state defaults
    expect(world.player.name).toBe("船长")
    expect(world.player.gold).toBe(5000)
    expect(world.player.currentPortId).toBe("quanzhou")
    expect(world.player.day).toBe(1)

    // Ship: sloop, empty cargo
    expect(world.ship.typeId).toBe("sloop")
    expect(world.ship.upgradeLevel).toBe(0)
    expect(world.ship.cargo).toEqual([])

    // Voyage is null
    expect(world.voyage).toBeNull()

    // Market has price data
    expect(world.market).toBeDefined()
    expect(world.market.prices).toBeDefined()
  })

  it("market.prices has entries for all 3 ports x 5 goods = 15 entries", () => {
    const world = createDefaultWorld()
    const prices = world.market.prices

    let totalEntries = 0
    for (const port of PORTS) {
      expect(prices[port.id]).toBeDefined()
      for (const good of GOODS) {
        expect(prices[port.id][good.id]).toBeTypeOf("number")
        totalEntries++
      }
    }
    expect(totalEntries).toBe(15)
  })

  it("market prices match basePrice x portModifier", () => {
    const world = createDefaultWorld()
    const prices = world.market.prices

    for (const port of PORTS) {
      for (const good of GOODS) {
        const modifier = port.priceModifiers[good.id] ?? 1.0
        const expected = Math.round(good.basePrice * modifier)
        expect(prices[port.id][good.id]).toBe(expected)
      }
    }
  })
})

describe("advanceDay", () => {
  it("increments day by N", () => {
    const world = createTestWorld()
    const advanced = advanceDay(world, 3)
    expect(advanced.player.day).toBe(world.player.day + 3)
  })

  it("increments day by 1", () => {
    const world = createTestWorld()
    const advanced = advanceDay(world, 1)
    expect(advanced.player.day).toBe(world.player.day + 1)
  })

  it("increments day by 7 (one week)", () => {
    const world = createTestWorld()
    const advanced = advanceDay(world, 7)
    expect(advanced.player.day).toBe(world.player.day + 7)
  })

  it("returns a new reference without mutating the original world (immutability)", () => {
    const world = createTestWorld()
    const pricesBefore = JSON.parse(JSON.stringify(world.market.prices))
    const dayBefore = world.player.day

    const advanced = advanceDay(world, 2)
    // New top-level reference
    expect(advanced).not.toBe(world)
    // New player object
    expect(advanced.player).not.toBe(world.player)
    // New market object (applyDayPass creates new prices)
    expect(advanced.market).not.toBe(world.market)
    // Ship is unchanged; advanceDay only spreads world + updates player
    expect(advanced.ship).toBe(world.ship)
    expect(advanced.voyage).toBe(world.voyage)

    // Original world untouched
    expect(world.player.day).toBe(dayBefore)
    expect(world.market.prices).toEqual(pricesBefore)
  })

  it("ship and voyage pointers preserved (advanceDay doesn't touch them)", () => {
    const world = createTestWorld()
    const advanced = advanceDay(world, 2)

    expect(advanced.ship).toBe(world.ship)
    expect(advanced.voyage).toBe(world.voyage)
  })

  it("cargo and voyage structure survive unchanged", () => {
    const world = createTestWorld()
    const advanced = advanceDay(world, 1)

    // Cargo unchanged
    expect(advanced.ship.cargo).toEqual(world.ship.cargo)
    // Voyage still null
    expect(advanced.voyage).toBeNull()
    // Other ship fields preserved
    expect(advanced.ship.typeId).toBe(world.ship.typeId)
    expect(advanced.ship.upgradeLevel).toBe(world.ship.upgradeLevel)
    // Gold unchanged
    expect(advanced.player.gold).toBe(world.player.gold)
    // Port unchanged
    expect(advanced.player.currentPortId).toBe(world.player.currentPortId)
  })

  it("prices change after advancing (regression + noise)", () => {
    // Deterministic: mock Math.random so noise is predictable
    vi.spyOn(Math, "random").mockReturnValue(0.6)

    const world = createTestWorld()
    const pricesBefore = JSON.parse(JSON.stringify(world.market.prices))

    const advanced = advanceDay(world, 1)

    // Unchanged original
    expect(world.market.prices).toEqual(pricesBefore)

    // At least one price changed due to regression + noise
    const changed = PORTS.some((port) =>
      GOODS.some((good) => {
        const before = world.market.prices[port.id][good.id]
        const after = advanced.market.prices[port.id][good.id]
        return before !== after
      }),
    )
    expect(changed).toBe(true)

    vi.mocked(Math.random).mockRestore()
  })

  it("no price goes below 1 after advancing", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.0)

    const world = createTestWorld()
    const advanced = advanceDay(world, 1)
    const prices = advanced.market.prices

    for (const port of PORTS) {
      for (const good of GOODS) {
        expect(prices[port.id][good.id]).toBeGreaterThanOrEqual(1)
      }
    }

    vi.mocked(Math.random).mockRestore()
  })

  it("prices differ from initial after multiple days", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.3)

    const world = createTestWorld()
    const pricesBefore = JSON.parse(JSON.stringify(world.market.prices))

    const advanced = advanceDay(world, 3)

    const changed = PORTS.some((port) =>
      GOODS.some((good) => {
        return advanced.market.prices[port.id][good.id] !== pricesBefore[port.id][good.id]
      }),
    )
    expect(changed).toBe(true)

    vi.mocked(Math.random).mockRestore()
  })
})
