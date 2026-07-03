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
    const result = startVoyage(world, {
      fromPortId: "quanzhou",
      toPortId: "malacca",
      travelDays: 5,
    });

    expect(result.fromPortId).toBe("quanzhou");
    expect(result.toPortId).toBe("malacca");
    expect(result.departureDay).toBe(world.player.day);
    expect(result.travelDays).toBe(5);
  });

  it("events is an array (may be empty)", () => {
    const world = createTestWorld();
    const result = startVoyage(world, {
      fromPortId: "quanzhou",
      toPortId: "malacca",
      travelDays: 0,
    });

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

    expect(result.fleet.gold).toBe(5000 + 100 - 50);
  });

  it("gold never goes below 0", () => {
    const world = createTestWorld();
    const events: VoyageEvent[] = [
      { day: 1, description: "disaster", goldChange: -6000, cargoLoss: 0 },
    ];

    const result = applyVoyageEvents(world, events);

    expect(result.fleet.gold).toBe(0);
  });

  it("cargo loss removes quantity from a cargo item", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    const world = createTestWorld();
    const events: VoyageEvent[] = [
      { day: 1, description: "pirates", goldChange: 0, cargoLoss: 2 },
    ];

    const result = applyVoyageEvents(world, events);

    // Math.random()=0 picks cargo[0] (silk, quantity 5); remaining = 5-2 = 3
    expect(result.fleet.ships[0].cargo).toHaveLength(2);
    expect(result.fleet.ships[0].cargo[0].goodsId).toBe("silk");
    expect(result.fleet.ships[0].cargo[0].quantity).toBe(3);
    expect(result.fleet.ships[0].cargo[1].goodsId).toBe("spice");
    expect(result.fleet.ships[0].cargo[1].quantity).toBe(3);

    vi.restoreAllMocks();
  });

  it("cargo loss removes the entire item when quantity reaches 0", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    const world = createTestWorld();
    const events: VoyageEvent[] = [
      { day: 1, description: "pirates", goldChange: 0, cargoLoss: 5 },
    ];

    const result = applyVoyageEvents(world, events);

    // silk quantity 5 - 5 = 0 → item removed entirely
    expect(result.fleet.ships[0].cargo).toHaveLength(1);
    expect(result.fleet.ships[0].cargo[0].goodsId).toBe("spice");

    vi.restoreAllMocks();
  });

  it("cargo loss does nothing when cargo is empty", () => {
    const world = createTestWorld({
      fleet: {
        ...createTestWorld().fleet,
        ships: [
          {
            ...createTestWorld().fleet.ships[0],
            cargo: [],
          },
        ],
      },
    });
    const events: VoyageEvent[] = [
      { day: 1, description: "pirates", goldChange: 0, cargoLoss: 2 },
    ];

    const result = applyVoyageEvents(world, events);

    expect(result.fleet.ships[0].cargo).toHaveLength(0);
  });

  it("multiple events with gold changes accumulate correctly", () => {
    const world = createTestWorld();
    const events: VoyageEvent[] = [
      { day: 1, description: "found treasure", goldChange: 150, cargoLoss: 0 },
      { day: 2, description: "paid crew", goldChange: -30, cargoLoss: 0 },
      { day: 3, description: "bounty", goldChange: 200, cargoLoss: 0 },
    ];

    const result = applyVoyageEvents(world, events);

    expect(result.fleet.gold).toBe(5000 + 150 - 30 + 200);
  });

  it("grants EVENT_EXP per event", () => {
    const world = createTestWorld();
    expect(world.player.exp).toBe(0);

    const events: VoyageEvent[] = [
      { day: 1, description: "storm", goldChange: 0, cargoLoss: 0 },
      { day: 2, description: "calm", goldChange: 0, cargoLoss: 0 },
    ];

    const result = applyVoyageEvents(world, events);
    expect(result.player.exp).toBe(10); // 2 events × EVENT_EXP
  });

  it("storm event reduces durability of active ships and potentially loses crew", () => {
    // Mock Math.random to trigger crew loss
    // 1st random for crew loss chance (need < STORM_CREW_LOSS_CHANCE = 0.3) -> 0.1
    // 2nd random for crew loss quantity (STORM_CREW_LOSS_MIN + Math.random * (STORM_CREW_LOSS_MAX - STORM_CREW_LOSS_MIN + 1)) -> 0.0 (losses STORM_CREW_LOSS_MIN = 1)
    // 3rd random for cargoLossChance (not storm, but standard defaults if any, wait, storm uses createDefaultEvent which uses Math.random, but we pass pre-generated events here, so Math.random inside applyStormEvent only calls Math.random twice for crew loss and once for HP damage range)
    const randomSpy = vi.spyOn(Math, "random");
    randomSpy.mockReturnValueOnce(0.1); // crew loss triggers
    randomSpy.mockReturnValueOnce(0.0); // loses 1 crew member
    randomSpy.mockReturnValue(0.0); // min damage for HP = STORM_HP_DAMAGE_MIN = 5

    const world = createTestWorld({
      fleet: {
        ships: [createTestWorld().fleet.ships[0]],
        activeShipId: "ship-1",
        maxShips: 1,
        crew: 5,
        maxCrew: 10,
        gold: 1000,
      },
      voyage: {
        fromPortId: "quanzhou",
        toPortId: "malacca",
        departureDay: 1,
        travelDays: 5,
        events: [],
        fleetShipIds: ["ship-1"],
      },
    });

    const events: VoyageEvent[] = [
      {
        day: 1,
        description: "狂风巨浪",
        goldChange: 0,
        cargoLoss: 0,
        type: "storm",
      },
    ];

    const result = applyVoyageEvents(world, events);
    expect(result.fleet.ships[0].durability).toBe(44); // 50 - 6 = 44 (RNG = 0.1)
    expect(result.fleet.crew).toBe(4); // 5 - 1 = 4

    randomSpy.mockRestore();
  });

  it("storm event sinking triggers total loss when flagship durability reaches 0", () => {
    // Mock Math.random to return 1.0 (no crew loss) and 1.0 (max damage = STORM_HP_DAMAGE_MAX = 20)
    const randomSpy = vi.spyOn(Math, "random");
    randomSpy.mockReturnValueOnce(0.9); // no crew loss triggers
    randomSpy.mockReturnValueOnce(1.0); // max damage = 20

    const world = createTestWorld({
      fleet: {
        ships: [
          {
            ...createTestWorld().fleet.ships[0],
            durability: 15, // will drop below 0 with 20 damage!
          },
        ],
        activeShipId: "ship-1",
        maxShips: 1,
        crew: 5,
        maxCrew: 10,
        gold: 1000,
      },
      voyage: {
        fromPortId: "quanzhou",
        toPortId: "malacca",
        departureDay: 1,
        travelDays: 5,
        events: [],
        fleetShipIds: ["ship-1"],
      },
    });

    const events: VoyageEvent[] = [
      {
        day: 1,
        description: "狂风暴雨",
        goldChange: 0,
        cargoLoss: 0,
        type: "storm",
      },
    ];

    const result = applyVoyageEvents(world, events);

    // Should trigger total loss:
    expect(result.voyage).toBeNull(); // voyage cleared
    expect(result.fleet.ships[0].durability).toBe(1); // HP set to 1
    expect(result.fleet.ships[0].cargo).toHaveLength(0); // cargo cleared
    expect(result.fleet.crew).toBe(0); // crew set to 0
    expect(result.player.currentPortId).toBe("quanzhou"); // teleported back to source (nearest port)

    randomSpy.mockRestore();
  });

  it("breaks early if flagship sinks mid-voyage and subsequent events occur", () => {
    const randomSpy = vi.spyOn(Math, "random");
    randomSpy.mockReturnValueOnce(0.9); // no crew loss triggers
    randomSpy.mockReturnValueOnce(1.0); // max damage = 20

    const world = createTestWorld({
      fleet: {
        ships: [
          {
            ...createTestWorld().fleet.ships[0],
            durability: 15, // drops below 0 with 20 damage
          },
        ],
        activeShipId: "ship-1",
        maxShips: 1,
        crew: 5,
        maxCrew: 10,
        gold: 1000,
      },
      voyage: {
        fromPortId: "quanzhou",
        toPortId: "malacca",
        departureDay: 1,
        travelDays: 5,
        events: [],
        fleetShipIds: ["ship-1"],
      },
    });

    const events: VoyageEvent[] = [
      {
        day: 1,
        description: "狂风暴雨",
        goldChange: 0,
        cargoLoss: 0,
        type: "storm",
      },
      {
        day: 2,
        description: "海盗袭击",
        goldChange: 0,
        cargoLoss: 0,
        type: "combat",
      },
    ];

    // Should execute without throwing DomainError "IN_VOYAGE"
    const result = applyVoyageEvents(world, events);
    expect(result.voyage).toBeNull();
    expect(result.fleet.ships[0].durability).toBe(1);

    randomSpy.mockRestore();
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

import { applyCombatOutcome } from "../combat";

describe("applyVoyageEvents fleet behavior", () => {
  it("splits cargo loss evenly across fleet ships", () => {
    const world = createTestWorld({
      voyage: {
        fromPortId: "quanzhou",
        toPortId: "malacca",
        departureDay: 1,
        travelDays: 3,
        events: [],
        fleetShipIds: ["ship-1", "ship-2"], // 2 ships in voyage
      },
      fleet: {
        ships: [
          {
            id: "ship-1",
            typeId: "sloop",
            name: "ship 1",
            equipment: {
              hullLevel: 0,
              sailLevel: 0,
              armorLevel: 0,
              cannonLevel: 0,
            },
            durability: 50,
            maxDurability: 50,
            cargo: [{ goodsId: "silk", quantity: 5, buyPrice: 100 }],
            armamentLevel: 0,
            equippedItems: [],
          },
          {
            id: "ship-2",
            typeId: "sloop",
            name: "ship 2",
            equipment: {
              hullLevel: 0,
              sailLevel: 0,
              armorLevel: 0,
              cannonLevel: 0,
            },
            durability: 50,
            maxDurability: 50,
            cargo: [{ goodsId: "silk", quantity: 5, buyPrice: 100 }],
            armamentLevel: 0,
            equippedItems: [],
          },
        ],
        activeShipId: "ship-1",
        maxShips: 3,
        crew: 3,
        maxCrew: 6,
        gold: 1000,
      },
    });

    vi.spyOn(Math, "random").mockReturnValue(0);

    const events: VoyageEvent[] = [
      { day: 1, description: "pirates", goldChange: 0, cargoLoss: 4 }, // loss = 4, split = 2 per ship
    ];

    const result = applyVoyageEvents(world, events);

    // Both ships should lose 2 silk
    expect(result.fleet.ships[0].cargo[0].quantity).toBe(3);
    expect(result.fleet.ships[1].cargo[0].quantity).toBe(3);

    vi.restoreAllMocks();
  });
});

describe("applyCombatOutcome fleet behavior", () => {
  it("splits HP damage evenly across all fleet ships", () => {
    const world = createTestWorld({
      fleet: {
        ships: [
          {
            id: "ship-1",
            typeId: "sloop",
            name: "ship 1",
            equipment: {
              hullLevel: 0,
              sailLevel: 0,
              armorLevel: 0,
              cannonLevel: 0,
            },
            durability: 50,
            maxDurability: 50,
            cargo: [],
            armamentLevel: 0,
            equippedItems: [],
          },
          {
            id: "ship-2",
            typeId: "sloop",
            name: "ship 2",
            equipment: {
              hullLevel: 0,
              sailLevel: 0,
              armorLevel: 0,
              cannonLevel: 0,
            },
            durability: 50,
            maxDurability: 50,
            cargo: [],
            armamentLevel: 0,
            equippedItems: [],
          },
        ],
        activeShipId: "ship-1",
        maxShips: 3,
        crew: 3,
        maxCrew: 6,
        gold: 1000,
      },
    });

    const outcome = {
      result: "partialLoss" as const,
      hpDamage: 10, // 10 damage total, split = 5 per ship
      cargoLoss: 0,
      description: "fight",
    };

    const result = applyCombatOutcome(world, outcome, "quanzhou", [
      "ship-1",
      "ship-2",
    ]);

    expect(result.fleet.ships[0].durability).toBe(45);
    expect(result.fleet.ships[1].durability).toBe(45);
  });
});
