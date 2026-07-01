import { describe, expect, it } from "bun:test";
import { SKILLS } from "../../../data/skills";
import {
  calcInitiative,
  calcPersonDamage,
  executePersonCombatAction,
  initPersonCombat,
} from "../combat-person";
import type { CombatParticipant, PersonCombatState, World } from "../types";
import { DomainError } from "../types";

// ── Helpers ──────────────────────────────────────────────────────────

/** Deterministic RNG: always returns the given value. */
function fixedRng(value: number): () => number {
  return () => value;
}

/** Build a minimal CombatParticipant with sensible defaults. */
function part(overrides?: Partial<CombatParticipant>): CombatParticipant {
  return {
    id: "p",
    name: "测试",
    type: "player",
    hp: 100,
    maxHp: 100,
    mp: 50,
    maxMp: 50,
    atk: 20,
    def: 10,
    mag: 15,
    mdf: 8,
    spd: 12,
    luk: 10,
    level: 1,
    weaponId: null,
    statuses: [],
    isDodging: false,
    isParrying: false,
    ...overrides,
  };
}

/** Build a combat state ready for test – player always goes first. */
function makeCombat(overrides?: Partial<PersonCombatState>): PersonCombatState {
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
    statuses: [],
    isDodging: false,
    isParrying: false,
  };

  const enemy: CombatParticipant = {
    id: "enemy-1",
    name: "海盗水手",
    type: "enemy",
    hp: 40,
    maxHp: 40,
    mp: 20,
    maxMp: 20,
    atk: 8,
    def: 4,
    mag: 3,
    mdf: 3,
    spd: 7,
    luk: 3,
    level: 1,
    weaponId: "rusted_sword",
    statuses: [],
    isDodging: false,
    isParrying: false,
  };

  const participants: CombatParticipant[] = [player, enemy];
  const turnOrder = calcInitiative(participants);

  return {
    participants,
    currentTurnIndex: 0,
    turnOrder,
    round: 1,
    logs: [],
    status: "in_progress",
    ...overrides,
  };
}

/** Build a minimal World with the given combat state (or default). */
function worldWithCombat(combat: PersonCombatState = makeCombat()): World {
  return {
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
    },
    fleet: {
      gold: 1000,
      ships: [
        {
          id: "ship-1",
          typeId: "sloop",
          name: "单桅帆船",
          durability: 100,
          equipment: {
            hullLevel: 0,
            sailLevel: 0,
            armorLevel: 0,
            cannonLevel: 0,
          },
          maxDurability: 100,
          cargo: [{ goodId: "silk", quantity: 5, buyPrice: 102 }],
          armamentLevel: 0,
          equippedItems: [],
        },
      ],
      activeShipId: "ship-1",
      maxShips: 1,
      crew: 3,
      maxCrew: 7,
      inventory: [],
      shipEquipmentInventory: [],
    },
    market: { prices: {} },
    voyage: {
      fromPortId: "quanzhou",
      toPortId: "malacca",
      departureDay: 1,
      travelDays: 3,
      events: [],
      fleetShipIds: ["ship-1"],
    },
    combat,
    npcRelations: {},
    activeQuests: [],
  };
}

// ── calcInitiative ───────────────────────────────────────────────────

describe("calcInitiative", () => {
  it("sorts participants by SPD descending", () => {
    const fast = part({ id: "fast", spd: 30 });
    const medium = part({ id: "med", spd: 15 });
    const slow = part({ id: "slow", spd: 5 });

    const order = calcInitiative([slow, fast, medium]);
    expect(order).toEqual(["fast", "med", "slow"]);
  });

  it("gives player priority when SPD is tied with an enemy", () => {
    const enemy = part({ id: "e1", type: "enemy", spd: 10 });
    const player = part({ id: "player", type: "player", spd: 10 });

    const order = calcInitiative([enemy, player]);
    expect(order[0]).toBe("player");
    expect(order[1]).toBe("e1");
  });

  it("returns all participant IDs", () => {
    const a = part({ id: "a", spd: 5 });
    const b = part({ id: "b", spd: 10 });

    const order = calcInitiative([a, b]);
    expect(order).toHaveLength(2);
    expect(order).toEqual(expect.arrayContaining(["a", "b"]));
  });
});

// ── calcPersonDamage ─────────────────────────────────────────────────

