import { describe, expect, it } from "bun:test";
import { initPersonCombat } from "../combat-person";
import type { World } from "../types";
import { worldWithCombat } from "./combat-person.helpers";

describe("initPersonCombat", () => {
  it("generates a combat state with player and enemies based on difficulty", () => {
    const w: World = worldWithCombat();
    const preCombat: World = { ...w, combat: null };

    const state = initPersonCombat(preCombat, 1.0);

    expect(state.status).toBe("in_progress");
    expect(state.participants.length).toBeGreaterThanOrEqual(2);

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
