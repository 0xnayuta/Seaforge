import { describe, expect, it } from "bun:test";
import { calcInitiative } from "../combat-person";
import { part } from "./combat-person.helpers";

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
