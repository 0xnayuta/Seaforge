import { describe, expect, it } from "bun:test";
import {
  buyShip,
  getActiveShip,
  getNearestPort,
  repairShip,
  sellShip,
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

  it("throws INVALID_SHIP for non-existent shipId", () => {
    const world = createTestWorld();
    expect(() => repairShip(world, "nonexistent-ship")).toThrow("INVALID_SHIP");
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
  it("upgrades sail component", () => {
    const world = createTestWorld();
    const result = upgradeComponent(world, getActiveShip(world).id, "sail");
    expect(result.fleet.ships[0].equipment.sailLevel).toBe(1);
    expect(result.fleet.gold).toBe(5000 - 300); // sloop sail Lv0 cost
  });

  it("upgrades armor component (recalculates maxDurability)", () => {
    const world = createTestWorld();
    const result = upgradeComponent(world, getActiveShip(world).id, "armor");
    // armor Lv0→1 for sloop: baseDurability 50 + armorLevel * 10
    expect(result.fleet.ships[0].equipment.armorLevel).toBe(1);
    expect(result.fleet.ships[0].maxDurability).toBe(60);
    expect(result.fleet.ships[0].durability).toBe(60);
  });

  it("upgrades cannon component", () => {
    const world = createTestWorld();
    const result = upgradeComponent(world, getActiveShip(world).id, "cannon");
    expect(result.fleet.ships[0].equipment.cannonLevel).toBe(1);
    expect(result.fleet.gold).toBe(5000 - 600); // sloop cannon Lv0 cost
  });

  it("throws INVALID_SHIP for non-existent shipId", () => {
    const world = createTestWorld();
    expect(() => upgradeComponent(world, "nonexistent-ship", "hull")).toThrow(
      "INVALID_SHIP",
    );
  });

  it("throws INSUFFICIENT_GOLD when cannot afford", () => {
    const world = createTestWorld({
      fleet: {
        ...createTestWorld().fleet,
        gold: 50,
      },
    });
    expect(() =>
      upgradeComponent(world, getActiveShip(world).id, "hull"),
    ).toThrow("INSUFFICIENT_GOLD");
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
        fleetShipIds: ["ship-1"],
      },
    });
    expect(() =>
      setArmamentLevel(voyaging, getActiveShip(voyaging).id, 1),
    ).toThrow("IN_VOYAGE");
  });
});

describe("buyShip", () => {
  it("successfully buys a ship when conditions are met", () => {
    // Start at London (where caravel is sold)
    const world = createTestWorld({
      player: {
        name: "test",
        currentPortId: "london",
        day: 1,
        level: 1,
        exp: 0,
        expToNext: 100,
      },
      fleet: {
        ships: [
          {
            id: "ship-1",
            typeId: "sloop",
            name: "单桅帆船",
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
        gold: 10000,
      },
    });

    // Buy caravel (price: 5000, sold at london)
    const result = buyShip(world, "caravel");
    expect(result.fleet.ships).toHaveLength(2);
    expect(result.fleet.ships[1].typeId).toBe("caravel");
    expect(result.fleet.gold).toBe(5000);
  });

  it("throws IN_VOYAGE when voyaging", () => {
    const world = createTestWorld({
      voyage: {
        fromPortId: "quanzhou",
        toPortId: "london",
        departureDay: 1,
        travelDays: 5,
        events: [],
        fleetShipIds: ["ship-1"],
      },
    });
    expect(() => buyShip(world, "caravel")).toThrow("IN_VOYAGE");
  });

  it("throws SHIP_NOT_AT_PORT when ship is not sold at current port", () => {
    // London doesn't sell galleon (sold at quanzhou)
    const world = createTestWorld({
      player: {
        name: "test",
        currentPortId: "london",
        day: 1,
        level: 1,
        exp: 0,
        expToNext: 100,
      },
    });
    expect(() => buyShip(world, "galleon")).toThrow("SHIP_NOT_AT_PORT");
  });

  it("throws FLEET_FULL when maxShips limit is reached", () => {
    const world = createTestWorld({
      player: {
        name: "test",
        currentPortId: "london",
        day: 1,
        level: 1,
        exp: 0,
        expToNext: 100,
      },
      fleet: {
        ships: [
          {
            id: "ship-1",
            typeId: "sloop",
            name: "单桅帆船",
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
        maxShips: 1, // Full
        crew: 3,
        maxCrew: 6,
        gold: 10000,
      },
    });
    expect(() => buyShip(world, "caravel")).toThrow("FLEET_FULL");
  });

  it("throws INSUFFICIENT_GOLD when gold is not enough", () => {
    const world = createTestWorld({
      player: {
        name: "test",
        currentPortId: "london",
        day: 1,
        level: 1,
        exp: 0,
        expToNext: 100,
      },
      fleet: {
        ships: [
          {
            id: "ship-1",
            typeId: "sloop",
            name: "单桅帆船",
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
        gold: 1000, // need 5000 for caravel
      },
    });
    expect(() => buyShip(world, "caravel")).toThrow("INSUFFICIENT_GOLD");
  });
});

describe("sellShip", () => {
  it("successfully sells a ship and recovers gold", () => {
    const world = createTestWorld({
      fleet: {
        ships: [
          {
            id: "ship-1",
            typeId: "sloop",
            name: "单桅帆船",
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
            typeId: "caravel", // basePrice: 5000
            name: "中型帆船",
            equipment: {
              hullLevel: 0,
              sailLevel: 0,
              armorLevel: 0,
              cannonLevel: 0,
            },
            durability: 80,
            maxDurability: 80,
            cargo: [],
            armamentLevel: 0,
            equippedItems: [],
          },
        ],
        activeShipId: "ship-2",
        maxShips: 3,
        crew: 3,
        maxCrew: 6,
        gold: 1000,
      },
    });

    // Sell ship-2: recovers 5000 * 0.5 = 2500 gold
    const result = sellShip(world, "ship-2");
    expect(result.fleet.ships).toHaveLength(1);
    expect(result.fleet.ships[0].id).toBe("ship-1");
    expect(result.fleet.gold).toBe(3500);
    expect(result.fleet.activeShipId).toBe("ship-1"); // activeShipId switched
  });

  it("throws LAST_SHIP when trying to sell the only ship", () => {
    const world = createTestWorld();
    expect(() => sellShip(world, "ship-1")).toThrow("LAST_SHIP");
  });

  it("throws SHIP_HAS_CARGO when ship is carrying goods", () => {
    const world = createTestWorld({
      fleet: {
        ships: [
          {
            id: "ship-1",
            typeId: "sloop",
            name: "单桅帆船",
            equipment: {
              hullLevel: 0,
              sailLevel: 0,
              armorLevel: 0,
              cannonLevel: 0,
            },
            durability: 50,
            maxDurability: 50,
            cargo: [{ goodsId: "silk", quantity: 5, buyPrice: 100 }], // has cargo
            armamentLevel: 0,
            equippedItems: [],
          },
          {
            id: "ship-2",
            typeId: "caravel",
            name: "中型帆船",
            equipment: {
              hullLevel: 0,
              sailLevel: 0,
              armorLevel: 0,
              cannonLevel: 0,
            },
            durability: 80,
            maxDurability: 80,
            cargo: [],
            armamentLevel: 0,
            equippedItems: [],
          },
        ],
        activeShipId: "ship-2",
        maxShips: 3,
        crew: 3,
        maxCrew: 6,
        gold: 1000,
      },
    });
    expect(() => sellShip(world, "ship-1")).toThrow("SHIP_HAS_CARGO");
  });
});
