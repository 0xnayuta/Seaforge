// ============================================================
// NPC 系统领域逻辑测试
// ============================================================

import { describe, expect, it } from "bun:test";
import {
  calcMaxShips,
  countRecruitedCaptains,
  getNpcConfig,
  giveGift,
  recruitNpc,
  talkToNpc,
} from "../npc";
import type { World } from "../types";
import { createEmptyWorld } from "./helpers";

function worldWithNpc(overrides?: Partial<World>): World {
  return createEmptyWorld({
    player: { currentPortId: "quanzhou" },
    npcRelations: {},
    activeQuests: [],
    ...overrides,
  });
}

// NB: NPC data does NOT import from player.ts (clean domain),
// so helpers.ts creates test worlds with minimal fields

describe("getNpcConfig", () => {
  it("returns NPC config for valid ID", () => {
    const npc = getNpcConfig("li_hua");
    expect(npc.id).toBe("li_hua");
    expect(npc.name).toBe("李华");
    expect(npc.portId).toBe("quanzhou");
  });

  it("throws NPC_NOT_FOUND for invalid ID", () => {
    expect(() => getNpcConfig("nonexistent")).toThrow("NPC_NOT_FOUND");
  });
});

describe("talkToNpc", () => {
  it("advances dialog phase by 1", () => {
    const world = worldWithNpc({ player: { currentPortId: "quanzhou" } });
    const result = talkToNpc(world, "li_hua");
    expect(result.npcRelations.li_hua.dialogPhase).toBe(1);
  });

  it("creates relation if not exists", () => {
    const world = worldWithNpc({ player: { currentPortId: "quanzhou" } });
    const result = talkToNpc(world, "li_hua");
    expect(result.npcRelations.li_hua).toBeDefined();
    expect(result.npcRelations.li_hua.affinity).toBe(0);
  });

  it("throws NPC_NOT_AT_THIS_PORT when NPC is not at current port", () => {
    const world = worldWithNpc({ player: { currentPortId: "venice" } });
    expect(() => talkToNpc(world, "li_hua")).toThrow("NPC_NOT_AT_THIS_PORT");
  });
});

describe("giveGift", () => {
  it("increases affinity and removes gift item from inventory", () => {
    const world = worldWithNpc({
      player: { currentPortId: "quanzhou" },
      fleet: {
        inventory: [{ uid: "gift-1", itemId: "ring_of_vigor", quantity: 1 }],
      },
    });
    const result = giveGift(world, "li_hua", "gift-1");
    expect(result.npcRelations.li_hua.affinity).toBe(15); // ring_of_vigor = 15
    expect(result.fleet.inventory).toHaveLength(0);
  });

  it("caps affinity at 100", () => {
    const world = worldWithNpc({
      player: { currentPortId: "quanzhou" },
      npcRelations: {
        li_hua: {
          affinity: 95,
          recruited: false,
          dialogPhase: 5,
          completedQuests: [],
        },
      },
      fleet: {
        inventory: [{ uid: "gift-1", itemId: "ring_of_vigor", quantity: 1 }],
      },
    });
    const result = giveGift(world, "li_hua", "gift-1");
    expect(result.npcRelations.li_hua.affinity).toBe(100);
  });

  it("throws ITEM_NOT_FOUND_IN_INVENTORY when item not in inventory", () => {
    const world = worldWithNpc({
      player: { currentPortId: "quanzhou" },
      fleet: { inventory: [] },
    });
    expect(() => giveGift(world, "li_hua", "nonexistent")).toThrow(
      "ITEM_NOT_FOUND_IN_INVENTORY",
    );
  });

  it("throws ITEM_NOT_FOUND when NPC has no preference for the item", () => {
    const world = worldWithNpc({
      player: { currentPortId: "quanzhou" },
      fleet: {
        inventory: [{ uid: "gift-1", itemId: "ragged_clothes", quantity: 1 }],
      },
    });
    expect(() => giveGift(world, "li_hua", "gift-1")).toThrow("ITEM_NOT_FOUND");
  });

  it("throws NPC_NOT_AT_THIS_PORT when NPC is at different port", () => {
    const world = worldWithNpc({
      player: { currentPortId: "venice" },
      fleet: {
        inventory: [{ uid: "gift-1", itemId: "ring_of_vigor", quantity: 1 }],
      },
    });
    expect(() => giveGift(world, "li_hua", "gift-1")).toThrow(
      "NPC_NOT_AT_THIS_PORT",
    );
  });
});

