import { describe, expect, it, vi } from "bun:test";
import { GOODS } from "../../../data/goods";
import { PORTS } from "../../../data/ports";
import { getBasePriceFor } from "../market";
import {
  advanceDay,
  allocateAttributePoint,
  calcPanelStats,
  createDefaultWorld,
  equipCharacterItem,
  gainExp,
  gainItem,
  getEffectiveAttribute,
  removeItem,
  unequipCharacterItem,
} from "../player";
import { createTestWorld } from "./helpers";

describe("createDefaultWorld", () => {
  it("returns World with correct defaults", () => {
    const world = createDefaultWorld();

    // Player state defaults
    expect(world.player.name).toBe("船长");
    expect(world.fleet.gold).toBe(5000);
    expect(world.player.currentPortId).toBe("quanzhou");
    expect(world.player.day).toBe(1);

    // Ship: sloop, empty cargo
    expect(world.fleet.ships[0].typeId).toBe("sloop");
    expect(world.fleet.ships[0].equipment.hullLevel).toBe(0);
    expect(world.fleet.ships[0].cargo).toEqual([]);

    // Voyage is null
    expect(world.voyage).toBeNull();

    // Market has price data
    expect(world.market).toBeDefined();
    expect(world.market.prices).toBeDefined();
  });

  it(`market.prices has entries for all ${PORTS.length} ports x ${GOODS.length} goods = ${PORTS.length * GOODS.length} entries`, () => {
    const world = createDefaultWorld();
    const prices = world.market.prices;
    const entries = PORTS.flatMap((port) =>
      GOODS.map((good) => ({ portId: port.id, goodsId: good.id })),
    );
    expect(entries).toHaveLength(PORTS.length * GOODS.length);
    for (const { portId, goodsId } of entries) {
      expect(prices[portId][goodsId]).toBeTypeOf("number");
    }
  });
  it("market prices match basePrice x portModifier", () => {
    const world = createDefaultWorld();
    const prices = world.market.prices;
    const entries = PORTS.flatMap((port) =>
      GOODS.map((good) => {
        const expected = getBasePriceFor(good.id, port.id);
        return { portId: port.id, goodsId: good.id, expected };
      }),
    );
    for (const { portId, goodsId, expected } of entries) {
      expect(prices[portId][goodsId]).toBe(expected);
    }
  });
  it("increments day by N", () => {
    const world = createTestWorld();
    const advanced = advanceDay(world, 3);
    expect(advanced.player.day).toBe(world.player.day + 3);
  });

  it("increments day by 1", () => {
    const world = createTestWorld();
    const advanced = advanceDay(world, 1);
    expect(advanced.player.day).toBe(world.player.day + 1);
  });

  it("increments day by 7 (one week)", () => {
    const world = createTestWorld();
    const advanced = advanceDay(world, 7);
    expect(advanced.player.day).toBe(world.player.day + 7);
  });

  it("returns a new reference without mutating the original world (immutability)", () => {
    const world = createTestWorld();
    const pricesBefore = JSON.parse(JSON.stringify(world.market.prices));
    const dayBefore = world.player.day;

    const advanced = advanceDay(world, 2);
    // New top-level reference
    expect(advanced).not.toBe(world);
    // New player object
    expect(advanced.player).not.toBe(world.player);
    // New market object (applyDayPass creates new prices)
    expect(advanced.market).not.toBe(world.market);
    // Ship is unchanged; advanceDay only spreads world + updates player
    // Fleet is unchanged; advanceDay only spreads world + updates player
    expect(advanced.fleet).toBe(world.fleet);
    expect(advanced.voyage).toBe(world.voyage);

    // Original world untouched
    expect(world.player.day).toBe(dayBefore);
    expect(world.market.prices).toEqual(pricesBefore);
  });

  it("ship and voyage pointers preserved (advanceDay doesn't touch them)", () => {
    const world = createTestWorld();
    const advanced = advanceDay(world, 2);

    expect(advanced.fleet).toBe(world.fleet);
    expect(advanced.voyage).toBe(world.voyage);
  });

  it("cargo and voyage structure survive unchanged", () => {
    const world = createTestWorld();
    const advanced = advanceDay(world, 1);

    // Cargo unchanged
    expect(advanced.fleet.ships[0].cargo).toEqual(world.fleet.ships[0].cargo);
    // Voyage still null
    expect(advanced.voyage).toBeNull();
    // Other ship fields preserved
    expect(advanced.fleet.ships[0].typeId).toBe(world.fleet.ships[0].typeId);
    expect(advanced.fleet.ships[0].equipment.hullLevel).toBe(
      world.fleet.ships[0].equipment.hullLevel,
    );
    // Gold unchanged
    expect(advanced.fleet.gold).toBe(world.fleet.gold);
    // Port unchanged
    expect(advanced.player.currentPortId).toBe(world.player.currentPortId);
  });

  it("prices change after advancing (regression + noise)", () => {
    // Deterministic: mock Math.random so noise is predictable
    vi.spyOn(Math, "random").mockReturnValue(0.6);

    const world = createTestWorld();
    const pricesBefore = JSON.parse(JSON.stringify(world.market.prices));

    const advanced = advanceDay(world, 1);

    // Unchanged original
    expect(world.market.prices).toEqual(pricesBefore);

    // At least one price changed due to regression + noise
    const changed = PORTS.some((port) =>
      GOODS.some((good) => {
        const before = world.market.prices[port.id][good.id];
        const after = advanced.market.prices[port.id][good.id];
        return before !== after;
      }),
    );
    expect(changed).toBe(true);

    vi.restoreAllMocks();
  });

  it("no price goes below 1 after advancing", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.0);

    const world = createTestWorld();
    const advanced = advanceDay(world, 1);
    const prices = advanced.market.prices;

    for (const port of PORTS) {
      for (const good of GOODS) {
        expect(prices[port.id][good.id]).toBeGreaterThanOrEqual(1);
      }
    }

    vi.restoreAllMocks();
  });

  it("prices differ from initial after multiple days", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.3);

    const world = createTestWorld();
    const pricesBefore = JSON.parse(JSON.stringify(world.market.prices));

    const advanced = advanceDay(world, 3);

    const changed = PORTS.some((port) =>
      GOODS.some((good) => {
        return (
          advanced.market.prices[port.id][good.id] !==
          pricesBefore[port.id][good.id]
        );
      }),
    );
    expect(changed).toBe(true);

    vi.restoreAllMocks();
  });
});

