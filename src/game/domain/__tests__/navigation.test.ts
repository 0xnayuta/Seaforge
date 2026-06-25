import { describe, it, expect } from "vitest"
import { createTestWorld } from "./helpers"
import { calcTravelDays, getReachablePorts, arriveAtPort } from "../navigation"
import { ROUTES } from "../../../data/ports"

describe("calcTravelDays", () => {
  it("quanzhou→nagasaki distance=5, sloop speed=1.0, SPEED_BASE=2.0 → ceil(5/(1*2)) = 3", () => {
    const world = createTestWorld()
    expect(calcTravelDays(5, world)).toBe(3)
  })

  it("quanzhou→malacca distance=8 → ceil(8/(1*2)) = 4", () => {
    const world = createTestWorld()
    expect(calcTravelDays(8, world)).toBe(4)
  })
})

describe("getReachablePorts", () => {
  it("from quanzhou returns 2 destinations (malacca@4days, nagasaki@3days)", () => {
    const world = createTestWorld()
    const ports = getReachablePorts(world)
    expect(ports).toHaveLength(2)
  })

  it("each destination has correct portId and portName", () => {
    const world = createTestWorld()
    const ports = getReachablePorts(world)

    // quanzhou→malacca route
    const malacca = ports.find((p) => p.port.id === "malacca")
    expect(malacca).toBeDefined()
    expect(malacca!.port.name).toBe("马六甲")
    expect(malacca!.distance).toBe(8)
    expect(malacca!.travelDays).toBe(4)

    // quanzhou→nagasaki route
    const nagasaki = ports.find((p) => p.port.id === "nagasaki")
    expect(nagasaki).toBeDefined()
    expect(nagasaki!.port.name).toBe("长崎")
    expect(nagasaki!.distance).toBe(5)
    expect(nagasaki!.travelDays).toBe(3)
  })

  it("distances match ROUTES data for quanzhou", () => {
    const world = createTestWorld()
    const ports = getReachablePorts(world)
    const quanzhouRoutes = ROUTES.filter((r) => r.from === "quanzhou")

    expect(ports).toHaveLength(quanzhouRoutes.length)

    for (const route of quanzhouRoutes) {
      const reachable = ports.find((p) => p.port.id === route.to)
      expect(reachable).toBeDefined()
      expect(reachable!.distance).toBe(route.distance)
    }
  })
})

describe("arriveAtPort", () => {
  it("sets currentPortId to target, does NOT change day", () => {
    const world = createTestWorld()
    expect(world.player.currentPortId).toBe("quanzhou")
    expect(world.player.day).toBe(1)

    const result = arriveAtPort(world, "nagasaki", 3)

    expect(result.player.currentPortId).toBe("nagasaki")
    // Day should remain unchanged (advanceDay handles day progression)
    expect(result.player.day).toBe(1)
  })

  it("returns a new world reference without mutating the original", () => {
    const world = createTestWorld()
    const result = arriveAtPort(world, "malacca", 4)

    expect(result).not.toBe(world)
    expect(world.player.currentPortId).toBe("quanzhou")
  })
})
