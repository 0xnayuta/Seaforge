// ============================================================
// 任务系统领域逻辑测试
// ============================================================

import { describe, expect, it } from "bun:test";
import {
  acceptQuest,
  checkQuestProgress,
  completeQuest,
  getAvailableQuests,
  getQuestConfig,
  incrementBountyProgress,
} from "../quest";
import type { World } from "../types";
import { createEmptyWorld } from "./helpers";

function worldAtPort(portId: string, overrides?: Partial<World>): World {
  const base: World = createEmptyWorld({
    player: {
      currentPortId: portId,
      level: 5,
      exp: 0,
      expToNext: 100,
      name: "测试船长",
      day: 1,
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
    },
    npcRelations: {} as Record<
      string,
      {
        affinity: number;
        recruited: boolean;
        dialogPhase: number;
        completedQuests: readonly string[];
      }
    >,
    activeQuests: [] as readonly {
      questId: string;
      progress: number;
      target: number;
      acceptedAtDay: number;
    }[],
  });
  if (overrides) {
    return {
      ...base,
      player: { ...base.player, ...(overrides.player ?? {}) },
      fleet: { ...base.fleet, ...(overrides.fleet ?? {}) },
      npcRelations: { ...base.npcRelations, ...(overrides.npcRelations ?? {}) },
      activeQuests: overrides.activeQuests ?? base.activeQuests,
    };
  }
  return base;
}
describe("getQuestConfig", () => {
  it("returns quest config for valid quest ID", () => {
    const q = getQuestConfig("safe_passage");
    expect(q.name).toBe("安全通航");
    expect(q.type).toBe("delivery");
  });

  it("throws QUEST_NOT_FOUND for invalid ID", () => {
    expect(() => getQuestConfig("nonexistent")).toThrow("QUEST_NOT_FOUND");
  });
});

describe("getAvailableQuests", () => {
  it("returns quests available at the current port", () => {
    const world = worldAtPort("quanzhou");
    const quests = getAvailableQuests(world);
    // safe_passage (level 2) and family_heirloom (level 3) should be available at level 5
    expect(quests.length).toBeGreaterThanOrEqual(2);
    expect(quests.some((q) => q.id === "safe_passage")).toBe(true);
    expect(quests.some((q) => q.id === "family_heirloom")).toBe(true);
  });

  it("filters quests not at current port", () => {
    const world = worldAtPort("venice", {
      npcRelations: {
        marco: {
          affinity: 25,
          recruited: false,
          dialogPhase: 2,
          completedQuests: [],
        },
      },
    });
    const quests = getAvailableQuests(world);
    expect(quests.every((q) => q.issuerPortId === "venice")).toBe(true);
    expect(quests.some((q) => q.id === "venetian_trade")).toBe(true);
  });
  it("filters quests that require higher level", () => {
    const world = worldAtPort("quanzhou", {
      player: { level: 1 },
    });
    const quests = getAvailableQuests(world);
    // safe_passage needs level 2
    expect(quests.every((q) => (q.minLevel ?? 1) <= 1)).toBe(true);
  });

  it("filters quests with unmet affinity requirement", () => {
    // Fatima's quests need affinity 15
    const world = worldAtPort("alexandria");
    const quests = getAvailableQuests(world);
    // With no relation (affinity 0), quests with minAffinity > 0 should be filtered
    const fatimaQuests = quests.filter((q) => q.issuerNpcId === "fatima");
    // Quest with minAffinity: 15 should NOT appear since no relation exists
    expect(fatimaQuests.length).toBe(0);
  });

  it("shows affinity-gated quests when affinity is high enough", () => {
    const world = worldAtPort("alexandria", {
      npcRelations: {
        fatima: {
          affinity: 20,
          recruited: false,
          dialogPhase: 2,
          completedQuests: [],
        },
      },
    });
    const quests = getAvailableQuests(world);
    const fatimaQuests = quests.filter((q) => q.issuerNpcId === "fatima");
    expect(fatimaQuests.length).toBeGreaterThanOrEqual(1);
  });

  it("excludes already active quests", () => {
    const world = worldAtPort("quanzhou", {
      activeQuests: [
        { questId: "safe_passage", progress: 0, target: 10, acceptedAtDay: 1 },
      ],
    });
    const quests = getAvailableQuests(world);
    expect(quests.some((q) => q.id === "safe_passage")).toBe(false);
  });
});

