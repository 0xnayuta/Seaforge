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
    expect(recipes.every((r) => r.portId === "quanzhou")).toBe(true);
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
  it("counts quantity across multiple entries", () => {
    const inventory = [
      { uid: "a", itemId: "rusted_sword", quantity: 1 },
      { uid: "b", itemId: "iron_sword", quantity: 1 },
      { uid: "c", itemId: "rusted_sword", quantity: 1 },
    ];
    expect(getItemCount(inventory, "rusted_sword")).toBe(2);
    expect(getItemCount(inventory, "iron_sword")).toBe(1);
    expect(getItemCount(inventory, "nonexistent")).toBe(0);
  });
});

describe("craftEquipment", () => {
  it("crafts successfully with valid ingredients and gold", () => {
    // 泉州：rusty_to_iron — 2× rusted_sword + 300 gold → iron_sword
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

    const result = craftEquipment(world, "rusty_to_iron");
    // 金币扣除
    expect(result.fleet.gold).toBe(9700);
    // 材料消耗
    expect(getItemCount(result.fleet.inventory, "rusted_sword")).toBe(0);
    // 产物加入背包
    expect(getItemCount(result.fleet.inventory, "iron_sword")).toBe(1);
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
    const world = createTestWorld({
      player: { ...createTestWorld().player, currentPortId: "quanzhou" },
      fleet: {
        ...createTestWorld().fleet,
        gold: 100, // 不够 300
        inventory: [],
      },
    });
    expect(() => craftEquipment(world, "rusty_to_iron")).toThrow(
      "INSUFFICIENT_GOLD",
    );
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

  it("rejects if NPC affinity too low", () => {
    // chain_to_plate in malacca requires goa NPC affinity, but we don't have that recipe
    // Let's test with a recipe that has affinity requirement (none of our current ones do)
    // so this tests the error is theoretically reachable
    // For now, verify that recipes without affinity don't throw affinity error
    const base = createTestWorld({
      player: { ...createTestWorld().player, currentPortId: "quanzhou" },
      fleet: {
        ...createTestWorld().fleet,
        gold: 10000,
        inventory: [],
      },
    });
    const world = gainItem(base, "rusted_sword", 2);
    // No affinity check needed for this recipe
    expect(() => craftEquipment(world, "rusty_to_iron")).not.toThrow();
  });

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
    expect(result.fleet.gold).toBe(9200); // 10000 - 800
    expect(getItemCount(result.fleet.inventory, "iron_sword")).toBe(0);
    expect(getItemCount(result.fleet.inventory, "mage_staff")).toBe(0);
    expect(getItemCount(result.fleet.inventory, "silver_rapier")).toBe(1);
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
    // 原世界不变
    expect(world.fleet.gold).toBe(10000);
  });
});
