import { describe, expect, it } from "bun:test";
import {
  getActiveShip,
  getNearestPort,
  repairShip,
  setArmamentLevel,
  takeDamage,
  upgradeComponent,
} from "../ship";
import { createTestWorld } from "./helpers";

describe("takeDamage", () => {
  it("reduces durability by damage amount", () => {
    const world = createTestWorld();
    const result = takeDamage(world, getActiveShip(world).id, 10);
    expect(result.fleet.ships[0].durability).toBe(40);
  });

  it("does not reduce below 0", () => {
    const world = createTestWorld();
    const result = takeDamage(world, getActiveShip(world).id, 200);
    expect(result.fleet.ships[0].durability).toBe(0);
  });

  it("returns same world when damage is 0", () => {
    const world = createTestWorld();
    const result = takeDamage(world, getActiveShip(world).id, 0);
    expect(result).toBe(world);
  });

  it("returns same world when damage is negative", () => {
    const world = createTestWorld();
    const result = takeDamage(world, getActiveShip(world).id, -5);
    expect(result).toBe(world);
  });
});

describe("repairShip", () => {
  it("restores durability to max and deducts gold", () => {
    const damaged = createTestWorld({
      fleet: {
        ...createTestWorld().fleet,
        ships: [
          {
            ...createTestWorld().fleet.ships[0],
            durability: 20,
          },
        ],
      },
    });
    const result = repairShip(damaged, getActiveShip(damaged).id);
    expect(result.fleet.ships[0].durability).toBe(50); // baseDurability = 50 (sloop)
    expect(result.fleet.gold).toBe(5000 - Math.ceil(30 * 5 * 1.0));
  });

  it("throws IN_VOYAGE when sailing", () => {
    const damaged = createTestWorld({
      voyage: {
        fromPortId: "quanzhou",
        toPortId: "malacca",
        departureDay: 1,
        travelDays: 4,
        events: [],
        armamentLevel: 0,
      },
    });
    expect(() => repairShip(damaged, getActiveShip(damaged).id)).toThrow(
      "IN_VOYAGE",
    );
  });

  it("throws INSUFFICIENT_GOLD when player cannot afford", () => {
    const poor = createTestWorld({
      player: { name: "a", currentPortId: "quanzhou", day: 1 },
      fleet: {
        ...createTestWorld().fleet,
        gold: 1,
        ships: [
          {
            ...createTestWorld().fleet.ships[0],
            durability: 1,
          },
        ],
      },
    });
    expect(() => repairShip(poor, getActiveShip(poor).id)).toThrow(
      "INSUFFICIENT_GOLD",
    );
  });

  it("returns same world when durability is full", () => {
    const world = createTestWorld();
    const result = repairShip(world, getActiveShip(world).id);
    expect(result).toBe(world);
  });
});

describe("getNearestPort", () => {
  it("returns fromPort when route is shorter or equal", () => {
    expect(getNearestPort("quanzhou", "nagasaki")).toBe("quanzhou");
  });

  it("returns shorter port when asymmetric", () => {
    expect(getNearestPort("malacca", "nagasaki")).toBe("malacca");
  });
});

describe("upgradeComponent", () => {
  it("increases hullLevel", () => {
    const world = createTestWorld();
    const result = upgradeComponent(world, getActiveShip(world).id, "hull");
    expect(result.fleet.ships[0].equipment.hullLevel).toBe(1);
    // hull upgrade does not affect durability/maxDurability (armor does)
    expect(result.fleet.ships[0].maxDurability).toBe(50);
    expect(result.fleet.ships[0].durability).toBe(50);
  });

  it("deducts gold", () => {
    const world = createTestWorld();
    const result = upgradeComponent(world, getActiveShip(world).id, "hull");
    expect(result.fleet.gold).toBe(5000 - 500); // sloop hull Lv0 cost
  });

  it("throws MAX_LEVEL_REACHED at max level", () => {
    const maxed = createTestWorld({
      fleet: {
        ...createTestWorld().fleet,
        ships: [
          {
            ...createTestWorld().fleet.ships[0],
            equipment: {
              hullLevel: 3,
              sailLevel: 0,
              armorLevel: 0,
              cannonLevel: 0,
            },
          },
        ],
      },
    });
    expect(() =>
      upgradeComponent(maxed, getActiveShip(maxed).id, "hull"),
    ).toThrow("MAX_LEVEL_REACHED");
  });

  it("throws IN_VOYAGE when sailing", () => {
    const voyaging = createTestWorld({
      voyage: {
        fromPortId: "quanzhou",
        toPortId: "malacca",
        departureDay: 1,
        travelDays: 4,
        events: [],
        armamentLevel: 0,
      },
    });
    expect(() =>
      upgradeComponent(voyaging, getActiveShip(voyaging).id, "hull"),
    ).toThrow("IN_VOYAGE");
  });
});

describe("setArmamentLevel", () => {
  it("sets armament level on the ship", () => {
    const world = createTestWorld();
    const result = setArmamentLevel(world, getActiveShip(world).id, 2);
    expect(result.fleet.ships[0].armamentLevel).toBe(2);
  });

  it("does not mutate the original world", () => {
    const world = createTestWorld();
    setArmamentLevel(world, getActiveShip(world).id, 2);
    expect(world.fleet.ships[0].armamentLevel).toBe(0);
  });

  it("throws IN_VOYAGE when sailing", () => {
    const voyaging = createTestWorld({
      voyage: {
        fromPortId: "quanzhou",
        toPortId: "malacca",
        departureDay: 1,
        travelDays: 4,
        events: [],
        armamentLevel: 0,
      },
    });
    expect(() =>
      setArmamentLevel(voyaging, getActiveShip(voyaging).id, 1),
    ).toThrow("IN_VOYAGE");
  });
});