describe("acceptQuest", () => {
  it("accepts a quest and adds to activeQuests", () => {
    const world = worldAtPort("quanzhou", {
      player: { level: 5 },
    });
    const result = acceptQuest(world, "safe_passage");
    expect(result.activeQuests).toHaveLength(1);
    expect(result.activeQuests[0].questId).toBe("safe_passage");
    expect(result.activeQuests[0].target).toBe(10); // quantity = 10
  });

  it("throws QUEST_ALREADY_ACCEPTED for duplicate accept", () => {
    const world = worldAtPort("quanzhou", {
      player: { level: 5 },
      activeQuests: [
        { questId: "safe_passage", progress: 0, target: 10, acceptedAtDay: 1 },
      ],
    });
    expect(() => acceptQuest(world, "safe_passage")).toThrow(
      "QUEST_ALREADY_ACCEPTED",
    );
  });

  it("throws QUEST_NOT_AVAILABLE when not at issuer port", () => {
    const world = worldAtPort("venice");
    expect(() => acceptQuest(world, "safe_passage")).toThrow(
      "QUEST_NOT_AVAILABLE",
    );
  });

  it("throws QUEST_REQUIREMENT_NOT_MET when level too low", () => {
    const world = worldAtPort("quanzhou", {
      player: { level: 1 },
    });
    expect(() => acceptQuest(world, "safe_passage")).toThrow(
      "QUEST_REQUIREMENT_NOT_MET",
    );
  });

  it("throws AFFINITY_TOO_LOW when affinity below minimum", () => {
    const world = worldAtPort("venice", {
      player: { level: 5 },
      npcRelations: {
        marco: {
          affinity: 10,
          recruited: false,
          dialogPhase: 1,
          completedQuests: [],
        },
      },
    });
    // venetian_trade needs affinity 20, we have 10
    expect(() => acceptQuest(world, "venetian_trade")).toThrow(
      "AFFINITY_TOO_LOW",
    );
  });

  it("accepts quest when affinity requirement is met", () => {
    const world = worldAtPort("venice", {
      player: { level: 5 },
      npcRelations: {
        marco: {
          affinity: 25,
          recruited: false,
          dialogPhase: 2,
          completedQuests: [],
        },
      },
    });
    const result = acceptQuest(world, "venetian_trade");
    expect(result.activeQuests).toHaveLength(1);
  });
});

describe("checkQuestProgress", () => {
  it("detects delivery progress when player is at target port with goods", () => {
    const world = worldAtPort("nagasaki", {
      player: { level: 5 },
      activeQuests: [
        { questId: "safe_passage", progress: 0, target: 10, acceptedAtDay: 1 },
      ],
      fleet: {
        ships: [
          {
            id: "ship-1",
            cargo: [{ goodsId: "silk", quantity: 10, buyPrice: 100 }],
          },
        ],
      },
    });
    const result = checkQuestProgress(world);
    expect(result.activeQuests[0].progress).toBe(10);
  });

  it("does not detect delivery progress when not at target port", () => {
    const world = worldAtPort("quanzhou", {
      player: { level: 5 },
      activeQuests: [
        { questId: "safe_passage", progress: 0, target: 10, acceptedAtDay: 1 },
      ],
    });
    const result = checkQuestProgress(world);
    expect(result.activeQuests[0].progress).toBe(0);
  });

  it("detects explore progress when at target port", () => {
    const world = worldAtPort("sofala", {
      player: { level: 5 },
      activeQuests: [
        { questId: "ivory_trade", progress: 0, target: 1, acceptedAtDay: 1 },
      ],
    });
    const result = checkQuestProgress(world);
    expect(result.activeQuests[0].progress).toBe(1);
  });

  it("increments bounty progress via incrementBountyProgress", () => {
    const world = worldAtPort("venice", {
      player: { level: 5 },
      activeQuests: [
        { questId: "lost_cargo", progress: 0, target: 2, acceptedAtDay: 1 },
      ],
    });
    const result = incrementBountyProgress(incrementBountyProgress(world));
    expect(result.activeQuests[0].progress).toBe(2);
  });
});

describe("completeQuest", () => {
  it("completes a delivery quest, grants rewards, removes from active", () => {
    const world = worldAtPort("quanzhou", {
      player: { level: 5, exp: 0, expToNext: 100 },
      fleet: { gold: 5000, inventory: [] },
      activeQuests: [
        { questId: "safe_passage", progress: 10, target: 10, acceptedAtDay: 1 },
      ],
    });
    const result = completeQuest(world, "safe_passage");
    expect(result.activeQuests).toHaveLength(0);
    expect(result.fleet.gold).toBe(5800); // 5000 + 800 reward
    // EXP should be increased
    expect(result.player.exp).toBe(60);
    // Item reward: ring_of_vigor
    expect(result.fleet.inventory.length).toBeGreaterThanOrEqual(1);
    expect(
      result.fleet.inventory.some((i) => i.itemId === "ring_of_vigor"),
    ).toBe(true);
  });

  it("records completed quest in NPC relations", () => {
    const world = worldAtPort("quanzhou", {
      player: { level: 5 },
      activeQuests: [
        { questId: "safe_passage", progress: 10, target: 10, acceptedAtDay: 1 },
      ],
    });
    const result = completeQuest(world, "safe_passage");
    expect(result.npcRelations.li_hua.completedQuests).toContain(
      "safe_passage",
    );
  });

  it("throws QUEST_NOT_FOUND when quest is not active", () => {
    const world = worldAtPort("quanzhou");
    expect(() => completeQuest(world, "safe_passage")).toThrow(
      "QUEST_NOT_FOUND",
    );
  });

  it("throws QUEST_NOT_COMPLETABLE when progress < target", () => {
    const world = worldAtPort("quanzhou", {
      player: { level: 5 },
      activeQuests: [
        { questId: "safe_passage", progress: 3, target: 10, acceptedAtDay: 1 },
      ],
    });
    expect(() => completeQuest(world, "safe_passage")).toThrow(
      "QUEST_NOT_COMPLETABLE",
    );
  });
});
