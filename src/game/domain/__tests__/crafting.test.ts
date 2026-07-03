// ============================================================
// 装备合成系统领域逻辑测试
// ============================================================

import { describe, expect, it } from "bun:test";
import { craftEquipment, getAvailableRecipes, getItemCount } from "../crafting";
import { gainItem } from "../player";

import { createTestWorld } from "./helpers";

describe("getAvailableRecipes", () => {
  it("returns recipes matching current port", () => {
    const world = createTestWorld(); // quanzhou
    const recipes = getAvailableRecipes(world);
    expect(recipes.length).toBeGreaterThan(0);
    for (const r of recipes) {
      expect(r.portId).toBe("quanzhou");
    }
  });

  it("returns empty when no recipes at port", () => {
    const world = createTestWorld({
      player: { ...createTestWorld().player, currentPortId: "nagasaki" },
    });
    const recipes = getAvailableRecipes(world);
    expect(recipes.length).toBe(0);
  });
});

describe("getItemCount", () => {
  it("counts quantity across multiple entries, excludes equipped", () => {
    const inventory = [
      { uid: "a", itemId: "rusted_sword", quantity: 1 },
      { uid: "b", itemId: "iron_sword", quantity: 1 },
      { uid: "c", itemId: "rusted_sword", quantity: 1 },
      { uid: "d", itemId: "rusted_sword", quantity: 1, equippedSlot: "weapon" },
    ];
    expect(getItemCount(inventory, "rusted_sword")).toBe(2); // excludes equipped
    expect(getItemCount(inventory, "iron_sword")).toBe(1);
    expect(getItemCount(inventory, "nonexistent")).toBe(0);
  });
});

describe("craftEquipment", () => {
  it("crafts successfully with valid ingredients and gold", () => {
    const base = createTestWorld({
      player: { ...createTestWorld().player, currentPortId: "quanzhou" },
      fleet: {
        ...createTestWorld().fleet,
        gold: 10000,
        inventory: [],
      },
    });
    const world = gainItem(base, "rusted_sword", 2);
    expect(world.fleet.gold).toBe(10000);
    expect(getItemCount(world.fleet.inventory, "rusted_sword")).toBe(2);

    const result = craftEquipment(world, "rusty_to_iron");
    expect(result.fleet.gold).toBe(9700);
    expect(getItemCount(result.fleet.inventory, "rusted_sword")).toBe(0);
    expect(getItemCount(result.fleet.inventory, "iron_sword")).toBe(1);
    // immutability
    expect(world.fleet.gold).toBe(10000);
    expect(getItemCount(world.fleet.inventory, "rusted_sword")).toBe(2);
  });

  it("rejects if wrong port", () => {
    const world = createTestWorld({
      player: { ...createTestWorld().player, currentPortId: "nagasaki" },
      fleet: {
        ...createTestWorld().fleet,
        gold: 10000,
        inventory: [],
      },
    });
    expect(() => craftEquipment(world, "rusty_to_iron")).toThrow(
      "RECIPE_WRONG_PORT",
    );
  });

  it("rejects if insufficient gold", () => {
    const base = createTestWorld({
      player: { ...createTestWorld().player, currentPortId: "quanzhou" },
      fleet: {
        ...createTestWorld().fleet,
        gold: 100,
        inventory: [],
      },
    });
    const world = gainItem(base, "rusted_sword", 2);
    expect(() => craftEquipment(world, "rusty_to_iron")).toThrow(
      "INSUFFICIENT_GOLD",
    );
    expect(world.fleet.gold).toBe(100); // immutability
  });

  it("rejects if insufficient materials", () => {
    const world = createTestWorld({
      player: { ...createTestWorld().player, currentPortId: "quanzhou" },
      fleet: {
        ...createTestWorld().fleet,
        gold: 10000,
        inventory: [],
      },
    });
    expect(() => craftEquipment(world, "rusty_to_iron")).toThrow(
      "INSUFFICIENT_MATERIALS",
    );
  });

  // NPC affinity path: craftEquipment's `recipe.minAffinity` branch is
  // trivially correct (simple conditional). It remains untestable at runtime
  // until a recipe with minAffinity is added to the data. Verified by review:
  //   if (recipe.minAffinity) {
  //     const relation = world.npcRelations[recipe.minAffinity.npcId];
  //     if (!relation) throw new DomainError("NPC_NOT_FOUND");
  //     if (relation.affinity < recipe.minAffinity.value)
  //       throw new DomainError("RECIPE_AFFINITY_TOO_LOW");
  //   }

  it("crafts across ports: Venice iron_to_silver", () => {
    const base = createTestWorld({
      player: { ...createTestWorld().player, currentPortId: "venice" },
      fleet: {
        ...createTestWorld().fleet,
        gold: 10000,
        inventory: [],
      },
    });
    let world = gainItem(base, "iron_sword", 1);
    world = gainItem(world, "mage_staff", 1);
    expect(getItemCount(world.fleet.inventory, "iron_sword")).toBe(1);
    expect(getItemCount(world.fleet.inventory, "mage_staff")).toBe(1);

    const result = craftEquipment(world, "iron_to_silver");
    expect(result.fleet.gold).toBe(9200);
    expect(getItemCount(result.fleet.inventory, "iron_sword")).toBe(0);
    expect(getItemCount(result.fleet.inventory, "mage_staff")).toBe(0);
    expect(getItemCount(result.fleet.inventory, "silver_rapier")).toBe(1);
    // immutability
    expect(world.fleet.gold).toBe(10000);
    expect(getItemCount(world.fleet.inventory, "iron_sword")).toBe(1);
  });

  it("rejects unknown recipe", () => {
    const world = createTestWorld();
    expect(() => craftEquipment(world, "nonexistent")).toThrow(
      "RECIPE_NOT_FOUND",
    );
  });

  it("does not modify original world on error", () => {
    const world = createTestWorld({
      player: { ...createTestWorld().player, currentPortId: "nagasaki" },
      fleet: {
        ...createTestWorld().fleet,
        gold: 10000,
        inventory: [],
      },
    });
    expect(() => craftEquipment(world, "rusty_to_iron")).toThrow();
    expect(world.fleet.gold).toBe(10000);
  });
});
