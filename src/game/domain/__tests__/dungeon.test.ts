// ============================================================
// 副本系统领域逻辑测试
// ============================================================

import { describe, expect, it } from "bun:test";
import {
  advanceDungeonFloor,
  completeDungeon,
  enterDungeon,
  escapeDungeon,
  failDungeon,
} from "../dungeon";
import type { World } from "../types";
import { createTestWorld } from "./helpers";

describe("enterDungeon", () => {
  it("enters dungeon at correct port and level", () => {
    const world = createTestWorld(); // quanzhou, level 1
    const result = enterDungeon(world, "kidd_treasure");
    expect(result.dungeon).not.toBeNull();
    expect(result.dungeon!.dungeonId).toBe("kidd_treasure");
    expect(result.dungeon!.currentFloor).toBe(0);
    expect(result.dungeon!.totalFloors).toBe(4);
    expect(result.dungeon!.status).toBe("in_progress");
  });

  it("rejects entering while already in a dungeon", () => {
    const world = enterDungeon(createTestWorld(), "kidd_treasure");
    expect(() => enterDungeon(world, "kidd_treasure")).toThrow(
      "DUNGEON_IN_PROGRESS",
    );
  });

  it("rejects entering from wrong port", () => {
    const world = createTestWorld({
      player: { ...createTestWorld().player, currentPortId: "venice" },
    });
    expect(() => enterDungeon(world, "kidd_treasure")).toThrow(
      "DUNGEON_WRONG_PORT",
    );
  });

  it("rejects entering when level too low", () => {
    const world = createTestWorld({
      player: { ...createTestWorld().player, currentPortId: "mombasa" },
    }); // level 1, storm_eye needs 30
    expect(() => enterDungeon(world, "storm_eye")).toThrow(
      "DUNGEON_LEVEL_TOO_LOW",
    );
  });

  it("rejects entering when on cooldown", () => {
    const world: World = {
      ...createTestWorld(),
      dungeonCooldowns: { kidd_treasure: 1 },
    };
    // day is 1, cooldown is 3 days, so next available is 1+3=4
    expect(() => enterDungeon(world, "kidd_treasure")).toThrow(
      "DUNGEON_ON_COOLDOWN",
    );
  });

  it("allows entering when cooldown has expired", () => {
    const world: World = {
      ...createTestWorld({
        player: { ...createTestWorld().player, day: 5 },
      }),
      dungeonCooldowns: { kidd_treasure: 2 }, // cleared on day 2, +3 = day 5
    };
    const result = enterDungeon(world, "kidd_treasure");
    expect(result.dungeon).not.toBeNull();
  });
});

describe("advanceDungeonFloor", () => {
  it("throws when not in dungeon", () => {
    const world = createTestWorld();
    expect(() => advanceDungeonFloor(world)).toThrow("DUNGEON_NOT_IN_PROGRESS");
  });

  it("progresses through combat then choice floor", () => {
    const world = enterDungeon(createTestWorld(), "kidd_treasure");
    // floor 0 is combat, so advanceDungeonFloor should initiate combat
    const afterCombatStart = advanceDungeonFloor(world);
    expect(afterCombatStart.combat).not.toBeNull();
    expect(afterCombatStart.dungeon!.currentFloor).toBe(0); // still floor 0

    // Simulate combat victory
    const victorWorld: World = {
      ...afterCombatStart,
      combat: {
        ...afterCombatStart.combat!,
        participants: afterCombatStart.combat!.participants.map((p) =>
          p.id === "player"
            ? { ...p, hp: p.maxHp } // no damage taken
            : { ...p, hp: 0 },
        ),
        status: "victory" as const,
      },
    };
    const afterVictory = advanceDungeonFloor(victorWorld);
    expect(afterVictory.combat).toBeNull();
    expect(afterVictory.dungeon!.currentFloor).toBe(1); // advanced to floor 1
    expect(afterVictory.dungeon!.status).toBe("in_progress");
    // floor 1 is choice — no choice provided means it returns unchanged
    const noChoice = advanceDungeonFloor(afterVictory);
    expect(noChoice.dungeon!.currentFloor).toBe(1); // not advanced
  });

  it("applies choice effects and advances", () => {
    const world = enterDungeon(createTestWorld(), "kidd_treasure");
    // skip floor 0 combat by going directly to victory
    const skipCombat: World = {
      ...world,
      dungeon: { ...world.dungeon!, currentFloor: 1 },
    };
    // floor 1 is choice, choose left (gold + hp damage)
    const result = advanceDungeonFloor(skipCombat, "left");
    // choice effects applied then floor advanced
    expect(result.dungeon!.currentFloor).toBe(2);
    expect(result.dungeon!.goldGained).toBe(300);
    expect(result.dungeon!.hpLoss).toBe(5);
  });

  it("marks dungeon cleared after last floor", () => {
    const world = enterDungeon(createTestWorld(), "kidd_treasure");
    // Jump to last floor (floor 3, treasure)
    const atLastFloor: World = {
      ...world,
      dungeon: { ...world.dungeon!, currentFloor: 3 },
    };
    const result = advanceDungeonFloor(atLastFloor);
    // treasure event advances to floor 4 >= 4, so cleared
    expect(result.dungeon!.currentFloor).toBe(4);
    expect(result.dungeon!.status).toBe("cleared");
  });

  it("marks dungeon failed on combat defeat", () => {
    const world = enterDungeon(createTestWorld(), "kidd_treasure");
    const inCombat = advanceDungeonFloor(world);
    // Simulate defeat
    const defeatedWorld: World = {
      ...inCombat,
      combat: { ...inCombat.combat!, status: "defeat" as const },
    };
    const result = advanceDungeonFloor(defeatedWorld);
    expect(result.dungeon!.status).toBe("failed");
    expect(result.combat).toBeNull();
  });

  it("tracks HP loss from combat", () => {
    const world = enterDungeon(createTestWorld(), "kidd_treasure");
    const inCombat = advanceDungeonFloor(world);
    // Simulate victory with 20 HP lost
    const victorWorld: World = {
      ...inCombat,
      combat: {
        ...inCombat.combat!,
        participants: inCombat.combat!.participants.map((p) =>
          p.id === "player" ? { ...p, hp: p.maxHp - 20 } : { ...p, hp: 0 },
        ),
        status: "victory" as const,
      },
    };
    const result = advanceDungeonFloor(victorWorld);
    expect(result.dungeon!.hpLoss).toBe(20);
  });
});

