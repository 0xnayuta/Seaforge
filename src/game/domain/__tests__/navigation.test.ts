import { describe, expect, it } from "bun:test";
import { PORTS } from "../../../data/ports";
import { arriveAtPort, calcTravelDays, getReachablePorts } from "../navigation";
import { createTestWorld } from "./helpers";

describe("calcTravelDays", () => {
  it("distance 5 → ceil(5/(1*2)) = 3", () => {
    const world = createTestWorld();
    expect(calcTravelDays(5, world)).toBe(3);
  });

  it("distance 8 → ceil(8/(1*2)) = 4", () => {
    const world = createTestWorld();
    expect(calcTravelDays(8, world)).toBe(4);
  });

  it("level 10 reduces travel days vs level 1", () => {
    const worldL1 = createTestWorld();
    const worldL10 = createTestWorld({
      player: {
        name: "x",
        gold: 5000,
        currentPortId: "quanzhou",
        day: 1,
        level: 10,
        exp: 0,
        expToNext: 100,
      },
    });

    // distance 30: level 1 → ceil(30/(1*1.02*2)) = 15, level 10 → ceil(30/(1*1.20*2)) = 13
    expect(calcTravelDays(30, worldL1)).toBe(15);
    expect(calcTravelDays(30, worldL10)).toBe(13);
  });
});

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
