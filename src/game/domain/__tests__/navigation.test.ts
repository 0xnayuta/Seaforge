import { describe, expect, it } from "bun:test";
import { PORTS } from "../../../data/ports";
import { arriveAtPort, getReachablePorts } from "../navigation";
import { createTestWorld } from "./helpers";

describe("getReachablePorts", () => {
  it("from quanzhou returns all other ports sorted by distance", () => {
    const world = createTestWorld();
    const ports = getReachablePorts(world);

    // 12 ports total, 11 reachable (excluding current)
    expect(ports).toHaveLength(PORTS.length - 1);

    // nearest: nagasaki (coordinates: quanzhou 48,32 → nagasaki 51,35)
    expect(ports[0].port.id).toBe("nagasaki");
    expect(ports[0].distance).toBe(4);
    expect(ports[0].travelDays).toBe(2);
  });

  it("each destination has correct portId and portName", () => {
    const world = createTestWorld();
    const ports = getReachablePorts(world);

    const malacca = ports.find((p) => p.port.id === "malacca");
    expect(malacca).toBeDefined();
    expect(malacca?.port.name).toBe("马六甲");
    // quanzhou→malacca: (48,32)→(44,26) dx=4 dy=6 → sqrt(52)=7.2→7
    expect(malacca?.distance).toBe(7);
    expect(malacca?.travelDays).toBe(4);

    const nagasaki = ports.find((p) => p.port.id === "nagasaki");
    expect(nagasaki).toBeDefined();
    expect(nagasaki?.port.name).toBe("长崎");
    // quanzhou→nagasaki: (48,32)→(51,35) dx=3 dy=3 → sqrt(18)=4.2→4
    expect(nagasaki?.distance).toBe(4);
    expect(nagasaki?.travelDays).toBe(2);
  });

  it("returns empty array for unknown current port", () => {
    const world = createTestWorld({
      player: { name: "x", gold: 0, currentPortId: "unknown", day: 1 },
    });
    expect(getReachablePorts(world)).toHaveLength(0);
  });
});

describe("arriveAtPort", () => {
  it("sets currentPortId to target, does NOT change day", () => {
    const world = createTestWorld();
    expect(world.player.currentPortId).toBe("quanzhou");
    expect(world.player.day).toBe(1);

    const result = arriveAtPort(world, "nagasaki", 3);

    expect(result.player.currentPortId).toBe("nagasaki");
    expect(result.player.day).toBe(1);
  });

  it("returns a new world reference without mutating the original", () => {
    const world = createTestWorld();
    const result = arriveAtPort(world, "malacca", 4);

    expect(result).not.toBe(world);
    expect(world.player.currentPortId).toBe("quanzhou");
  });
});

import { calcFleetTravelDays } from "../navigation";

describe("calcFleetTravelDays", () => {
  it("uses slowest ship in fleet to determine travel days", () => {
    const world = createTestWorld({
      fleet: {
        ships: [
          {
            id: "ship-1",
            typeId: "light-sailboat", // speed: 1.2
            name: "快船",
            equipment: {
              hullLevel: 0,
              sailLevel: 0,
              armorLevel: 0,
              cannonLevel: 0,
            },
            durability: 35,
            maxDurability: 35,
            cargo: [],
            armamentLevel: 0,
            equippedItems: [],
          },
          {
            id: "ship-2",
            typeId: "galleon", // speed: 0.55 (slowest)
            name: "慢船",
            equipment: {
              hullLevel: 0,
              sailLevel: 0,
              armorLevel: 0,
              cannonLevel: 0,
            },
            durability: 120,
            maxDurability: 120,
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

    // Distance 10.
    // Speed light-sailboat: 1.2 * 2.0 = 2.4. Travel days: ceil(10/2.4) = 5
    // Speed galleon: 0.55 * 2.0 = 1.1. Travel days: ceil(10/1.1) = 10
    // Level 1 bonus: 1 + 1 * 0.02 = 1.02.
    // If we send only ship-1: speed 1.2 * 1.02 * 2.0 = 2.448. ceil(10/2.448) = 5 days.
    // If we send ship-1 and ship-2: fleet speed is galleon's 0.55.
    // 0.55 * 1.02 * 2.0 = 1.122. ceil(10/1.122) = 9 days.
    expect(calcFleetTravelDays(10, world, ["ship-1"])).toBe(5);
    expect(calcFleetTravelDays(10, world, ["ship-1", "ship-2"])).toBe(9);
  });
});
