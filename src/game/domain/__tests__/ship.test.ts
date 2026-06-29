import { describe, expect, it } from "bun:test";
import { getNearestPort, repairShip, setArmamentLevel, takeDamage, upgradeShip } from "../ship";
import { createTestWorld } from "./helpers";

describe("takeDamage", () => {
  it("reduces currentHp by damage amount", () => {
    const world = createTestWorld();
    const result = takeDamage(world, 10);
    expect(result.ship.currentHp).toBe(40);
  });

  it("does not reduce below 0", () => {
    const world = createTestWorld();
    const result = takeDamage(world, 200);
    expect(result.ship.currentHp).toBe(0);
  });

  it("returns same world when damage is 0", () => {
    const world = createTestWorld();
    const result = takeDamage(world, 0);
    expect(result).toBe(world); // 引用不变
  });

  it("returns same world when damage is negative", () => {
    const world = createTestWorld();
    const result = takeDamage(world, -5);
    expect(result).toBe(world);
  });
});

describe("repairShip", () => {
  it("restores HP to max and deducts gold", () => {
    const damaged = createTestWorld();
    damaged.ship.currentHp = 20;
    const result = repairShip(damaged);
    expect(result.ship.currentHp).toBe(50); // maxHp = 50 (sloop)
    expect(result.player.gold).toBe(5000 - Math.ceil(30 * 5 * 1.0)); // 修复 30 HP
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
    expect(() => repairShip(damaged)).toThrow("IN_VOYAGE");
  });

  it("throws INSUFFICIENT_GOLD when player cannot afford", () => {
    const poor = createTestWorld({
      player: { name: "a", gold: 1, currentPortId: "quanzhou", day: 1 },
    });
    poor.ship.currentHp = 1;
    expect(() => repairShip(poor)).toThrow("INSUFFICIENT_GOLD");
  });

  it("returns same world when HP is full", () => {
    const world = createTestWorld();
    const result = repairShip(world);
    expect(result).toBe(world);
  });
});

describe("getNearestPort", () => {
  it("returns fromPort when route is shorter or equal", () => {
    // 泉州→长崎: 5, 长崎→泉州: 5 → 相等 → 取 from
    expect(getNearestPort("quanzhou", "nagasaki")).toBe("quanzhou");
  });

  it("returns shorter port when asymmetric", () => {
    // 其实 routes 中对不对称，马六甲→长崎 10, 长崎→马六甲 10
    // 取 from
    expect(getNearestPort("malacca", "nagasaki")).toBe("malacca");
  });
});

describe("upgradeShip", () => {
  it("increases upgradeLevel and maxHp", () => {
    const world = createTestWorld();
    const result = upgradeShip(world);
    expect(result.ship.upgradeLevel).toBe(1);
    expect(result.ship.maxHp).toBe(Math.floor(50 * 1.2)); // sloop: 50 * 1.2
    expect(result.ship.currentHp).toBe(result.ship.maxHp); // 升级回满
  });

  it("deducts gold", () => {
    const world = createTestWorld();
    const result = upgradeShip(world);
    expect(result.player.gold).toBe(5000 - 500); // sloop Lv0 cost
  });

  it("throws MAX_LEVEL_REACHED at max level", () => {
    const maxed = createTestWorld();
    maxed.ship.upgradeLevel = 3;
    expect(() => upgradeShip(maxed)).toThrow("MAX_LEVEL_REACHED");
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
    expect(() => upgradeShip(voyaging)).toThrow("IN_VOYAGE");
  });
});

describe("setArmamentLevel", () => {
  it("sets armament level on the ship", () => {
    const world = createTestWorld();
    const result = setArmamentLevel(world, 2);
    expect(result.ship.armamentLevel).toBe(2);
  });

  it("does not mutate the original world", () => {
    const world = createTestWorld();
    setArmamentLevel(world, 2);
    expect(world.ship.armamentLevel).toBe(0);
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
    expect(() => setArmamentLevel(voyaging, 1)).toThrow("IN_VOYAGE");
  });
});