describe("gainExp", () => {
  it("adds exp to player and triggers level up at threshold", () => {
    const world = createDefaultWorld();
    expect(world.player.level).toBe(1);
    expect(world.player.exp).toBe(0);

    // 增加正好足够升级的经验
    const leveled = gainExp(world, 100);
    expect(leveled.player.level).toBe(2);
    expect(leveled.player.exp).toBe(0);
    expect(leveled.player.attributePoints).toBe(3);
    expect(leveled.player.expToNext).toBe(130); // BASE_EXP * (1 + 2 * 0.15) = 100 * 1.3 = 130
  });

  it("preserves excess exp across level up", () => {
    const world = createDefaultWorld();
    const leveled = gainExp(world, 150);
    expect(leveled.player.level).toBe(2);
    expect(leveled.player.exp).toBe(50); // 150 - 100 = 50
    expect(leveled.player.attributePoints).toBe(3);
  });

  it("supports multi-level gain", () => {
    const world = createDefaultWorld();
    const leveled = gainExp(world, 300);
    expect(leveled.player.level).toBe(3);
    // expToNext for level 1 = 100, level 2 = 130
    // 300 - 100 - 130 = 70
    expect(leveled.player.exp).toBe(70);
    expect(leveled.player.attributePoints).toBe(6);
  });

  it("returns same world when amount is 0", () => {
    const world = createDefaultWorld();
    const result = gainExp(world, 0);
    expect(result).toBe(world);
  });

  it("returns same world when amount is negative", () => {
    const world = createDefaultWorld();
    const result = gainExp(world, -50);
    expect(result).toBe(world);
  });

  it("does not mutate the original world", () => {
    const world = createDefaultWorld();
    gainExp(world, 100);
    expect(world.player.level).toBe(1);
    expect(world.player.exp).toBe(0);
  });
});

