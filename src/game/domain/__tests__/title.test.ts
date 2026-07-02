// ============================================================
// 称号系统领域逻辑测试
// ============================================================

import { describe, expect, it } from "bun:test";
import {
  getSelectedTitleEffects,
  getUnlockedTitleIds,
  getUnlockedTitles,
  selectTitle,
} from "../title";
import type { World } from "../types";
import { createEmptyWorld } from "./helpers";

describe("getUnlockedTitles", () => {
  it("returns no titles for a fresh world", () => {
    const world = createEmptyWorld();
    expect(getUnlockedTitles(world)).toHaveLength(0);
  });

  it("unlocks 初出茅庐 after first voyage completed", () => {
    const world: World = {
      ...createEmptyWorld(),
      player: { ...createEmptyWorld().player, voyagesCompleted: 1 },
    };
    const titles = getUnlockedTitles(world);
    expect(titles.find((t) => t.id === "first_voyage")).toBeDefined();
  });

  it("unlocks 小有积蓄 at totalSalesRevenue >= 10000", () => {
    const world: World = {
      ...createEmptyWorld(),
      player: { ...createEmptyWorld().player, totalSalesRevenue: 10000 },
    };
    const titles = getUnlockedTitles(world);
    expect(titles.find((t) => t.id === "small_savings")).toBeDefined();
  });

  it("does not unlock 小有积蓄 below threshold", () => {
    const world: World = {
      ...createEmptyWorld(),
      player: { ...createEmptyWorld().player, totalSalesRevenue: 9999 },
    };
    const titles = getUnlockedTitles(world);
    expect(titles.find((t) => t.id === "small_savings")).toBeUndefined();
  });

  it("unlocks 一夜暴富 at bestSingleProfit >= 5000", () => {
    const world: World = {
      ...createEmptyWorld(),
      player: { ...createEmptyWorld().player, bestSingleProfit: 5000 },
    };
    const titles = getUnlockedTitles(world);
    expect(titles.find((t) => t.id === "overnight_rich")).toBeDefined();
  });

  it("unlocks 海盗克星 at combatWins >= 10", () => {
    const world: World = {
      ...createEmptyWorld(),
      player: { ...createEmptyWorld().player, combatWins: 10 },
    };
    const titles = getUnlockedTitles(world);
    expect(titles.find((t) => t.id === "pirate_bane")).toBeDefined();
  });

  it("unlocks 太平洋主宰 at totalMileage >= 10000", () => {
    const world: World = {
      ...createEmptyWorld(),
      player: { ...createEmptyWorld().player, totalMileage: 10000 },
    };
    const titles = getUnlockedTitles(world);
    expect(titles.find((t) => t.id === "pacific_master")).toBeDefined();
  });

  it("unlocks 航海王 at level >= 50", () => {
    const world: World = {
      ...createEmptyWorld(),
      player: { ...createEmptyWorld().player, level: 50 },
    };
    const titles = getUnlockedTitles(world);
    expect(titles.find((t) => t.id === "pirate_king")).toBeDefined();
  });

  it("returns multiple titles when multiple conditions met", () => {
    const world: World = {
      ...createEmptyWorld(),
      player: {
        ...createEmptyWorld().player,
        totalSalesRevenue: 20000,
        bestSingleProfit: 6000,
        combatWins: 15,
        totalMileage: 15000,
        level: 50,
        voyagesCompleted: 3,
      },
    };
    const titles = getUnlockedTitles(world);
    expect(titles).toHaveLength(6);
  });
});

describe("getUnlockedTitleIds", () => {
  it("returns empty record for fresh world", () => {
    const world = createEmptyWorld();
    const ids = getUnlockedTitleIds(world);
    expect(Object.keys(ids)).toHaveLength(0);
  });

  it("returns IDs of unlocked titles", () => {
    const world: World = {
      ...createEmptyWorld(),
      player: { ...createEmptyWorld().player, voyagesCompleted: 1 },
    };
    const ids = getUnlockedTitleIds(world);
    expect(ids.first_voyage).toBe(true);
  });
});

describe("selectTitle", () => {
  it("selects an unlocked title", () => {
    const world: World = {
      ...createEmptyWorld(),
      player: { ...createEmptyWorld().player, voyagesCompleted: 1 },
    };
    const next = selectTitle(world, "first_voyage");
    expect(next.selectedTitle).toBe("first_voyage");
    expect(next).not.toBe(world); // immutable
  });

  it("deselects title when passing null", () => {
    const world: World = {
      ...createEmptyWorld(),
      player: { ...createEmptyWorld().player, voyagesCompleted: 1 },
      selectedTitle: "first_voyage",
    };
    const next = selectTitle(world, null);
    expect(next.selectedTitle).toBeNull();
  });

  it("throws TITLE_NOT_FOUND for invalid title ID", () => {
    const world = createEmptyWorld();
    expect(() => selectTitle(world, "nonexistent")).toThrow("TITLE_NOT_FOUND");
  });

  it("throws TITLE_NOT_UNLOCKED for locked title", () => {
    const world = createEmptyWorld();
    expect(() => selectTitle(world, "small_savings")).toThrow(
      "TITLE_NOT_UNLOCKED",
    );
  });
});

describe("getSelectedTitleEffects", () => {
  it("returns empty for no selected title", () => {
    const world: World = {
      ...createEmptyWorld(),
      selectedTitle: null,
    };
    expect(getSelectedTitleEffects(world)).toHaveLength(0);
  });

  it("returns effects for selected title", () => {
    const world: World = {
      ...createEmptyWorld(),
      player: {
        ...createEmptyWorld().player,
        totalSalesRevenue: 10000,
      },
      selectedTitle: "small_savings",
    };
    const effects = getSelectedTitleEffects(world);
    expect(effects).toHaveLength(1);
    expect(effects[0].type).toBe("cargoCapacity");
    expect(effects[0].value).toBe(3);
  });

  it("returns multiple effects for 航海王", () => {
    const world: World = {
      ...createEmptyWorld(),
      player: {
        ...createEmptyWorld().player,
        level: 50,
      },
      selectedTitle: "pirate_king",
    };
    const effects = getSelectedTitleEffects(world);
    expect(effects).toHaveLength(2);
    expect(effects.find((e) => e.type === "cargoCapacity")?.value).toBe(10);
    expect(effects.find((e) => e.type === "speedPercent")?.value).toBe(3);
  });

  it("returns empty for invalid selectedTitle ID", () => {
    const world: World = {
      ...createEmptyWorld(),
      selectedTitle: "nonexistent",
    };
    expect(getSelectedTitleEffects(world)).toHaveLength(0);
  });
});
