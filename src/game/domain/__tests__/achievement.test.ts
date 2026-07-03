// ============================================================
// 成就系统领域逻辑测试
// ============================================================

import { describe, expect, it } from "bun:test";
import { claimAchievementReward, getAchievementProgress } from "../achievement";
import type { World } from "../types";
import { createTestWorld } from "./helpers";

describe("getAchievementProgress", () => {
  it("returns progress for all achievements", () => {
    const world = createTestWorld();
    const progress = getAchievementProgress(world);

    // 15 achievements defined in data
    expect(progress.length).toBe(15);

    // Fresh world: only first_voyage should be unlocked (0 voyagesCompleted >= 1 is false... wait, 0 >= 1 is false)
    const firstVoyage = progress.find((p) => p.id === "first_voyage");
    expect(firstVoyage).toBeDefined();
    expect(firstVoyage!.unlocked).toBe(false);
    expect(firstVoyage!.claimed).toBe(false);
    expect(firstVoyage!.progress).toBe(0);
    expect(firstVoyage!.target).toBe(1);
  });

  it("unlocks first_voyage when voyagesCompleted >= 1", () => {
    const world = createTestWorld({
      player: {
        name: "测试船长",
        currentPortId: "quanzhou",
        day: 1,
        level: 1,
        exp: 0,
        expToNext: 100,
        str: 1,
        dex: 1,
        int: 1,
        fth: 1,
        arc: 1,
        attributePoints: 0,
        equipment: {
          weapon: null,
          armor: null,
          accessory1: null,
          accessory2: null,
        },
        totalSalesRevenue: 0,
        bestSingleProfit: 0,
        totalMileage: 0,
        combatWins: 0,
        voyagesCompleted: 1,
      },
    });
    const progress = getAchievementProgress(world);
    const firstVoyage = progress.find((p) => p.id === "first_voyage")!;
    expect(firstVoyage.unlocked).toBe(true);
  });

  it("unlocks merchant_apprentice when totalSalesRevenue >= 10000", () => {
    const world = createTestWorld({
      player: {
        name: "测试船长",
        currentPortId: "quanzhou",
        day: 1,
        level: 1,
        exp: 0,
        expToNext: 100,
        str: 1,
        dex: 1,
        int: 1,
        fth: 1,
        arc: 1,
        attributePoints: 0,
        equipment: {
          weapon: null,
          armor: null,
          accessory1: null,
          accessory2: null,
        },
        totalSalesRevenue: 10000,
        bestSingleProfit: 0,
        totalMileage: 0,
        combatWins: 0,
        voyagesCompleted: 0,
      },
    });
    const progress = getAchievementProgress(world);
    const achievement = progress.find((p) => p.id === "merchant_apprentice")!;
    expect(achievement.unlocked).toBe(true);
    expect(achievement.progress).toBe(10000);
    expect(achievement.target).toBe(10000);
  });

  it("shows progress toward tycoon without unlocking", () => {
    const world = createTestWorld({
      player: {
        name: "测试船长",
        currentPortId: "quanzhou",
        day: 1,
        level: 1,
        exp: 0,
        expToNext: 100,
        str: 1,
        dex: 1,
        int: 1,
        fth: 1,
        arc: 1,
        attributePoints: 0,
        equipment: {
          weapon: null,
          armor: null,
          accessory1: null,
          accessory2: null,
        },
        totalSalesRevenue: 100000,
        bestSingleProfit: 0,
        totalMileage: 0,
        combatWins: 0,
        voyagesCompleted: 0,
      },
    });
    const progress = getAchievementProgress(world);
    const tycoon = progress.find((p) => p.id === "tycoon")!;
    expect(tycoon.unlocked).toBe(false);
    expect(tycoon.progress).toBe(100000);
    expect(tycoon.target).toBe(500000);
  });

  it("unlocks achievements from collection data", () => {
    const world = createTestWorld({
      collection: {
        visitedPorts: [
          "quanzhou",
          "malacca",
          "colombo",
          "calicut",
          "sofala",
          "aden",
        ],
        tradedGoods: [],
        ownedShips: ["sloop", "schooner", "brigantine", "galleon"],
        collectedItems: [],
      },
    });
    const progress = getAchievementProgress(world);
    const globetrotter = progress.find((p) => p.id === "globetrotter")!;
    expect(globetrotter.unlocked).toBe(true);
    expect(globetrotter.progress).toBe(6);

    const shipAchievement = progress.find((p) => p.id === "ship_enthusiast")!;
    expect(shipAchievement.unlocked).toBe(true);
    expect(shipAchievement.progress).toBe(4);
  });

  it("marks claimed achievements correctly", () => {
    const world: World = {
      ...createTestWorld(),
      claimedAchievements: ["first_voyage"],
    };
    const progress = getAchievementProgress(world);
    const firstVoyage = progress.find((p) => p.id === "first_voyage")!;
    expect(firstVoyage.claimed).toBe(true);
  });

  it("reports combat-related achievements", () => {
    const world = createTestWorld({
      player: {
        name: "测试船长",
        currentPortId: "quanzhou",
        day: 1,
        level: 1,
        exp: 0,
        expToNext: 100,
        str: 1,
        dex: 1,
        int: 1,
        fth: 1,
        arc: 1,
        attributePoints: 0,
        equipment: {
          weapon: null,
          armor: null,
          accessory1: null,
          accessory2: null,
        },
        totalSalesRevenue: 0,
        bestSingleProfit: 0,
        totalMileage: 0,
        combatWins: 10,
        voyagesCompleted: 0,
      },
    });
    const progress = getAchievementProgress(world);
    const fighter = progress.find((p) => p.id === "fighter")!;
    expect(fighter.unlocked).toBe(true);
    expect(fighter.progress).toBe(10);
  });
});