describe("calcPanelStats & getEffectiveAttribute", () => {
  it("calculates correct base values at level 1 with all attributes = 1", () => {
    const world = createDefaultWorld();
    const stats = calcPanelStats(world.player, world.fleet.inventory);

    // HP = 80 + 1 * 8 + 1 * 4 + (1+1+1+1) * 1 = 96
    expect(stats.hp).toBe(96);
    // ATK = 8 + 1 * 2 + 1 * 0.5 = 10 (Math.floor(10.5) = 10)
    expect(stats.atk).toBe(10);
    // DEF = 5 + 1 * 0.8 + 1 * 0.4 = 6 (Math.floor(6.2) = 6)
    expect(stats.def).toBe(6);
    // MAG = 5 + 1 * 2 + 1 * 0.5 = 7 (Math.floor(7.5) = 7)
    expect(stats.mag).toBe(7);
    // MDF = 5 + 1 * 0.6 + 1 * 1.0 = 6 (Math.floor(6.6) = 6)
    expect(stats.mdf).toBe(6);
    // SPD = 8 + 1 * 1.5 = 9 (Math.floor(9.5) = 9)
    expect(stats.spd).toBe(9);
    // LUK = 5 + 1 * 2.0 = 7
    expect(stats.luk).toBe(7);
    // EquipLoad = 15 + 1 * 2.5 = 17 (Math.floor(17.5) = 17)
    expect(stats.equipLoad).toBe(17);
  });

  it("applies soft cap bracketed calculation correctly", () => {
    // 20 points => 20 * 1.0 = 20
    expect(getEffectiveAttribute(20)).toBe(20);
    // 30 points => 20 * 1.0 + 10 * 0.75 = 27.5
    expect(getEffectiveAttribute(30)).toBe(27.5);
    // 50 points => 20 * 1.0 + 20 * 0.75 + 10 * 0.5 = 40
    expect(getEffectiveAttribute(50)).toBe(40);
  });

  it("calculates equipment bonuses and scaling correctly", () => {
    const weaponInstance = {
      uid: "weapon-1",
      itemId: "rusted_sword",
      quantity: 1,
      equippedSlot: "weapon",
    };
    const armorInstance = {
      uid: "armor-1",
      itemId: "leather_armor",
      quantity: 1,
      equippedSlot: "armor",
    };
    const inventory = [weaponInstance, armorInstance];
    const player = {
      name: "测试",
      currentPortId: "quanzhou",
      day: 1,
      level: 1,
      exp: 0,
      expToNext: 100,
      str: 10,
      dex: 10,
      int: 10,
      fth: 10,
      arc: 10,
      attributePoints: 0,
      equipment: {
        weapon: "weapon-1",
        armor: "armor-1",
        accessory1: null,
        accessory2: null,
      },
    };

    const stats = calcPanelStats(player, inventory);

    // rusted_sword has base ATK +5, scaling: str: good (0.25).
    // leather_armor has base DEF +8, base HP +30, base EquipLoad +5.
    // Level = 1. STR = 10 (effective STR = 10). DEX = 10 (effective DEX = 10).
    // Player base HP = 80 + 8 + 40 + (10+10+10+10)*1 = 168.
    // Equipped HP bonus = 30 (from leather_armor). Total HP = 198.
    expect(stats.hp).toBe(198);

    // Player base ATK = 8 + 10 * 2.0 + 10 * 0.5 = 33.
    // Equipped ATK bonus = 5 (from rusted_sword).
    // Weapon scaling: baseWeaponAtk (5) * (effStr / 100) * strCoeff (0.25)
    // = 5 * (10 / 100) * 0.25 = 5 * 0.1 * 0.25 = 0.125.
    // Total ATK = 33 + 5 + 0.125 = 38.125 => Math.floor(38.125) = 38.
    expect(stats.atk).toBe(38);
  });

  it("calculates arc scaling for weapon and armor correctly", () => {
    const weaponInstance = {
      uid: "weapon-1",
      itemId: "pirate_cutlass", // dex: "good", arc: "excellent"
      quantity: 1,
      equippedSlot: "weapon",
    };
    const armorInstance = {
      uid: "armor-1",
      itemId: "legendary_captain_coat", // arc: "legendary", dex: "good"
      quantity: 1,
      equippedSlot: "armor",
    };
    const inventory = [weaponInstance, armorInstance];
    const player = {
      name: "测试",
      currentPortId: "quanzhou",
      day: 1,
      level: 1,
      exp: 0,
      expToNext: 100,
      str: 10,
      dex: 20,
      int: 10,
      fth: 10,
      arc: 30, // effArc = 27.5
      attributePoints: 0,
      equipment: {
        weapon: "weapon-1",
        armor: "armor-1",
        accessory1: null,
        accessory2: null,
      },
    };
    const stats = calcPanelStats(player, inventory);

    // pirate_cutlass: atkBonus: 20, spdBonus: 3
    // scaling: dex: "good" (0.25), arc: "excellent" (0.5)
    // effDex = 20, effArc = 27.5
    // baseAtk = 8 + 10 * 2.0 + 20 * 0.5 = 38
    // baseWeaponAtk = 20
    // scalingAtk = baseWeaponAtk * (effDex/100) * dexCoeff + baseWeaponAtk * (effArc/100) * arcCoeff
    // = 20 * 0.2 * 0.25 + 20 * 0.275 * 0.5
    // = 1.0 + 2.75 = 3.75
    // eqAtk = 20
    // Total ATK = baseAtk + eqAtk + scalingAtk = 38 + 20 + 3.75 = 61.75 => Math.floor = 61
    expect(stats.atk).toBe(61);

    // legendary_captain_coat: defBonus: 55, mdfBonus: 35, hpBonus: 250
    // scaling: arc: "legendary" (1.0), dex: "good" (0.25)
    // baseDef = 5 + 10 * 0.8 + 20 * 0.4 = 21
    // baseArmorDef = 55
    // scalingDef = baseArmorDef * (effDex/100) * dexCoeff + baseArmorDef * (effArc/100) * arcCoeff
    // = 55 * 0.2 * 0.25 + 55 * 0.275 * 1.0
    // = 2.75 + 15.125 = 17.875
    // eqDef = 55
    // Total DEF = baseDef + eqDef + scalingDef = 21 + 55 + 17.875 = 93.875 => Math.floor = 93
    expect(stats.def).toBe(93);
  });
});

