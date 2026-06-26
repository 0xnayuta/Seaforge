import { describe, expect, it, vi } from "bun:test";
import type { VoyageEvent } from "../types";
import {
  applyVoyageEvents,
  generateVoyageEvents,
  startVoyage,
} from "../voyage";
import { createTestWorld } from "./helpers";

describe("startVoyage", () => {
  it("returns VoyageState with correct from/to/departureDay/travelDays", () => {
    const world = createTestWorld();
    const result = startVoyage(world, "quanzhou", "malacca", 5);

    expect(result.fromPortId).toBe("quanzhou");
    expect(result.toPortId).toBe("malacca");
    expect(result.departureDay).toBe(world.player.day);
    expect(result.travelDays).toBe(5);
  });

  it("events is an array (may be empty)", () => {
    const world = createTestWorld();
    const result = startVoyage(world, "quanzhou", "malacca", 0);

    expect(Array.isArray(result.events)).toBe(true);
  });
});

describe("applyVoyageEvents", () => {
  it("applying events with goldChange adjusts gold correctly", () => {
    const world = createTestWorld();
    const events: VoyageEvent[] = [
      { day: 1, description: "found treasure", goldChange: 100, cargoLoss: 0 },
      { day: 2, description: "lost coins", goldChange: -50, cargoLoss: 0 },
    ];

    const result = applyVoyageEvents(world, events);

    expect(result.player.gold).toBe(5000 + 100 - 50);
  });

  it("gold never goes below 0", () => {
    const world = createTestWorld();
    const events: VoyageEvent[] = [
      { day: 1, description: "disaster", goldChange: -6000, cargoLoss: 0 },
    ];

    const result = applyVoyageEvents(world, events);

    expect(result.player.gold).toBe(0);
  });

  it("cargo loss removes quantity from a cargo item", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    const world = createTestWorld();
    const events: VoyageEvent[] = [
      { day: 1, description: "pirates", goldChange: 0, cargoLoss: 2 },
    ];

    const result = applyVoyageEvents(world, events);

    // Math.random()=0 picks cargo[0] (silk, qty 5); remaining = 5-2 = 3
    expect(result.ship.cargo).toHaveLength(2);
    expect(result.ship.cargo[0].goodId).toBe("silk");
    expect(result.ship.cargo[0].quantity).toBe(3);
    expect(result.ship.cargo[1].goodId).toBe("spice");
    expect(result.ship.cargo[1].quantity).toBe(3);

    vi.restoreAllMocks();
  });

  it("cargo loss removes the entire item when quantity reaches 0", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    const world = createTestWorld();
    const events: VoyageEvent[] = [
      { day: 1, description: "pirates", goldChange: 0, cargoLoss: 5 },
    ];

    const result = applyVoyageEvents(world, events);

    // silk qty 5 - 5 = 0 → item removed entirely
    expect(result.ship.cargo).toHaveLength(1);
    expect(result.ship.cargo[0].goodId).toBe("spice");

    vi.restoreAllMocks();
  });

  it("cargo loss does nothing when cargo is empty", () => {
    const world = createTestWorld({
      ship: { typeId: "sloop", upgradeLevel: 0, cargo: [] },
    });
    const events: VoyageEvent[] = [
      { day: 1, description: "pirates", goldChange: 0, cargoLoss: 2 },
    ];

    const result = applyVoyageEvents(world, events);

    expect(result.ship.cargo).toHaveLength(0);
  });

  it("multiple events with gold changes accumulate correctly", () => {
    const world = createTestWorld();
    const events: VoyageEvent[] = [
      { day: 1, description: "found treasure", goldChange: 150, cargoLoss: 0 },
      { day: 2, description: "paid crew", goldChange: -30, cargoLoss: 0 },
      { day: 3, description: "bounty", goldChange: 200, cargoLoss: 0 },
    ];

    const result = applyVoyageEvents(world, events);

    expect(result.player.gold).toBe(5000 + 150 - 30 + 200);
  });
});

describe("generateVoyageEvents", () => {
  it("returns 0 events when Math.random never triggers (lower bound)", () => {
    vi.spyOn(Math, "random").mockReturnValue(1);

    const world = createTestWorld();
    const result = generateVoyageEvents(world, 10);

    expect(result).toHaveLength(0);

    vi.restoreAllMocks();
  });

  it("returns travelDays events when Math.random always triggers (upper bound)", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    const world = createTestWorld();
    const result = generateVoyageEvents(world, 5);

    expect(result).toHaveLength(5);

    vi.restoreAllMocks();
  });

  it("uses triggerText from events config as description", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    const world = createTestWorld();
    const result = generateVoyageEvents(world, 1);

    expect(result).toHaveLength(1);
    expect(result[0].description).toBe("海面吹起顺风，船帆鼓满，船行如飞。");

    vi.restoreAllMocks();
  });

  it("produces events distributed across all event types over many rolls", () => {
    vi.restoreAllMocks();

    const world = createTestWorld();
    const allEvents = generateVoyageEvents(world, 1000);

    // Should trigger some events
    expect(allEvents.length).toBeGreaterThan(100);
    // Should include pirate events (cargoLoss > 0 for some)
    const withLoss = allEvents.filter((e) => e.cargoLoss > 0);
    expect(withLoss.length).toBeGreaterThan(5);
    // Should include gold-gain events
    const withGain = allEvents.filter((e) => e.goldChange > 0);
    expect(withGain.length).toBeGreaterThan(20);
    // Should include gold-loss events
    const withLossGold = allEvents.filter((e) => e.goldChange < 0);
    expect(withLossGold.length).toBeGreaterThan(5);
  });

  it("region lookup does not crash for unknown ports", () => {
    vi.spyOn(Math, "random").mockReturnValue(1);

    const world = createTestWorld({
      player: { ...createTestWorld().player, currentPortId: "unknown" },
    });
    const result = generateVoyageEvents(world, 5);

    expect(Array.isArray(result)).toBe(true);

    vi.restoreAllMocks();
  });
});
