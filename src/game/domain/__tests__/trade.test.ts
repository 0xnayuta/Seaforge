import { describe, expect, it } from "bun:test";
import { getBuyPrice, getSellPrice } from "../market";
import {
  executeBuy,
  executeSell,
  getMaxCapacity,
  getUsedCapacity,
} from "../trade";
import type { CargoItem } from "../types";
import { createEmptyWorld, createTestWorld } from "./helpers";

describe("getUsedCapacity", () => {
  it("should compute total volume across all cargo", () => {
    const world = createTestWorld();
    // silk vol=2 × 5 + spice vol=1 × 3 = 10 + 3 = 13
    expect(getUsedCapacity(world)).toBe(13);
  });

  it("should return 0 for empty cargo", () => {
    const world = createEmptyWorld();
    expect(getUsedCapacity(world)).toBe(0);
  });
});

describe("getMaxCapacity", () => {
  it("should return sloop capacity 30 at level 0", () => {
    const world = createTestWorld();
    expect(getMaxCapacity(world)).toBe(30);
  });

  it("should scale with upgrade level (每级 +20%)", () => {
    const world = createTestWorld({
      fleet: {
        ...createTestWorld().fleet,
        ships: [
          {
            ...createTestWorld().fleet.ships[0],
            equipment: {
              hullLevel: 2,
              sailLevel: 0,
              armorLevel: 0,
              cannonLevel: 0,
            },
          },
        ],
      },
    });
    // floor(30 * (1 + 2 * 0.2)) = floor(30 * 1.4) = 42
    expect(getMaxCapacity(world)).toBe(42);
  });
});

describe("executeBuy", () => {
  it("should deduct gold and add cargo with weighted average buyPrice", () => {
    const world = createTestWorld();
    const price = getBuyPrice("silk", world.player.currentPortId, world);
    const quantity = 2;
    const totalCost = price * quantity;

    const result = executeBuy(world, { goodId: "silk", quantity });
    const newWorld = result.world;

    // gold deducted
    expect(newWorld.fleet.gold).toBe(world.fleet.gold - totalCost);
    expect(result.totalCost).toBe(totalCost);

    // cargo updated
    const cargo = newWorld.fleet.ships[0].cargo.find(
      (c) => c.goodId === "silk",
    );
    expect(cargo).toBeDefined();
    expect(cargo?.quantity).toBe(5 + quantity);

    // weighted average = (5 * 102 + 2 * 84) / 7 = 96.857 → round 97
    expect(cargo?.buyPrice).toBe(97);
  });

  it("should add new cargo entry when good not already in cargo", () => {
    const world = createEmptyWorld();
    const price = getBuyPrice("silk", world.player.currentPortId, world);
    const quantity = 2;
    const totalCost = price * quantity;

    const result = executeBuy(world, { goodId: "silk", quantity });

    expect(result.world.fleet.gold).toBe(world.fleet.gold - totalCost);
    const cargo = result.world.fleet.ships[0].cargo.find(
      (c) => c.goodId === "silk",
    );
    expect(cargo).toBeDefined();
    expect(cargo?.quantity).toBe(2);
    expect(cargo?.buyPrice).toBe(price);
  });

  it("should throw when not enough gold", () => {
    const world = createTestWorld();
    const price = getBuyPrice("silk", world.player.currentPortId, world);
    // 1000 * price = 102000 > 5000
    expect(1000 * price).toBeGreaterThan(world.fleet.gold);
    expect(() => executeBuy(world, { goodId: "silk", quantity: 1000 })).toThrow(
      "INSUFFICIENT_GOLD",
    );
  });

  it("should throw when not enough cargo capacity", () => {
    const world = createTestWorld();
    // used = 13, max = 30, silk vol = 2
    // buy 10 silk → 13 + 20 = 33 > 30; cost 10*102 = 1020 < 5000 (gold check passes)
    expect(() => executeBuy(world, { goodId: "silk", quantity: 10 })).toThrow(
      "INSUFFICIENT_CARGO",
    );
  });

  it("should throw when quantity is zero or negative", () => {
    const world = createTestWorld();
    expect(() => executeBuy(world, { goodId: "silk", quantity: 0 })).toThrow(
      "INVALID_QUANTITY",
    );
    expect(() => executeBuy(world, { goodId: "silk", quantity: -1 })).toThrow(
      "INVALID_QUANTITY",
    );
  });
});