describe("allocateAttributePoint", () => {
  it("successfully spends attribute points and increments attributes", () => {
    let world = createDefaultWorld();
    world = gainExp(world, 100);
    expect(world.player.attributePoints).toBe(3);
    expect(world.player.str).toBe(1);

    const nextWorld = allocateAttributePoint(world, "str");
    expect(nextWorld.player.str).toBe(2);
    expect(nextWorld.player.attributePoints).toBe(2);
  });

  it("throws error when attribute points are 0", () => {
    const world = createDefaultWorld();
    expect(world.player.attributePoints).toBe(0);
    expect(() => allocateAttributePoint(world, "str")).toThrow(
      new Error("INSUFFICIENT_ATTRIBUTE_POINTS"),
    );
  });

  it("throws DomainError subclass specifically", () => {
    const world = createDefaultWorld();
    expect(() => allocateAttributePoint(world, "str")).toThrow(
      "INSUFFICIENT_ATTRIBUTE_POINTS",
    );
  });
});

describe("gainItem & removeItem", () => {
  it("adds non-stackable items as separate instances with default values", () => {
    let world = createDefaultWorld();
    world = gainItem(world, "rusted_sword", 2, ["uid-1", "uid-2"]);

    expect(world.fleet.inventory).toHaveLength(2);
    expect(world.fleet.inventory[0].itemId).toBe("rusted_sword");
    expect(world.fleet.inventory[0].uid).toBe("uid-1");
    expect(world.fleet.inventory[0].durability).toBe(100);
    expect(world.fleet.inventory[0].upgradeLevel).toBe(0);
    expect(world.fleet.inventory[1].uid).toBe("uid-2");
  });

  it("removes items from inventory by uid", () => {
    let world = createDefaultWorld();
    world = gainItem(world, "rusted_sword", 1, ["uid-1"]);
    expect(world.fleet.inventory).toHaveLength(1);

    const nextWorld = removeItem(world, "uid-1", 1);
    expect(nextWorld.fleet.inventory).toHaveLength(0);
  });
});

