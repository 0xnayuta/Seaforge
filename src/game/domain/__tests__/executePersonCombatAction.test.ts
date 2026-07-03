import { describe, expect, it } from "bun:test";
import { executePersonCombatAction } from "../combat-person";
import type { World } from "../types";
import { DomainError } from "../types";
import { makeCombat, worldWithCombat } from "./combat-person.helpers";

describe("executePersonCombatAction", () => {
  // ── guard errors ──
  it("throws NOT_IN_COMBAT when world has no combat", () => {
    const w: World = { ...worldWithCombat(), combat: null };
    expect(() => executePersonCombatAction(w, { type: "attack" })).toThrow(
      DomainError,
    );
    expect(() => executePersonCombatAction(w, { type: "attack" })).toThrow(
      "NOT_IN_COMBAT",
    );
  });

  it("throws NOT_YOUR_TURN when it is not the player's turn", () => {
    const base = makeCombat();
    const combat = {
      ...base,
      turnOrder: ["enemy-1", "player"],
      currentTurnIndex: 0,
    };
    const w = worldWithCombat(combat);

    expect(() => executePersonCombatAction(w, { type: "attack" })).toThrow(
      DomainError,
    );
    expect(() => executePersonCombatAction(w, { type: "attack" })).toThrow(
      "NOT_YOUR_TURN",
    );
  });

  it("processes a basic attack and enemy counter-turn, advancing the round", () => {
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
    const result = executePersonCombatAction(w, { type: "attack" });

    expect(result.combat).not.toBeNull();
    const resultCombat = result.combat!;

    expect(resultCombat.participants.filter((p) => p.hp > 0)).toHaveLength(2);

    const enemy = resultCombat.participants.find((p) => p.id === "enemy-1")!;
    expect(enemy.hp).toBeLessThan(40);

    const playerAfter = resultCombat.participants.find(
      (p) => p.id === "player",
    )!;
    expect(playerAfter.hp).toBeLessThan(100);
    expect(resultCombat.round).toBeGreaterThanOrEqual(2);

    const msgs = resultCombat.logs.map((l) => l.message).join(" ");
    expect(msgs).toContain("冰冻");
    expect(msgs).toContain("海盗水手");
  });

  // ── dodge ──
  it("dodge action consumes 5 MP and causes next enemy attack to miss", () => {
    const w = worldWithCombat();
    const result = executePersonCombatAction(w, {
      type: "dodge",
    });

    expect(result.combat).not.toBeNull();
    const combat = result.combat!;
    const player = combat.participants.find((p) => p.id === "player")!;
    expect(player.mp).toBe(45);

    const msgs = combat.logs.map((l) => l.message).join(" ");
    expect(msgs).toContain("回避");
  });

  it("dodge throws INSUFFICIENT_MP when player has < 5 MP", () => {
    const base = makeCombat();
    const combat = {
      ...base,
      participants: base.participants.map((p) =>
        p.id === "player" ? { ...p, mp: 3 } : p,
      ),
    };
    const w = worldWithCombat(combat);

    expect(() => executePersonCombatAction(w, { type: "dodge" })).toThrow(
      "INSUFFICIENT_MP",
    );
  });

  // ── parry ──
  it("parry action consumes 8 MP and causes counter-attack on enemy physical attack", () => {
    const w = worldWithCombat();
    const result = executePersonCombatAction(w, {
      type: "parry",
    });

    expect(result.combat).not.toBeNull();
    const combat = result.combat!;
    const player = combat.participants.find((p) => p.id === "player")!;
    expect(player.mp).toBe(42);

    const msgs = combat.logs.map((l) => l.message).join(" ");
    expect(msgs).toContain("弹反");
  });

  it("parry throws INSUFFICIENT_MP when player has < 8 MP", () => {
    const base = makeCombat();
    const combat = {
      ...base,
      participants: base.participants.map((p) =>
        p.id === "player" ? { ...p, mp: 5 } : p,
      ),
    };
    const w = worldWithCombat(combat);

    expect(() => executePersonCombatAction(w, { type: "parry" })).toThrow(
      "INSUFFICIENT_MP",
    );
  });

  // ── skill: heal ──
  it("uses a heal skill to restore HP", () => {
    const base = makeCombat();
    const combat = {
      ...base,
      participants: base.participants.map((p) =>
        p.id === "player" ? { ...p, hp: 50 } : p,
      ),
    };
    const w = worldWithCombat(combat);

    const result = executePersonCombatAction(w, {
      type: "skill",
      skillId: "heal_light",
      targetId: "player",
    });

    expect(result.combat).not.toBeNull();
    const combatAfter = result.combat!;
    const healedPlayer = combatAfter.participants.find(
      (p) => p.id === "player",
    )!;
    expect(healedPlayer.hp).toBeGreaterThan(50);
    expect(healedPlayer.mp).toBe(38);

    const msgs = combatAfter.logs.map((l) => l.message).join(" ");
    expect(msgs).toContain("圣光治疗");
  });

  // ── skill: damage ──
  it("uses a damage skill (fireball) against enemy", () => {
    const base = makeCombat();
    const combat = {
      ...base,
      participants: base.participants.map((p) =>
        p.id === "enemy-1"
          ? { ...p, statuses: [{ type: "freeze" as const, duration: 1 }] }
          : p,
      ),
    };
    const w = worldWithCombat(combat);

    const result = executePersonCombatAction(w, {
      type: "skill",
      skillId: "fireball",
      targetId: "enemy-1",
    });

    expect(result.combat).not.toBeNull();
    const combatAfter = result.combat!;
    const player = combatAfter.participants.find((p) => p.id === "player")!;
    expect(player.mp).toBe(40);

    const enemyAfter = combatAfter.participants.find(
      (p) => p.id === "enemy-1",
    )!;
    expect(enemyAfter.hp).toBeLessThan(40);

    const msgs = combatAfter.logs.map((l) => l.message).join(" ");
    expect(msgs).toContain("火球术");
  });

  // ── skill: unknown ──
  it("throws INVALID_COMBAT_ACTION for unknown skill ID", () => {
    const w = worldWithCombat();
    expect(() =>
      executePersonCombatAction(w, {
        type: "skill",
        skillId: "nonexistent",
      }),
    ).toThrow("INVALID_COMBAT_ACTION");
  });

  // ── skill: insufficient MP ──
  it("throws INSUFFICIENT_MP when player lacks MP for skill cost", () => {
    const base = makeCombat();
    const combat = {
      ...base,
      participants: base.participants.map((p) =>
        p.id === "player" ? { ...p, mp: 5 } : p,
      ),
    };
    const w = worldWithCombat(combat);

    expect(() =>
      executePersonCombatAction(w, {
        type: "skill",
        skillId: "fireball",
      }),
    ).toThrow("INSUFFICIENT_MP");
  });

  // ── silence ──
  it("throws SILENCED when using a magical skill while silenced", () => {
    const base = makeCombat();
    const combat = {
      ...base,
      participants: base.participants.map((p) =>
        p.id === "player"
          ? { ...p, statuses: [{ type: "silence" as const, duration: 2 }] }
          : p,
      ),
    };
    const w = worldWithCombat(combat);

    expect(() =>
      executePersonCombatAction(w, {
        type: "skill",
        skillId: "fireball",
      }),
    ).toThrow("SILENCED");
  });

  it("does NOT throw SILENCED for non-magical skills (physical)", () => {
    const base = makeCombat();
    const combat = {
      ...base,
      participants: base.participants.map((p) =>
        p.id === "player"
          ? { ...p, statuses: [{ type: "silence" as const, duration: 2 }] }
          : p,
      ),
    };
    const w = worldWithCombat(combat);

    const result = executePersonCombatAction(w, {
      type: "skill",
      skillId: "heavy_strike",
    });

    expect(result.combat).not.toBeNull();
    const combatAfter = result.combat!;
    const enemy = combatAfter.participants.find((p) => p.id === "enemy-1")!;
    expect(enemy.hp).toBeLessThan(40);
  });

  // ── freeze ──
  it("freeze causes player to skip action and status tick still happens", () => {
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

    const result = executePersonCombatAction(w, { type: "attack" });

    expect(result.combat).not.toBeNull();
    const combatAfter = result.combat!;
    const msgs = combatAfter.logs.map((l) => l.message).join(" ");
    expect(msgs).toContain("冰冻");
  });

  // ── sleep ──
  it("sleep causes player to skip action", () => {
    const base = makeCombat();
    const combat = {
      ...base,
      participants: base.participants.map((p) =>
        p.id === "player"
          ? { ...p, statuses: [{ type: "sleep" as const, duration: 2 }] }
          : p,
      ),
    };
    const w = worldWithCombat(combat);

    const result = executePersonCombatAction(w, { type: "attack" });

    expect(result.combat).not.toBeNull();
    const combatAfter = result.combat!;
    const msgs = combatAfter.logs.map((l) => l.message).join(" ");
    expect(msgs).toContain("睡眠");
  });

  it("sleep is removed when the sleeping target takes damage", () => {
    const base = makeCombat();
    const combat = {
      ...base,
      participants: base.participants.map((p) =>
        p.id === "enemy-1"
          ? {
              ...p,
              statuses: [{ type: "sleep" as const, duration: 3 }],
              hp: 999,
            }
          : p,
      ),
    };
    const w = worldWithCombat(combat);
    const result = executePersonCombatAction(w, { type: "attack" });

    expect(result.combat).not.toBeNull();
    const updatedEnemy = result.combat!.participants.find(
      (p) => p.id === "enemy-1",
    )!;
    expect(updatedEnemy.statuses.some((s) => s.type === "sleep")).toBe(false);
    const msgs = result.combat!.logs.map((l) => l.message).join(" ");
    expect(msgs).toContain("从梦中痛醒");
  });

  // ── victory ──
  it("results in victory when all enemies die, granting 50 EXP", () => {
    const base = makeCombat();
    const combat = {
      ...base,
      participants: base.participants.map((p) =>
        p.id === "enemy-1"
          ? {
              ...p,
              hp: 5,
              statuses: [{ type: "freeze" as const, duration: 1 }],
            }
          : p,
      ),
    };

    const w = worldWithCombat(combat);
    const result = executePersonCombatAction(w, { type: "attack" });

    expect(result.combat).toBeNull();
    expect(result.player.exp).toBe(50);
    expect(result.voyage).not.toBeNull();
  });

  // ── defeat ──
  it("results in defeat when player dies, losing gold and cargo", () => {
    const base = makeCombat();
    const combat = {
      ...base,
      participants: base.participants.map((p) =>
        p.id === "player"
          ? {
              ...p,
              hp: 1,
              statuses: [{ type: "freeze" as const, duration: 2 }],
            }
          : p,
      ),
    };

    const w = worldWithCombat(combat);
    const result = executePersonCombatAction(w, { type: "attack" });

    expect(result.combat).toBeNull();
    expect(result.fleet.gold).toBe(700);
    for (const ship of result.fleet.ships) {
      expect(ship.cargo).toHaveLength(0);
    }
    expect(result.voyage).toBeNull();
    expect(result.player.currentPortId).toBe("quanzhou");
  });
});

