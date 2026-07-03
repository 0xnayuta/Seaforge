// ============================================================
// 图鉴系统领域逻辑测试
// ============================================================

import { describe, expect, it } from "bun:test";
import { getCollectionProgress, updateCollection } from "../collection";
import type { CollectionState, World } from "../types";
import { createTestWorld } from "./helpers";

describe("updateCollection", () => {
  it("adds current port to visitedPorts", () => {
    const world = createTestWorld({
      player: { ...createTestWorld().player, currentPortId: "malacca" },
    });

    const updated = updateCollection(world);
    expect(updated.collection.visitedPorts).toContain("malacca");
  });

  it("does not add duplicate port", () => {
    const world = createTestWorld();
    // createTestWorld starts with visitedPorts: ["quanzhou"] and currentPortId: "quanzhou"

    const updated = updateCollection(world);
    // Same reference if no change
    expect(updated).toBe(world);
  });

  it("adds new ship type from fleet to collection", () => {
    const base = createTestWorld();
    const world: World = {
      ...base,
      fleet: {
        ...base.fleet,
        ships: [
          ...base.fleet.ships,
          {
            id: "ship-2",
            typeId: "schooner",
            name: "双桅纵帆船",
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
      },
    };

    const updated = updateCollection(world);
    expect(updated.collection.ownedShips).toContain("schooner");
    expect(updated.collection.ownedShips).toContain("sloop");
  });

  it("adds new cargo good ID from cargo to collection", () => {
    const base = createTestWorld();
    const world: World = {
      ...base,
      fleet: {
        ...base.fleet,
        ships: base.fleet.ships.map((s) =>
          s.id === base.fleet.activeShipId
            ? {
                ...s,
                cargo: [
                  ...s.cargo,
                  { goodId: "porcelain", quantity: 10, buyPrice: 500 },
                ],
              }
            : s,
        ),
      },
    };

    const updated = updateCollection(world);
    expect(updated.collection.tradedGoods).toContain("porcelain");
    expect(updated.collection.tradedGoods).toContain("silk");
  });

  it("adds inventory item IDs to collectedItems", () => {
    const world = createTestWorld({
      fleet: {
        ...createTestWorld().fleet,
        inventory: [{ uid: "item-1", itemId: "iron_sword", quantity: 1 }],
      },
    });

    const updated = updateCollection(world);
    expect(updated.collection.collectedItems).toContain("iron_sword");
  });

  it("returns same world reference if no changes", () => {
    const world = createTestWorld();
    // Already has everything synced
    const updated = updateCollection(world);
    expect(updated).toBe(world);
  });

  it("collects from multiple ships' cargo", () => {
    const base = createTestWorld();
    const world: World = {
      ...base,
      fleet: {
        ...base.fleet,
        ships: [
          ...base.fleet.ships,
          {
            id: "ship-2",
            typeId: "schooner",
            name: "双桅纵帆船",
            equipment: {
              hullLevel: 0,
              sailLevel: 0,
              armorLevel: 0,
              cannonLevel: 0,
            },
            durability: 80,
            maxDurability: 80,
            cargo: [{ goodId: "porcelain", quantity: 10, buyPrice: 500 }],
            armamentLevel: 0,
            equippedItems: [],
          },
        ],
      },
    };

    const updated = updateCollection(world);
    expect(updated.collection.tradedGoods).toContain("porcelain");
    expect(updated.collection.ownedShips).toContain("schooner");
  });
});

describe("getCollectionProgress", () => {
  it("returns zeros for default collection with partial data", () => {
    const world = createTestWorld();
    const progress = getCollectionProgress(world);
    expect(progress.portsVisited).toBeGreaterThanOrEqual(1);
    expect(progress.goodsTraded).toBeGreaterThanOrEqual(2); // silk, spice
    expect(progress.shipsOwned).toBeGreaterThanOrEqual(1);
    expect(progress.itemsCollected).toBe(0);
  });

  it("counts correctly after updates", () => {
    const collection: CollectionState = {
      visitedPorts: ["quanzhou", "malacca", "colombo"],
      tradedGoods: ["silk", "spice", "porcelain", "tea"],
      ownedShips: ["sloop", "schooner"],
      collectedItems: ["iron_sword", "leather_armor"],
    };
    const world: World = { ...createTestWorld(), collection };

    const progress = getCollectionProgress(world);
    expect(progress.portsVisited).toBe(3);
    expect(progress.goodsTraded).toBe(4);
    expect(progress.shipsOwned).toBe(2);
    expect(progress.itemsCollected).toBe(2);
  });
});