describe("executeSell", () => {
  it("should add gold and reduce cargo quantity", () => {
    const world = createTestWorld();
    const price = getSellPrice("silk", world.player.currentPortId, world);
    const quantity = 3;

    const result = executeSell(world, { goodId: "silk", quantity });

    // gold increased by revenue = price × quantity
    const expectedRevenue = price * quantity;
    expect(result.world.fleet.gold).toBe(world.fleet.gold + expectedRevenue);
    expect(result.totalRevenue).toBe(expectedRevenue);

    // silk reduced from 5 to 2
    const cargo = result.world.fleet.ships[0].cargo.find(
      (c) => c.goodId === "silk",
    );
    expect(cargo).toBeDefined();
    expect(cargo?.quantity).toBe(2);
  });

  it("should throw when not enough cargo quantity", () => {
    const world = createTestWorld();
    // only 5 silk in cargo, try to sell 100
    expect(() => executeSell(world, { goodId: "silk", quantity: 100 })).toThrow(
      "CARGO_NOT_FOUND",
    );
  });

  it("should throw when good not in cargo", () => {
    const world = createEmptyWorld();
    expect(() => executeSell(world, { goodId: "silk", quantity: 1 })).toThrow(
      "CARGO_NOT_FOUND",
    );
  });

  it("should remove cargo entry entirely when selling exact amount", () => {
    const world = createTestWorld();
    const silkCargo = world.fleet.ships[0].cargo.find(
      (c) => c.goodId === "silk",
    ) as CargoItem;
    const result = executeSell(world, {
      goodId: "silk",
      quantity: silkCargo.quantity,
    });

    // cargo entry for silk should be gone
    expect(
      result.world.fleet.ships[0].cargo.find((c) => c.goodId === "silk"),
    ).toBeUndefined();

    // spice cargo should remain
    expect(
      result.world.fleet.ships[0].cargo.find((c) => c.goodId === "spice"),
    ).toBeDefined();
  });

  it("should compute profit as (sellPrice - buyPrice) * quantity", () => {
    const world = createTestWorld();
    const price = getSellPrice("silk", world.player.currentPortId, world);
    const quantity = 3;
    const cargo = world.fleet.ships[0].cargo.find(
      (c) => c.goodId === "silk",
    ) as CargoItem;

    const result = executeSell(world, { goodId: "silk", quantity });
    const expectedProfit = (price - cargo.buyPrice) * quantity;

    expect(result.profit).toBe(expectedProfit);
  });

  it("should grant experience on profitable sell", () => {
    const world = createTestWorld({
      fleet: {
        ...createTestWorld().fleet,
        ships: [
          {
            ...createTestWorld().fleet.ships[0],
            cargo: [{ goodId: "silk", quantity: 5, buyPrice: 1 }],
          },
        ],
      },
    });
    expect(world.player.exp).toBe(0);

    const result = executeSell(world, { goodId: "silk", quantity: 3 });
    expect(result.world.player.exp).toBeGreaterThan(0);
  });

  it("should not grant experience on loss-making sell", () => {
    const world = createTestWorld();
    const price = getSellPrice("silk", world.player.currentPortId, world);
    const worldWithHighBuy = {
      ...world,
      fleet: {
        ...world.fleet,
        ships: [
          {
            ...world.fleet.ships[0],
            cargo: [{ goodId: "silk", quantity: 5, buyPrice: price + 1000 }],
          },
        ],
      },
    };

    const result = executeSell(worldWithHighBuy, {
      goodId: "silk",
      quantity: 3,
    });
    expect(result.profit).toBeLessThan(0);
    expect(result.world.player.exp).toBe(0);
  });
});