describe("completeDungeon", () => {
  it("completes cleared dungeon with rewards", () => {
    const world: World = {
      ...enterDungeon(createTestWorld(), "kidd_treasure"),
      dungeon: {
        ...enterDungeon(createTestWorld(), "kidd_treasure").dungeon!,
        status: "cleared",
        currentFloor: 4,
      },
    };
    const result = completeDungeon(world);
    expect(result.dungeon).toBeNull(); // dungeon state cleared
    // completionReward: gold 1000, exp 200, ring_of_vigor
    expect(result.fleet.gold).toBe(world.fleet.gold + 1000);
    expect(result.dungeonCooldowns.kidd_treasure).toBe(result.player.day);
  });
  it("throws for dungeon in failed status", () => {
    const world: World = {
      ...createTestWorld(),
      dungeon: {
        dungeonId: "kidd_treasure",
        currentFloor: 2,
        totalFloors: 4,
        hpLoss: 10,
        goldGained: 0,
        itemsGained: [],
        status: "failed",
      },
    };
    expect(() => completeDungeon(world)).toThrow("DUNGEON_NOT_IN_PROGRESS");
  });
});
describe("escapeDungeon", () => {
  it("retains 50% gold and all items on escape", () => {
    const baseWorld = createTestWorld();
    // 模拟 floor 事件已发放金币和物品
    const world: World = {
      ...baseWorld,
      dungeon: {
        dungeonId: "kidd_treasure",
        currentFloor: 2,
        totalFloors: 4,
        hpLoss: 10,
        goldGained: 500,
        itemsGained: ["silver_rapier"],
        status: "in_progress",
      },
      fleet: {
        ...baseWorld.fleet,
        gold: baseWorld.fleet.gold + 500, // 已在 floor 事件中发放
        inventory: [
          ...baseWorld.fleet.inventory,
          { uid: "item-escape", itemId: "silver_rapier" },
        ],
      },
    };
    const result = escapeDungeon(world);
    expect(result.dungeon).toBeNull();
    // 50% of 500 = 250 保留
    expect(result.fleet.gold).toBe(baseWorld.fleet.gold + 250);
    expect(
      result.fleet.inventory.some((i) => i.itemId === "silver_rapier"),
    ).toBe(true);
    // escape 不设置冷却
    expect(result.dungeonCooldowns).toEqual({});
  });

  it("throws for dungeon not in in_progress status", () => {
    const baseWorld = createTestWorld();
    const world: World = {
      ...baseWorld,
      dungeon: {
        dungeonId: "kidd_treasure",
        currentFloor: 4,
        totalFloors: 4,
        hpLoss: 0,
        goldGained: 0,
        itemsGained: [],
        status: "cleared",
      },
    };
    expect(() => escapeDungeon(world)).toThrow("DUNGEON_NOT_IN_PROGRESS");
  });

  it("throws when not in dungeon", () => {
    const world = createTestWorld();
    expect(() => escapeDungeon(world)).toThrow("DUNGEON_NOT_IN_PROGRESS");
  });
});

describe("failDungeon", () => {
  it("marks dungeon as failed and clears combat", () => {
    const world: World = {
      ...enterDungeon(createTestWorld(), "kidd_treasure"),
      combat: {
        participants: [],
        currentTurnIndex: 0,
        turnOrder: [],
        round: 1,
        logs: [],
        status: "in_progress",
      },
    };
    const result = failDungeon(world);
    expect(result.dungeon!.status).toBe("failed");
    expect(result.combat).toBeNull();
  });
});