describe("claimAchievementReward", () => {
  it("claims reward for an unlocked achievement", () => {
    const world = createTestWorld({
      player: {
        name: "测试船长",
        currentPortId: "quanzhou",
        day: 1,
        level: 1,
        exp: 0,
        expToNext: 100,
        str: 1,
        dex: 1,
        int: 1,
        fth: 1,
        arc: 1,
        attributePoints: 0,
        equipment: {
          weapon: null,
          armor: null,
          accessory1: null,
          accessory2: null,
        },
        totalSalesRevenue: 0,
        bestSingleProfit: 0,
        totalMileage: 0,
        combatWins: 0,
        voyagesCompleted: 1,
      },
    });

    const newWorld = claimAchievementReward(world, "first_voyage");

    // Should mark as claimed
    expect(newWorld.claimedAchievements).toContain("first_voyage");
    // Should grant gold reward (500)
    expect(newWorld.fleet.gold).toBe(world.fleet.gold + 500);
  });

  it("throws for non-existent achievement", () => {
    const world = createTestWorld();
    expect(() => claimAchievementReward(world, "nonexistent")).toThrow(
      "ACHIEVEMENT_NOT_FOUND",
    );
  });

  it("throws for not-yet-unlocked achievement", () => {
    const world = createTestWorld();
    expect(() => claimAchievementReward(world, "first_voyage")).toThrow(
      "ACHIEVEMENT_NOT_UNLOCKED",
    );
  });

  it("throws for already-claimed achievement", () => {
    const world: World = {
      ...createTestWorld({
        player: {
          name: "测试船长",
          currentPortId: "quanzhou",
          day: 1,
          level: 1,
          exp: 0,
          expToNext: 100,
          str: 1,
          dex: 1,
          int: 1,
          fth: 1,
          arc: 1,
          attributePoints: 0,
          equipment: {
            weapon: null,
            armor: null,
            accessory1: null,
            accessory2: null,
          },
          totalSalesRevenue: 0,
          bestSingleProfit: 0,
          totalMileage: 0,
          combatWins: 0,
          voyagesCompleted: 1,
        },
      }),
      claimedAchievements: ["first_voyage"],
    };

    expect(() => claimAchievementReward(world, "first_voyage")).toThrow(
      "ACHIEVEMENT_ALREADY_CLAIMED",
    );
  });

  it("grants exp reward when specified", () => {
    const world = createTestWorld({
      player: {
        name: "测试船长",
        currentPortId: "quanzhou",
        day: 1,
        level: 1,
        exp: 0,
        expToNext: 100,
        str: 1,
        dex: 1,
        int: 1,
        fth: 1,
        arc: 1,
        attributePoints: 0,
        equipment: {
          weapon: null,
          armor: null,
          accessory1: null,
          accessory2: null,
        },
        totalSalesRevenue: 0,
        bestSingleProfit: 0,
        totalMileage: 0,
        combatWins: 10,
        voyagesCompleted: 0,
      },
    });

    const newWorld = claimAchievementReward(world, "fighter");
    // fighter gives gold 1500 + exp 100
    expect(newWorld.fleet.gold).toBe(world.fleet.gold + 1500);
    // exp 100 at level 1 / expToNext 100 causes level-up; exp resets to overflow (0)
    expect(newWorld.player.level).toBe(2);
    expect(newWorld.claimedAchievements).toContain("fighter");
  });
});