describe("status effect damage (DoT) at start of turn", () => {
  it("poison deals 8% maxHp damage", () => {
    const base = makeCombat();
    const combat = {
      ...base,
      participants: base.participants.map((p) =>
        p.id === "player"
          ? {
              ...p,
              statuses: [{ type: "poison" as const, duration: 3 }],
              hp: 100,
              maxHp: 100,
            }
          : p,
      ),
    };
    const w = worldWithCombat(combat);
    const result = executePersonCombatAction(w, { type: "attack" });

    const combatAfter = result.combat!;
    const playerAfter = combatAfter.participants.find(
      (p) => p.id === "player",
    )!;
    expect(playerAfter.hp).toBeLessThanOrEqual(92);

    const msgs = combatAfter.logs.map((l) => l.message).join(" ");
    expect(msgs).toContain("中毒");
  });

  it("bleed deals 12% maxHp damage", () => {
    const base = makeCombat();
    const combat = {
      ...base,
      participants: base.participants.map((p) =>
        p.id === "player"
          ? {
              ...p,
              statuses: [{ type: "bleed" as const, duration: 3 }],
              hp: 100,
              maxHp: 100,
            }
          : p,
      ),
    };
    const w = worldWithCombat(combat);
    const result = executePersonCombatAction(w, { type: "attack" });

    const combatAfter = result.combat!;
    const playerAfter = combatAfter.participants.find(
      (p) => p.id === "player",
    )!;
    expect(playerAfter.hp).toBeLessThanOrEqual(88);

    const msgs = combatAfter.logs.map((l) => l.message).join(" ");
    expect(msgs).toContain("出血");
  });

  it("burn deals 10% maxHp damage", () => {
    const base = makeCombat();
    const combat = {
      ...base,
      participants: base.participants.map((p) =>
        p.id === "player"
          ? {
              ...p,
              statuses: [{ type: "burn" as const, duration: 3 }],
              hp: 100,
              maxHp: 100,
            }
          : p,
      ),
    };
    const w = worldWithCombat(combat);
    const result = executePersonCombatAction(w, { type: "attack" });

    const combatAfter = result.combat!;
    const playerAfter = combatAfter.participants.find(
      (p) => p.id === "player",
    )!;
    expect(playerAfter.hp).toBeLessThanOrEqual(90);

    const msgs = combatAfter.logs.map((l) => l.message).join(" ");
    expect(msgs).toContain("燃烧");
  });

  it("multiple DoTs stack damage", () => {
    const base = makeCombat();
    const combat = {
      ...base,
      participants: base.participants.map((p) =>
        p.id === "player"
          ? {
              ...p,
              statuses: [
                { type: "poison" as const, duration: 3 },
                { type: "bleed" as const, duration: 3 },
                { type: "burn" as const, duration: 3 },
              ],
              hp: 100,
              maxHp: 100,
            }
          : p,
      ),
    };
    const w = worldWithCombat(combat);
    const result = executePersonCombatAction(w, { type: "attack" });

    const combatAfter = result.combat!;
    const playerAfter = combatAfter.participants.find(
      (p) => p.id === "player",
    )!;
    expect(playerAfter.hp).toBeLessThanOrEqual(70);

    const msgs = combatAfter.logs.map((l) => l.message).join(" ");
    expect(msgs).toContain("中毒");
    expect(msgs).toContain("出血");
    expect(msgs).toContain("燃烧");
  });

  it("DoT damage can kill the player", () => {
    const base = makeCombat();
    const combat = {
      ...base,
      participants: base.participants.map((p) => {
        if (p.id === "player")
          return {
            ...p,
            statuses: [{ type: "bleed" as const, duration: 3 }],
            hp: 1,
            maxHp: 100,
          };
        if (p.id === "enemy-1") return { ...p, hp: 100 };
        return p;
      }),
    };

    const w = worldWithCombat(combat);
    const result = executePersonCombatAction(w, { type: "attack" });

    expect(result.combat).toBeNull();
    expect(result.voyage).toBeNull();
  });
});