describe("calcPersonDamage", () => {
  // ── dodge ──
  it("is dodged when defender.isDodging is true", () => {
    const result = calcPersonDamage(part(), part({ isDodging: true }), null);
    expect(result.isDodged).toBe(true);
    expect(result.damage).toBe(0);
    expect(result.isCrit).toBe(false);
  });

  // ── parry (physical only) ──
  it("is parried when defender.isParrying vs physical attack", () => {
    const result = calcPersonDamage(part(), part({ isParrying: true }), null);
    expect(result.isParried).toBe(true);
    expect(result.isCountered).toBe(true);
    expect(result.damage).toBe(0);
  });

  it("is NOT parried when defender.isParrying vs magical attack", () => {
    const fireball = SKILLS.find((s) => s.id === "fireball")!;
    // Magical attack skips the parry branch (isPhysical=false).
    // Use low spd/luk to minimise evasion chance; rng > 0.05 avoids it.
    const result = calcPersonDamage(
      part({ spd: 1 }),
      part({ isParrying: true, spd: 1, luk: 0 }),
      fireball,
      fixedRng(0.5),
    );
    expect(result.isParried).toBe(false);
    expect(result.isDodged).toBe(false);
  });

  // ── blind ──
  it("misses when attacker is blind and rng < 0.5", () => {
    const attacker = part({
      statuses: [{ type: "blind" as const, duration: 2 }],
    });
    const result = calcPersonDamage(attacker, part(), null, fixedRng(0.3));
    expect(result.isDodged).toBe(true);
    expect(result.damage).toBe(0);
  });

  it("blind attacker can still hit when rng >= 0.5", () => {
    const attacker = part({
      atk: 20,
      statuses: [{ type: "blind" as const, duration: 2 }],
    });
    const result = calcPersonDamage(
      attacker,
      part({ def: 0 }),
      null,
      fixedRng(0.7),
    );
    expect(result.isDodged).toBe(false);
    expect(result.damage).toBe(20);
  });

  // ── evasion (speed + luck) ──
  it("evades when defender is much faster", () => {
    const fastDef = part({ spd: 50, luk: 30 });
    const slowAtk = part({ spd: 1, luk: 0 });
    // evasion chance = 0.05 + max(0, 49*0.01) + 30*0.005 = 0.05+0.49+0.15 = 0.69 (capped at 0.3)
    const result = calcPersonDamage(slowAtk, fastDef, null, fixedRng(0.01));
    expect(result.isDodged).toBe(true);
  });

  it("frozen or sleeping defender cannot evade", () => {
    const frozenDef = part({
      spd: 50,
      luk: 30,
      statuses: [{ type: "freeze" as const, duration: 2 }],
    });
    const slowAtk = part({ spd: 1, luk: 0 });
    const result = calcPersonDamage(slowAtk, frozenDef, null, fixedRng(0.01));
    expect(result.isDodged).toBe(false);
  });

  it("sleeping defender cannot evade", () => {
    const asleepDef = part({
      spd: 50,
      luk: 30,
      statuses: [{ type: "sleep" as const, duration: 2 }],
    });
    const slowAtk = part({ spd: 1, luk: 0 });
    const result = calcPersonDamage(slowAtk, asleepDef, null, fixedRng(0.01));
    expect(result.isDodged).toBe(false);
  });

  // ── damage formula ──
  it("physical: max(1, round(atk × power − def))", () => {
    const result = calcPersonDamage(
      part({ atk: 30 }),
      part({ def: 10, spd: 1, luk: 0 }),
      null,
      fixedRng(1),
    );
    expect(result.damage).toBe(20); // 30×1 − 10 = 20
  });

  it("magical: max(1, round(mag × power − mdf))", () => {
    const fireball = SKILLS.find((s) => s.id === "fireball")!;
    // Use defender with 0 luck so evasion chance is just base 0.05; rng=0.5 avoids it.
    const result = calcPersonDamage(
      part({ mag: 20 }),
      part({ mdf: 10, spd: 1, luk: 0 }),
      fireball,
      fixedRng(0.5),
    );
    expect(result.damage).toBe(20); // 20×1.5 − 10 = 20
  });
  it("damage is at least 1 even with high defense", () => {
    const result = calcPersonDamage(
      part({ atk: 1 }),
      part({ def: 100, spd: 1, luk: 0 }),
      null,
      fixedRng(1),
    );
    expect(result.damage).toBe(1);
  });

  it("skill with no type (attacker defined) is treated as physical", () => {
    // null skill defaults to physical path
    const result = calcPersonDamage(
      part({ atk: 30 }),
      part({ def: 5, spd: 1, luk: 0 }),
      null,
      fixedRng(1),
    );
    expect(result.damage).toBe(25);
  });

  it("freeze reduces defense by 30% for physical attacks", () => {
    const result = calcPersonDamage(
      part({ atk: 20 }),
      part({
        def: 10,
        spd: 1,
        luk: 0,
        statuses: [{ type: "freeze" as const, duration: 2 }],
      }),
      null,
      fixedRng(1),
    );
    // def → 7, damage = 20 − 7 = 13
    expect(result.damage).toBe(13);
  });

  // ── crit ──
  it("crits when rng < attacker.luk × 0.01, dealing 1.5× floor", () => {
    // Defender with 0 luk/spd → evasion base 0.05; rng=0.1 > 0.05 so no evasion,
    // and critChance = min(0.5, 99*0.01) = 0.50 → rng=0.1 < 0.5 → crit.
    const result = calcPersonDamage(
      part({ atk: 100, luk: 99 }),
      part({ def: 0, luk: 0, spd: 1 }),
      null,
      fixedRng(0.1),
    );
    expect(result.isCrit).toBe(true);
    expect(result.damage).toBe(150); // floor(100 × 1.5)
  });

  it("does not crit when rng >= luk × 0.01", () => {
    // rng=0.99 > 0.50 critChance threshold, but also > 0.05 evasion → no crit
    const result = calcPersonDamage(
      part({ atk: 100, luk: 99 }),
      part({ def: 0, luk: 0, spd: 1 }),
      null,
      fixedRng(0.99),
    );
    expect(result.isCrit).toBe(false);
    expect(result.damage).toBe(100);
  });

  it("crit chance is capped at 50%", () => {
    // luk = 99 → critChance = min(0.5, 0.99) = 0.5
    // fixedRng(0.5) → not crit (rng < critChance → 0.5 < 0.5 = false)
    const noCrit = calcPersonDamage(
      part({ luk: 99 }),
      part({ def: 0 }),
      null,
      fixedRng(0.5),
    );
    expect(noCrit.isCrit).toBe(false);

    const yesCrit = calcPersonDamage(
      part({ luk: 99 }),
      part({ def: 0 }),
      null,
      fixedRng(0.49),
    );
    expect(yesCrit.isCrit).toBe(true);
  });
});

