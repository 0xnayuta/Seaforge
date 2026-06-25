import { describe, it, expect } from "vitest"
import { createTestWorld, createEmptyWorld } from "../../domain/__tests__/helpers"
import {
  buildHarborView,
  buildMarketView,
  buildNavigationView,
  buildCargoView,
  buildShipView,
} from "../buildGameView"

describe("buildHarborView", () => {
  it("returns port info for current port", () => {
    const world = createTestWorld()
    const view = buildHarborView(world)

    expect(view.portName).toBe("泉州")
    expect(view.portDescription).toBeTruthy()
    expect(view.region).toBe("闽南")
  })

  it("shows player gold, cargo, day", () => {
    const world = createTestWorld()
    const view = buildHarborView(world)

    expect(view.playerGold).toBe(5000)
    expect(view.cargoCount).toBeGreaterThan(0)
    expect(view.cargoCapacity).toBe(30)
    expect(view.currentDay).toBe(1)
  })

  it("shows ship name", () => {
    const world = createTestWorld()
    const view = buildHarborView(world)

    expect(view.shipName).toBe("单桅帆船")
  })

  it("handles unknown port gracefully", () => {
    const world = createTestWorld({
      player: { name: "船长", gold: 5000, currentPortId: "unknown", day: 1 },
    })
    const view = buildHarborView(world)

    expect(view.portName).toBe("未知")
  })
})

describe("buildMarketView", () => {
  it("returns all goods with prices", () => {
    const world = createTestWorld()
    const view = buildMarketView(world)

    expect(view.portName).toBe("泉州")
    expect(view.goods).toHaveLength(5)
    expect(view.playerGold).toBe(5000)
  })

  it("silk price at quanzhou = 102 (base 120 × 0.85)", () => {
    const world = createTestWorld()
    const view = buildMarketView(world)

    const silk = view.goods.find((g) => g.id === "silk")
    expect(silk?.buyPrice).toBe(102)
  })

  it("sell price equals buy price (no spread)", () => {
    const world = createTestWorld()
    const view = buildMarketView(world)

    for (const good of view.goods) {
      expect(good.sellPrice).toBe(good.buyPrice)
    }
  })

  it("shows inCargo for goods in hold", () => {
    const world = createTestWorld()
    const view = buildMarketView(world)

    const silk = view.goods.find((g) => g.id === "silk")
    expect(silk?.inCargo).toBe(5)

    const timber = view.goods.find((g) => g.id === "timber")
    expect(timber?.inCargo).toBe(0)
  })
})

describe("buildNavigationView", () => {
  it("lists destinations reachable from current port", () => {
    const world = createTestWorld() // quanzhou
    const view = buildNavigationView(world)

    expect(view.currentPortName).toBe("泉州")
    // quanzhou routes: to malacca (dist 8) and nagasaki (dist 5)
    expect(view.destinations).toHaveLength(2)
  })

  it("each destination has port info and travel days", () => {
    const world = createTestWorld()
    const view = buildNavigationView(world)

    for (const dest of view.destinations) {
      expect(dest.portId).toBeTruthy()
      expect(dest.portName).toBeTruthy()
      expect(dest.travelDays).toBeGreaterThan(0)
      expect(dest.distance).toBeGreaterThan(0)
    }
  })
})

describe("buildCargoView", () => {
  it("lists cargo items", () => {
    const world = createTestWorld()
    const view = buildCargoView(world)

    expect(view.shipName).toBe("单桅帆船")
    expect(view.items).toHaveLength(2)
  })

  it("shows used and max capacity", () => {
    const world = createTestWorld()
    const view = buildCargoView(world)

    expect(view.usedCapacity).toBeGreaterThan(0)
    expect(view.maxCapacity).toBe(30)
  })

  it("empty cargo returns empty items", () => {
    const world = createEmptyWorld()
    const view = buildCargoView(world)

    expect(view.items).toHaveLength(0)
    expect(view.usedCapacity).toBe(0)
  })

  it("each cargo item has price info", () => {
    const world = createTestWorld()
    const view = buildCargoView(world)

    for (const item of view.items) {
      expect(item.goodId).toBeTruthy()
      expect(item.goodName).toBeTruthy()
      expect(item.quantity).toBeGreaterThan(0)
      expect(item.buyPrice).toBeGreaterThan(0)
      expect(item.sellPrice).toBeGreaterThan(0)
    }
  })
})

describe("buildShipView", () => {
  it("shows ship config and upgrade info", () => {
    const world = createTestWorld()
    const view = buildShipView(world)

    expect(view.shipName).toBe("单桅帆船")
    expect(view.upgradeLevel).toBe(0)
    expect(view.maxUpgradeLevel).toBeGreaterThan(0)
    expect(view.capacity).toBe(30)
    expect(view.speed).toBe(1.0)
  })

  it("upgradeCost is available when under max level and can afford", () => {
    const world = createTestWorld()
    const view = buildShipView(world)

    // sloop level 0, cost = 500, player has 5000
    expect(view.upgradeCost).toBe(500)
    expect(view.canUpgrade).toBe(true)
  })

  it("canUpgrade false when gold insufficient", () => {
    const world = createTestWorld({
      player: { name: "船长", gold: 100, currentPortId: "quanzhou", day: 1 },
    })
    const view = buildShipView(world)

    expect(view.upgradeCost).toBe(500)
    expect(view.canUpgrade).toBe(false)
  })

  it("upgradeCost null at max level", () => {
    const world = createTestWorld({
      ship: { typeId: "sloop", upgradeLevel: 3, cargo: [] },
    })
    const view = buildShipView(world)

    expect(view.upgradeCost).toBeNull()
    expect(view.canUpgrade).toBe(false)
  })
})