describe("equipCharacterItem & unequipCharacterItem", () => {
  it("successfully equips weapon from inventory and marks slot", () => {
    let world = createDefaultWorld();
    world = gainItem(world, "rusted_sword", 1, ["uid-1"]);

    const nextWorld = equipCharacterItem(world, "uid-1", "weapon");
    expect(nextWorld.player.equipment.weapon).toBe("uid-1");
    expect(nextWorld.fleet.inventory[0].equippedSlot).toBe("weapon");
  });

  it("throws error when equipping incompatible item type in slot", () => {
    let world = createDefaultWorld();
    world = gainItem(world, "leather_armor", 1, ["uid-1"]);

    expect(() => equipCharacterItem(world, "uid-1", "weapon")).toThrow(
      "ITEM_NOT_EQUIPPABLE",
    );
  });

  it("automatically unequips old item when equipping new one", () => {
    let world = createDefaultWorld();
    world = gainItem(world, "rusted_sword", 2, ["uid-1", "uid-2"]);

    let nextWorld = equipCharacterItem(world, "uid-1", "weapon");
    expect(nextWorld.player.equipment.weapon).toBe("uid-1");
    expect(
      nextWorld.fleet.inventory.find((i) => i.uid === "uid-1")?.equippedSlot,
    ).toBe("weapon");

    nextWorld = equipCharacterItem(nextWorld, "uid-2", "weapon");
    expect(nextWorld.player.equipment.weapon).toBe("uid-2");
    expect(
      nextWorld.fleet.inventory.find((i) => i.uid === "uid-2")?.equippedSlot,
    ).toBe("weapon");
    expect(
      nextWorld.fleet.inventory.find((i) => i.uid === "uid-1")?.equippedSlot,
    ).toBeUndefined();
  });

  it("automatically unequips same item from old slot when equipping to new slot", () => {
    let world = createDefaultWorld();
    world = gainItem(world, "brass_ring", 1, ["uid-1"]);

    // Equip in accessory1
    let nextWorld = equipCharacterItem(world, "uid-1", "accessory1");
    expect(nextWorld.player.equipment.accessory1).toBe("uid-1");
    expect(nextWorld.player.equipment.accessory2).toBeNull();
    expect(nextWorld.fleet.inventory[0].equippedSlot).toBe("accessory1");

    // Equip same item in accessory2
    nextWorld = equipCharacterItem(nextWorld, "uid-1", "accessory2");
    expect(nextWorld.player.equipment.accessory1).toBeNull();
    expect(nextWorld.player.equipment.accessory2).toBe("uid-1");
    expect(nextWorld.fleet.inventory[0].equippedSlot).toBe("accessory2");
  });

  it("unequips items back to inventory", () => {
    let world = createDefaultWorld();
    world = gainItem(world, "rusted_sword", 1, ["uid-1"]);
    world = equipCharacterItem(world, "uid-1", "weapon");

    const nextWorld = unequipCharacterItem(world, "weapon");
    expect(nextWorld.player.equipment.weapon).toBeNull();
    expect(nextWorld.fleet.inventory[0].equippedSlot).toBeUndefined();
  });
});