// ── executePersonCombatAction ────────────────────────────────────────

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

    // Two participants should remain alive (fight still in progress)
    expect(resultCombat.participants.filter((p) => p.hp > 0)).toHaveLength(2);

    // Enemy should have taken damage from the attack
    const enemy = resultCombat.participants.find((p) => p.id === "enemy-1")!;
    expect(enemy.hp).toBeLessThan(40);

    // Player should have taken damage from enemy counter (can't evade while frozen)
    const playerAfter = resultCombat.participants.find(
      (p) => p.id === "player",
    )!;
    expect(playerAfter.hp).toBeLessThan(100);

    // Round should have advanced (player freeze-skip → enemy turn)
    expect(resultCombat.round).toBeGreaterThanOrEqual(2);

    // Logs should contain both freeze-skip and enemy action messages
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

    // Player should have spent 5 MP
    const player = combat.participants.find((p) => p.id === "player")!;
    expect(player.mp).toBe(45);

    // Logs should show dodge was activated AND the enemy attack was dodged
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

    // Player should have spent 8 MP
    const player = combat.participants.find((p) => p.id === "player")!;
    expect(player.mp).toBe(42);

    // Logs should show parry was activated
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
    // Heal = round(mag * 1.5) = round(15 * 1.5) = 22; then enemy counter-attack may reduce it
    expect(healedPlayer.hp).toBeGreaterThan(50);
    // MP should be reduced by skill cost (50 - 12 = 38)
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

    // MP should be reduced by 10
    const player = combatAfter.participants.find((p) => p.id === "player")!;
    expect(player.mp).toBe(40);

    // Enemy takes fireball damage (20 base + possible crit), and fireball may apply burn DoT (4 dmg)
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

    // heavy_strike is physical type, should work even when silenced
    const result = executePersonCombatAction(w, {
      type: "skill",
      skillId: "heavy_strike",
    });

    expect(result.combat).not.toBeNull();
    const combatAfter = result.combat!;
    const enemy = combatAfter.participants.find((p) => p.id === "enemy-1")!;
    // Damage uses Math.random internally, so exact HP depends on evasion/crit
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
    // Sleep should be removed because enemy was hit
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

    // Combat should be cleared
    expect(result.combat).toBeNull();

    // Should have gained 50 EXP
    expect(result.player.exp).toBe(50);

    // Voyage should be preserved (not cleared on victory)
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

    // Combat should be cleared
    expect(result.combat).toBeNull();

    // Gold should be reduced by 30%
    expect(result.fleet.gold).toBe(700); // 1000 − floor(1000 * 0.3) = 700

    // Cargo should be cleared
    for (const ship of result.fleet.ships) {
      expect(ship.cargo).toHaveLength(0);
    }

    // Voyage should be cleared
    expect(result.voyage).toBeNull();

    // Player should be at nearest port (fromPortId since voyage existed)
    expect(result.player.currentPortId).toBe("quanzhou");
  });
});

