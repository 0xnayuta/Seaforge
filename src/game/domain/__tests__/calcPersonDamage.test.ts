import { describe, expect, it } from "bun:test";
import { SKILLS } from "../../../data/skills";
import { calcPersonDamage } from "../combat-person";
import { fixedRng, part } from "./combat-person.helpers";

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
    expect(result.damage).toBe(20);
  });

  it("magical: max(1, round(mag × power − mdf))", () => {
    const fireball = SKILLS.find((s) => s.id === "fireball")!;
    const result = calcPersonDamage(
      part({ mag: 20 }),
      part({ mdf: 10, spd: 1, luk: 0 }),
      fireball,
      fixedRng(0.5),
    );
    expect(result.damage).toBe(20);
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
    expect(result.damage).toBe(13);
  });

  // ── crit ──
  it("crits when rng < attacker.luk × 0.01, dealing 1.5× floor", () => {
    const result = calcPersonDamage(
      part({ atk: 100, luk: 99 }),
      part({ def: 0, luk: 0, spd: 1 }),
      null,
      fixedRng(0.1),
    );
    expect(result.isCrit).toBe(true);
    expect(result.damage).toBe(150);
  });

  it("does not crit when rng >= luk × 0.01", () => {
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
