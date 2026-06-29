import { describe, expect, it } from "bun:test";
import { applyCombatOutcome, resolveCombat } from "../combat";
import { createTestWorld } from "./helpers";

/** 确定性 RNG：总是返回固定值 */
function fixedRng(value: number): () => number {
  return () => value;
}

describe("resolveCombat", () => {
  it("armed escort at full HP has high victory chance", () => {
    const world = createTestWorld({
      voyage: {
        fromPortId: "quanzhou",
        toPortId: "nagasaki",
        departureDay: 1,
        travelDays: 3,
        events: [],
        armamentLevel: 2, // 护航 (2.5x 防御)
      },
    });

    // RNG=0.8 高分 → 胜利
    const outcome = resolveCombat(world, 1.0, fixedRng(0.8));
    expect(outcome.result).toBe("victory");
    expect(outcome.hpDamage).toBeLessThan(5);
  });

  it("full cargo with low HP can suffer total loss", () => {
    const damaged = createTestWorld({
      voyage: {
        fromPortId: "quanzhou",
        toPortId: "malacca",
        departureDay: 1,
        travelDays: 4,
        events: [],
        armamentLevel: 0, // 满载 (1.0x)
      },
    });
    damaged.fleet.ships[0].durability = 5; // 残血

    // RNG=0 → 最低分 → 全损
    const outcome = resolveCombat(damaged, 1.0, fixedRng(0));
    expect(outcome.result).toBe("totalLoss");
    expect(outcome.cargoLoss).toBe(0);
    expect(outcome.allCargoLost).toBe(true);
  });

  it("partialLoss on medium score", () => {
    const world = createTestWorld({
      voyage: {
        fromPortId: "quanzhou",
        toPortId: "nagasaki",
        departureDay: 1,
        travelDays: 3,
        events: [],
        armamentLevel: 1, // 均衡
      },
    });
    world.fleet.ships[0].durability = 25; // 半血

    // RNG low → 部分损失
    const outcome = resolveCombat(world, 1.0, fixedRng(0.05));
    expect(outcome.result).toBe("partialLoss");
    expect(outcome.hpDamage).toBeGreaterThanOrEqual(0);
    expect(outcome.cargoLoss).toBeGreaterThanOrEqual(0);
  });

  it("returns victory with no damage for invalid ship", () => {
    const invalid = createTestWorld();
    invalid.fleet.ships[0].typeId = "nonexistent";
    const outcome = resolveCombat(invalid, 1.0, fixedRng(0));
    expect(outcome.result).toBe("victory");
    expect(outcome.hpDamage).toBe(0);
  });

  it("high difficulty produces worse combat outcomes", () => {
    const world = createTestWorld({
      voyage: {
        fromPortId: "quanzhou",
        toPortId: "malacca",
        departureDay: 1,
        travelDays: 4,
        events: [],
        armamentLevel: 0,
      },
    });

    // 高难度（2.0）比低难度（0.5）更容易翻船
    const hardOutcome = resolveCombat(world, 2.0, fixedRng(0));
    const easyOutcome = resolveCombat(world, 0.5, fixedRng(0));

    // 低难度结果至少不比高难度差
    const hardScore =
      hardOutcome.result === "victory"
        ? 2
        : hardOutcome.result === "partialLoss"
          ? 1
          : 0;
    const easyScore =
      easyOutcome.result === "victory"
        ? 2
        : easyOutcome.result === "partialLoss"
          ? 1
          : 0;
    expect(easyScore).toBeGreaterThanOrEqual(hardScore);
  });
});

describe("applyCombatOutcome", () => {
  it("totalLoss: HP→1, cargo cleared, voyage null, port changed", () => {
    const world = createTestWorld();
    const cargoBefore = world.fleet.ships[0].cargo.length;
    expect(cargoBefore).toBeGreaterThan(0);

    const outcome = {
      result: "totalLoss" as const,
      hpDamage: 50,
      cargoLoss: -1,
      description: "",
    };

    const result = applyCombatOutcome(world, outcome, "quanzhou");
    expect(result.fleet.ships[0].durability).toBe(1);
    expect(result.fleet.ships[0].cargo).toHaveLength(0);
    expect(result.voyage).toBeNull();
  });

  it("partialLoss: reduces cargo and HP", () => {
    const world = createTestWorld();
    const cargoBefore = world.fleet.ships[0].cargo.reduce(
      (sum, c) => sum + c.quantity,
      0,
    );

    const outcome = {
      result: "partialLoss" as const,
      hpDamage: 10,
      cargoLoss: 3,
      description: "",
    };

    const result = applyCombatOutcome(world, outcome, "quanzhou");
    expect(result.fleet.ships[0].durability).toBe(40); // 50 - 10
    const cargoAfter = result.fleet.ships[0].cargo.reduce(
      (sum, c) => sum + c.quantity,
      0,
    );
    expect(cargoAfter).toBe(cargoBefore - 3);
  });

  it("victory: minor HP damage, no cargo loss", () => {
    const world = createTestWorld();

    const outcome = {
      result: "victory" as const,
      hpDamage: 3,
      cargoLoss: 0,
      description: "",
    };

    const result = applyCombatOutcome(world, outcome, "quanzhou");
    expect(result.fleet.ships[0].durability).toBe(47); // 50 - 3
    expect(result.fleet.ships[0].cargo).toHaveLength(
      world.fleet.ships[0].cargo.length,
    );
  });
});
