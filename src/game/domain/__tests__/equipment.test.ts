import { describe, expect, it } from "bun:test";
import { SHIPS } from "../../../data/ships";
import {
  buyEquipment,
  equipItem,
  getShipCargoCapacity,
  getShipDefenseMultiplier,
  getShipSpeed,
  sellEquipment,
  unequipItem,
} from "../equipment";
import { sellShip } from "../ship";
import { DomainError } from "../types";
import { applyVoyageEvents, type VoyageEvent } from "../voyage";
import { createEmptyWorld, createTestWorld } from "./helpers";

describe("装备系统领域逻辑", () => {
  describe("购买装备 (buyEquipment)", () => {
    it("正常购买 - 扣减金币，加入背包", () => {
      const world = createTestWorld(); // 泉州，金币 5000，泉州有售 "high_speed_sail" (price: 5000)
      const nextWorld = buyEquipment(world, "high_speed_sail");

      expect(nextWorld.fleet.gold).toBe(0);
      expect(nextWorld.fleet.shipEquipmentInventory).toContain(
        "high_speed_sail",
      );
    });

    it("金币不足抛错", () => {
      const world = createTestWorld({
        fleet: {
          ...createTestWorld().fleet,
          gold: 1000,
        },
      });

      expect(() => buyEquipment(world, "high_speed_sail")).toThrow(
        new DomainError("INSUFFICIENT_GOLD"),
      );
    });

    it("不在售卖港口抛错", () => {
      const world = createEmptyWorld(); // 马六甲，有 10000 金币，"gale_sail" 在长崎/威尼斯售卖
      expect(() => buyEquipment(world, "gale_sail")).toThrow(
        new DomainError("NOT_AT_PORT"),
      );
    });
  });

  describe("出售装备 (sellEquipment)", () => {
    it("出售未装配装备 - 增加折半金币，从背包移除", () => {
      const world = createTestWorld({
        fleet: {
          ...createTestWorld().fleet,
          shipEquipmentInventory: ["high_speed_sail"],
          gold: 1000,
        },
      });

      const nextWorld = sellEquipment(world, "high_speed_sail");
      expect(nextWorld.fleet.gold).toBe(3500); // 1000 + 5000 * 0.5
      expect(nextWorld.fleet.shipEquipmentInventory).not.toContain(
        "high_speed_sail",
      );
    });

    it("出售不存在的装备抛错", () => {
      const world = createTestWorld();
      expect(() => sellEquipment(world, "high_speed_sail")).toThrow(
        new DomainError("EQUIPMENT_NOT_FOUND"),
      );
    });
  });

  describe("装配与卸下 (equipItem / unequipItem)", () => {
    it("正常装配并提升耐久 - 移出背包，装配在船上，修改 durability/maxDurability", () => {
      const world = createTestWorld({
        fleet: {
          ...createTestWorld().fleet,
          shipEquipmentInventory: ["armor_iron"], // 铁甲板, durabilityBonus: 20
        },
      });

      const nextWorld = equipItem(world, "ship-1", "armor_iron");
      const ship = nextWorld.fleet.ships[0];

      expect(nextWorld.fleet.shipEquipmentInventory).not.toContain(
        "armor_iron",
      );
      expect(ship.equippedItems).toContain("armor_iron");
      expect(ship.maxDurability).toBe(70); // 50 + 20
      expect(ship.durability).toBe(70); // 50 + 20
    });

    it("槽位满 3 个时装配抛错", () => {
      const world = createTestWorld({
        fleet: {
          ...createTestWorld().fleet,
          shipEquipmentInventory: ["cargo_reinforcement"],
          ships: [
            {
              ...createTestWorld().fleet.ships[0],
              equippedItems: ["high_speed_sail", "cannon_light", "armor_iron"],
            },
          ],
        },
      });

      expect(() => equipItem(world, "ship-1", "cargo_reinforcement")).toThrow(
        new DomainError("EQUIPMENT_SLOT_FULL"),
      );
    });

    it("重复相同类型的装备抛错", () => {
      const world = createTestWorld({
        fleet: {
          ...createTestWorld().fleet,
          shipEquipmentInventory: ["gale_sail"], // Gale Sail (sail type)
          ships: [
            {
              ...createTestWorld().fleet.ships[0],
              equippedItems: ["high_speed_sail"], // High Speed Sail (sail type)
            },
          ],
        },
      });

      expect(() => equipItem(world, "ship-1", "gale_sail")).toThrow(
        new DomainError("DUPLICATE_EQUIPMENT_TYPE"),
      );
    });

    it("正常卸载并扣减上限 - 移入背包，从船上移除，降低 maxDurability", () => {
      const world = createTestWorld({
        fleet: {
          ...createTestWorld().fleet,
          ships: [
            {
              ...createTestWorld().fleet.ships[0],
              equippedItems: ["armor_iron"],
              durability: 70,
              maxDurability: 70,
            },
          ],
        },
      });

      const nextWorld = unequipItem(world, "ship-1", "armor_iron");
      const ship = nextWorld.fleet.ships[0];

      expect(nextWorld.fleet.shipEquipmentInventory).toContain("armor_iron");
      expect(ship.equippedItems).not.toContain("armor_iron");
      expect(ship.maxDurability).toBe(50);
      expect(ship.durability).toBe(50);
    });

    it("卸下特殊舱容装备导致货物量超载抛错", () => {
      // 拥有 35 舱容，装载了 20 舱容货物。
      // 如果我们卸载「货舱加固」 (capacityBonus: 10)。
      // 假设这艘船基础容量是 10，装了铁匠铺加固加到 20。
      // 下面来构造测试用例：
      const world = createTestWorld({
        fleet: {
          ...createTestWorld().fleet,
          ships: [
            {
              ...createTestWorld().fleet.ships[0],
              typeId: "sloop", // base capacity 35
              equippedItems: ["cargo_reinforcement"], // capacityBonus: 10. Total capacity: 45
              cargo: [
                { goodsId: "silk", quantity: 20, buyPrice: 100 }, // volume is 2. Total cargo count = 40
              ],
            },
          ],
        },
      });

      // 40 货物体积 > 卸下后的有效容量 (35)
      expect(() => unequipItem(world, "ship-1", "cargo_reinforcement")).toThrow(
        new DomainError("CARGO_EXCEEDS_CAPACITY"),
      );
    });
    it("卸下防具导致耐久上限与当前耐久同步扣减，且不低于 1", () => {
      // 构造一个受损的船只装配了铁甲板 (+20)
      // 基础 max 50, 受损后 durability 10 -> 装配后 30/70.
      // 卸下后应该变回 10/50.
      const world1 = createTestWorld({
        fleet: {
          ...createTestWorld().fleet,
          ships: [
            {
              ...createTestWorld().fleet.ships[0],
              equippedItems: ["armor_iron"],
              durability: 30,
              maxDurability: 70,
            },
          ],
        },
      });

      const nextWorld1 = unequipItem(world1, "ship-1", "armor_iron");
      const ship1 = nextWorld1.fleet.ships[0];
      expect(ship1.maxDurability).toBe(50);
      expect(ship1.durability).toBe(10); // 30 - 20 = 10

      // 构造另一个极度受损的船只：装配后 5/70
      // 卸下后 5 - 20 = -15 -> 应该被 Math.max(1, ...) 限制在 1/50
      const world2 = createTestWorld({
        fleet: {
          ...createTestWorld().fleet,
          ships: [
            {
              ...createTestWorld().fleet.ships[0],
              equippedItems: ["armor_iron"],
              durability: 5,
              maxDurability: 70,
            },
          ],
        },
      });

      const nextWorld2 = unequipItem(world2, "ship-1", "armor_iron");
      const ship2 = nextWorld2.fleet.ships[0];
      expect(ship2.maxDurability).toBe(50);
      expect(ship2.durability).toBe(1);
    });
  });

  describe("装备属性加成与逻辑集成", () => {
    it("速度加成叠加计算", () => {
      const ship = {
        ...createTestWorld().fleet.ships[0],
        equippedItems: ["high_speed_sail"], // +8% speed
      };
      const config = SHIPS.find((s) => s.id === ship.typeId);
      if (!config) throw new Error("config not found");

      expect(getShipSpeed(ship, config)).toBeCloseTo(1.08, 2);
    });

    it("火炮战斗力加成计算", () => {
      const ship = {
        ...createTestWorld().fleet.ships[0],
        equippedItems: ["cannon_heavy"], // +15% combat
        armamentLevel: 1 as const, // multiplier = 1.5
      };
      const config = SHIPS.find((s) => s.id === ship.typeId);
      if (!config) throw new Error("config not found");

      expect(getShipDefenseMultiplier(ship, config)).toBeCloseTo(1.5 * 1.15, 2);
    });

    it("装备特殊舱容加成计算", () => {
      const ship = {
        ...createTestWorld().fleet.ships[0],
        equippedItems: ["cargo_reinforcement"], // +10 capacity
      };
      const config = SHIPS.find((s) => s.id === ship.typeId);
      if (!config) throw new Error("config not found");

      expect(getShipCargoCapacity(ship, config)).toBe(45);
    });

    it("避难装备成功规避海盗袭击", () => {
      const world = createTestWorld({
        fleet: {
          ...createTestWorld().fleet,
          ships: [
            {
              ...createTestWorld().fleet.ships[0],
              equippedItems: ["figurehead_poseidon"], // evasion: 1.0 (100% in test if we mock or evasionBonus is 0.10 but let's see)
            },
          ],
        },
        voyage: {
          fromPortId: "quanzhou",
          toPortId: "nagasaki",
          departureDay: 1,
          travelDays: 5,
          events: [],
          fleetShipIds: ["ship-1"],
        },
      });

      // 在测试中，为了保证 100% 触发规避，我们先将海神像的回避率临时提高到 1.0 检查或者直接测试其执行逻辑
      // 或者我们可以检查当 Math.random 被 Mock 或正常调用时，若 evasionChance 是 0.10，则 evasion 逻辑会被执行。
      // 我们测试 applyVoyageEvents 中如果成功规避，是否不受到损失。
      // 我们可以让 evasionBonus 在测试中起效。为了有确定性的测试，我们在测试里把 Math.random 覆盖：
      const originalRandom = Math.random;
      Math.random = () => 0.05; // 0.05 < 0.10 (Poseidon Evasion Bonus)

      const combatEvent: VoyageEvent = {
        day: 2,
        description: "遭遇海盗",
        goldChange: 0,
        cargoLoss: 0,
        type: "combat",
      };

      const result = applyVoyageEvents(world, [combatEvent]);

      // 验证没有损失，旗舰存活，事件被修改为已回避
      expect(result.fleet.ships[0].durability).toBe(50);
      expect(combatEvent.description).toContain("成功回避海盗袭击");

      Math.random = originalRandom; // 恢复
    });
  });

  describe("出售船只拦截", () => {
    it("出售带装备的船只应该抛错", () => {
      const world = createTestWorld({
        fleet: {
          ships: [
            {
              ...createTestWorld().fleet.ships[0],
              id: "ship-1",
              equippedItems: ["high_speed_sail"],
              cargo: [],
            },
            {
              ...createTestWorld().fleet.ships[0],
              id: "ship-2",
              equippedItems: [],
              cargo: [],
            },
          ],
          activeShipId: "ship-2",
          maxShips: 2,
          crew: 3,
          maxCrew: 7,
          gold: 5000,
          inventory: [],
          shipEquipmentInventory: [],
        },
      });

      expect(() => sellShip(world, "ship-1")).toThrow(
        new DomainError("SHIP_HAS_EQUIPMENT"),
      );
    });
  });
});