describe("recruitNpc", () => {
  it("recruits a recruitable NPC and deducts gold, increases maxShips", () => {
    const world = worldWithNpc({
      player: { currentPortId: "quanzhou" },
      npcRelations: {
        li_hua: {
          affinity: 40,
          recruited: false,
          dialogPhase: 3,
          completedQuests: [],
        },
      },
      fleet: { gold: 5000, inventory: [], maxShips: 1 },
    });
    const result = recruitNpc(world, "li_hua");
    expect(result.npcRelations.li_hua.recruited).toBe(true);
    expect(result.fleet.gold).toBe(3000); // 5000 - 2000
    expect(result.fleet.maxShips).toBe(2); // 1 base + 1 recruit
  });

  it("throws NPC_NOT_AT_THIS_PORT when not at NPC's port", () => {
    const world = worldWithNpc({
      player: { currentPortId: "venice" },
      npcRelations: {
        li_hua: {
          affinity: 40,
          recruited: false,
          dialogPhase: 3,
          completedQuests: [],
        },
      },
    });
    expect(() => recruitNpc(world, "li_hua")).toThrow("NPC_NOT_AT_THIS_PORT");
  });

  it("throws NPC_NOT_RECRUITABLE when NPC is not recruitable", () => {
    const world = worldWithNpc({
      player: { currentPortId: "alexandria" },
      npcRelations: {
        fatima: {
          affinity: 50,
          recruited: false,
          dialogPhase: 2,
          completedQuests: [],
        },
      },
    });
    expect(() => recruitNpc(world, "fatima")).toThrow("NPC_NOT_RECRUITABLE");
  });

  it("throws NPC_ALREADY_RECRUITED when already recruited", () => {
    const world = worldWithNpc({
      player: { currentPortId: "quanzhou" },
      npcRelations: {
        li_hua: {
          affinity: 40,
          recruited: true,
          dialogPhase: 3,
          completedQuests: [],
        },
      },
    });
    expect(() => recruitNpc(world, "li_hua")).toThrow("NPC_ALREADY_RECRUITED");
  });

  it("throws AFFINITY_TOO_LOW when affinity is below minimum", () => {
    const world = worldWithNpc({
      player: { currentPortId: "quanzhou" },
      npcRelations: {
        li_hua: {
          affinity: 10,
          recruited: false,
          dialogPhase: 1,
          completedQuests: [],
        },
      },
      fleet: { gold: 5000, inventory: [] },
    });
    expect(() => recruitNpc(world, "li_hua")).toThrow("AFFINITY_TOO_LOW");
  });

  it("throws INSUFFICIENT_GOLD when player lacks gold", () => {
    const world = worldWithNpc({
      player: { currentPortId: "quanzhou" },
      npcRelations: {
        li_hua: {
          affinity: 40,
          recruited: false,
          dialogPhase: 3,
          completedQuests: [],
        },
      },
      fleet: { gold: 100, inventory: [] },
    });
    expect(() => recruitNpc(world, "li_hua")).toThrow("INSUFFICIENT_GOLD");
  });

  it("throws QUEST_REQUIREMENT_NOT_MET when required quests not completed (Marco)", () => {
    const world = worldWithNpc({
      player: { currentPortId: "venice" },
      npcRelations: {
        marco: {
          affinity: 50,
          recruited: false,
          dialogPhase: 3,
          completedQuests: [],
        },
      },
      fleet: { gold: 5000, inventory: [] },
    });
    // Marco requires venetian_trade quest completed
    expect(() => recruitNpc(world, "marco")).toThrow(
      "QUEST_REQUIREMENT_NOT_MET",
    );
  });

  it("recruits Marco when venetian_trade is completed", () => {
    const world = worldWithNpc({
      player: { currentPortId: "venice" },
      npcRelations: {
        marco: {
          affinity: 50,
          recruited: false,
          dialogPhase: 3,
          completedQuests: ["venetian_trade"],
        },
      },
      fleet: { gold: 5000, inventory: [], maxShips: 1 },
    });
    const result = recruitNpc(world, "marco");
    expect(result.npcRelations.marco.recruited).toBe(true);
    expect(result.fleet.maxShips).toBe(2);
  });
});

describe("countRecruitedCaptains", () => {
  it("returns 0 when no NPCs are recruited", () => {
    const world = worldWithNpc();
    expect(countRecruitedCaptains(world)).toBe(0);
  });

  it("counts recruited NPCs", () => {
    const world = worldWithNpc({
      npcRelations: {
        li_hua: {
          affinity: 50,
          recruited: true,
          dialogPhase: 5,
          completedQuests: [],
        },
        marco: {
          affinity: 30,
          recruited: false,
          dialogPhase: 2,
          completedQuests: [],
        },
        henry: {
          affinity: 40,
          recruited: true,
          dialogPhase: 3,
          completedQuests: [],
        },
      },
    });
    expect(countRecruitedCaptains(world)).toBe(2);
  });
});

describe("calcMaxShips", () => {
  it("returns 1 when no captains recruited", () => {
    const world = worldWithNpc();
    expect(calcMaxShips(world)).toBe(1);
  });

  it("returns 3 when 2 captains recruited", () => {
    const world = worldWithNpc({
      npcRelations: {
        li_hua: {
          affinity: 50,
          recruited: true,
          dialogPhase: 5,
          completedQuests: [],
        },
        henry: {
          affinity: 40,
          recruited: true,
          dialogPhase: 3,
          completedQuests: [],
        },
      },
    });
    expect(calcMaxShips(world)).toBe(3);
  });
});
