import { describe, expect, it } from "bun:test";
import { performCombatAction } from "../combat-person";
import type { CombatParticipant, PersonCombatState } from "../types";
import { makeCombat, part, worldWithCombat } from "./combat-person.helpers";

describe("enemy AI actions", () => {
  it("enemy acts after player's turn and attacks the player", () => {
    const base = makeCombat();
    const combat = {
      ...base,
      participants: base.participants.map((p) =>
        p.id === "player"
          ? { ...p, statuses: [{ type: "freeze" as const, duration: 2 }] }
          : p,
      ),
    };
    const w = worldWithCombat(combat);
    const result = performCombatAction(w, { type: "attack" });

    expect(result.combat).not.toBeNull();
    const combatAfter = result.combat!;
    const playerAfter = combatAfter.participants.find(
      (p) => p.id === "player",
    )!;
    expect(playerAfter.hp).toBeLessThan(100);

    const msgs = combatAfter.logs.map((l) => l.message).join(" ");
    expect(msgs).toContain("海盗水手");
  });

  it("advanceTurn skips a dead participant in the turn order", () => {
    const deadEnemy = part({
      id: "enemy-1",
      type: "enemy",
      hp: 0,
      maxHp: 40,
      mp: 20,
      atk: 8,
      def: 4,
      spd: 7,
      luk: 3,
      level: 1,
      weaponId: "rusted_sword",
    });
    const aliveEnemy = part({
      id: "enemy-2",
      type: "enemy",
      hp: 40,
      maxHp: 40,
      mp: 20,
      atk: 8,
      def: 4,
      spd: 5,
      luk: 3,
      level: 1,
      weaponId: "rusted_sword",
    });
    const player: CombatParticipant = {
      id: "player",
      name: "测试船长",
      type: "player",
      hp: 100,
      maxHp: 100,
      mp: 50,
      maxMp: 50,
      atk: 20,
      def: 10,
      mag: 15,
      mdf: 8,
      spd: 20,
      luk: 10,
      level: 1,
      weaponId: null,
      isDodging: false,
      isParrying: false,
      statuses: [{ type: "freeze" as const, duration: 3 }],
    };

    const combat: PersonCombatState = {
      participants: [player, deadEnemy, aliveEnemy],
      currentTurnIndex: 0,
      turnOrder: ["player", "enemy-1", "enemy-2"],
      round: 1,
      logs: [],
      status: "in_progress",
    };

    const w = worldWithCombat(combat);
    const result = performCombatAction(w, { type: "attack" });

    expect(result.combat).not.toBeNull();
    const combatAfter = result.combat!;
    const playerAfter = combatAfter.participants.find(
      (p) => p.id === "player",
    )!;
    expect(playerAfter.hp).toBeLessThan(100);
  });

  it("combat advances through multiple rounds when both sides survive", () => {
    const w = worldWithCombat();
    const result = performCombatAction(w, { type: "attack" });

    expect(result.combat).not.toBeNull();
    const combat = result.combat!;
    expect(combat.round).toBe(2);
    expect(combat.currentTurnIndex).toBe(0);
  });
});