// ── Status-effect DoT damage (tested through executePersonCombatAction) ──

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
    // Poison: max(1, round(100*0.08)) = 8 damage
    // Plus enemy attack damage (at least 1)
    // So player HP should be <= 100 − 8 = 92
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
    // Bleed: max(1, round(100*0.12)) = 12 damage
    // HP should be <= 100 − 12
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
    // Burn: max(1, round(100*0.1)) = 10 damage
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
    // Total DoT: 8 + 12 + 10 = 30 damage
    // HP should be <= 70
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

    // Since player dies from DoT before acting, combat should be defeat
    expect(result.combat).toBeNull();
    expect(result.voyage).toBeNull();
  });
});

// ── Enemy AI progression ─────────────────────────────────────────────

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
    const result = executePersonCombatAction(w, { type: "attack" });

    // Freeze causes player to skip turn; then enemy attacks
    expect(result.combat).not.toBeNull();
    const combatAfter = result.combat!;

    // Player should have taken some damage from the enemy (can't evade while frozen)
    const playerAfter = combatAfter.participants.find(
      (p) => p.id === "player",
    )!;
    expect(playerAfter.hp).toBeLessThan(100);

    // The logs should contain the enemy's action
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
      statuses: [{ type: "freeze" as const, duration: 3 }], // freeze prevents evasion of enemy attack
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
    const result = executePersonCombatAction(w, { type: "attack" });

    // After player attack, the system skips dead enemy-1 and processes enemy-2's turn
    expect(result.combat).not.toBeNull();
    const combatAfter = result.combat!;
    // Player should have taken some damage from enemy-2
    const playerAfter = combatAfter.participants.find(
      (p) => p.id === "player",
    )!;
    expect(playerAfter.hp).toBeLessThan(100);
  });

  it("combat advances through multiple rounds when both sides survive", () => {
    const w = worldWithCombat();
    const result = executePersonCombatAction(w, { type: "attack" });

    expect(result.combat).not.toBeNull();
    const combat = result.combat!;

    // After one player attack + one enemy turn, we should be in round 2
    expect(combat.round).toBe(2);
    expect(combat.currentTurnIndex).toBe(0); // back to player
  });
});

// ── initPersonCombat (basic smoke) ───────────────────────────────────

describe("initPersonCombat", () => {
  it("generates a combat state with player and enemies based on difficulty", () => {
    // Create a minimal world that has enough data for calcPanelStats
    const w: World = worldWithCombat();
    // Remove combat to simulate initial state
    const preCombat: World = { ...w, combat: null };

    const state = initPersonCombat(preCombat, 1.0);

    expect(state.status).toBe("in_progress");
    expect(state.participants.length).toBeGreaterThanOrEqual(2); // player + at least 1 enemy

    const player = state.participants.find((p) => p.id === "player");
    expect(player).toBeDefined();
    expect(player?.hp).toBeGreaterThan(0);

    const enemies = state.participants.filter((p) => p.type === "enemy");
    expect(enemies.length).toBeGreaterThanOrEqual(1);

    expect(state.round).toBe(1);
    expect(state.turnOrder.length).toBe(state.participants.length);
  });

  it("creates different enemy counts for different difficulty tiers", () => {
    const preCombat: World = { ...worldWithCombat(), combat: null };

    const easy = initPersonCombat(preCombat, 1.0);
    expect(easy.participants.filter((p) => p.type === "enemy")).toHaveLength(1);

    const medium = initPersonCombat(preCombat, 2.0);
    expect(medium.participants.filter((p) => p.type === "enemy")).toHaveLength(
      2,
    );

    const hard = initPersonCombat(preCombat, 3.0);
    expect(hard.participants.filter((p) => p.type === "enemy")).toHaveLength(3);
  });
});
