// ============================================================
// 成就系统领域逻辑测试
// ============================================================

import { describe, expect, it } from "bun:test";
import { claimAchievementReward, getAchievementProgress } from "../achievement";
import type { PlayerState, World } from "../types";
import { createTestWorld } from "./helpers";

/** 创建一个仅覆盖指定 PlayerState 字段的测试 World */
function worldWithPlayer(overrides: Partial<PlayerState>): World {
  return createTestWorld({
    player: { ...createTestWorld().player, ...overrides },
  });
}

describe("getAchievementProgress", () => {
  it("returns progress for all achievements", () => {
    const world = createTestWorld();
    const progress = getAchievementProgress(world);

    expect(progress.length).toBe(15);

    // Fresh world: no achievements unlocked
    const firstVoyage = progress.find((p) => p.id === "first_voyage");
    expect(firstVoyage).toBeDefined();
    expect(firstVoyage!.unlocked).toBe(false);
    expect(firstVoyage!.claimed).toBe(false);
    expect(firstVoyage!.progress).toBe(0);
    expect(firstVoyage!.target).toBe(1);
  });

  it("unlocks first_voyage when voyagesCompleted >= 1", () => {
    const world = worldWithPlayer({ voyagesCompleted: 1 });
    const progress = getAchievementProgress(world);
    const firstVoyage = progress.find((p) => p.id === "first_voyage")!;
    expect(firstVoyage.unlocked).toBe(true);
  });

  it("unlocks merchant_apprentice when totalSalesRevenue >= 10000", () => {
    const world = worldWithPlayer({ totalSalesRevenue: 10000 });
    const progress = getAchievementProgress(world);
    const achievement = progress.find((p) => p.id === "merchant_apprentice")!;
    expect(achievement.unlocked).toBe(true);
    expect(achievement.progress).toBe(10000);
    expect(achievement.target).toBe(10000);
  });

  it("shows progress toward tycoon without unlocking", () => {
    const world = worldWithPlayer({ totalSalesRevenue: 100000 });
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
    const world = worldWithPlayer({ combatWins: 10 });
    const progress = getAchievementProgress(world);
    const fighter = progress.find((p) => p.id === "fighter")!;
    expect(fighter.unlocked).toBe(true);
    expect(fighter.progress).toBe(10);
  });
});

describe("claimAchievementReward", () => {
  it("claims reward for an unlocked achievement", () => {
    const world = worldWithPlayer({ voyagesCompleted: 1 });
    const newWorld = claimAchievementReward(world, "first_voyage");

    expect(newWorld.claimedAchievements).toContain("first_voyage");
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
      ...worldWithPlayer({ voyagesCompleted: 1 }),
      claimedAchievements: ["first_voyage"],
    };

    expect(() => claimAchievementReward(world, "first_voyage")).toThrow(
      "ACHIEVEMENT_ALREADY_CLAIMED",
    );
  });

  it("grants exp reward when specified", () => {
    const world = worldWithPlayer({ combatWins: 10 });
    const newWorld = claimAchievementReward(world, "fighter");

    // fighter gives gold 1500 + exp 100
    expect(newWorld.fleet.gold).toBe(world.fleet.gold + 1500);
    // exp 100 at level 1 / expToNext 100 causes level-up; exp resets to overflow (0)
    expect(newWorld.player.level).toBe(2);
    expect(newWorld.claimedAchievements).toContain("fighter");
  });
});
