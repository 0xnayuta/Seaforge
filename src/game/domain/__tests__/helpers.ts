/**
 * 测试辅助：构建已知 World 供测试使用
 */

import { initMarketPrices } from "../market";
import type { World } from "../types";

function buildTestPrices(): Record<string, Record<string, number>> {
  return initMarketPrices().prices;
}

/** 带基础货物的默认 World（泉州出发，单桅帆船，有丝绸和香料） */
export function createTestWorld(overrides?: Partial<World>): World {
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
      ships: [
        {
          id: "ship-1",
          typeId: "sloop",
          name: "单桅帆船",
          equipment: {
            hullLevel: 0,
            sailLevel: 0,
            armorLevel: 0,
            cannonLevel: 0,
          },
          durability: 50,
          maxDurability: 50,
          cargo: [
            { goodId: "silk", quantity: 5, buyPrice: 102 },
            { goodId: "spice", quantity: 3, buyPrice: 260 },
          ],
          armamentLevel: 0,
          equippedItems: [],
        },
      ],
      activeShipId: "ship-1",
      maxShips: 1,
      crew: 3,
      maxCrew: 7,
      gold: 5000,
      inventory: [],
      shipEquipmentInventory: [],
    },
    market: { prices: buildTestPrices() },
    voyage: null,
    combat: null,
    npcRelations: {},
    activeQuests: [],
    ...overrides,
  };
}

/** 马六甲出发的空船 */
export function createEmptyWorld(overrides?: Partial<World>): World {
  return {
    player: {
      name: "测试船长",
      currentPortId: "malacca",
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
      ships: [
        {
          id: "ship-1",
          typeId: "sloop",
          name: "单桅帆船",
          equipment: {
            hullLevel: 0,
            sailLevel: 0,
            armorLevel: 0,
            cannonLevel: 0,
          },
          durability: 50,
          maxDurability: 50,
          cargo: [],
          armamentLevel: 0,
          equippedItems: [],
        },
      ],
      activeShipId: "ship-1",
      maxShips: 1,
      crew: 3,
      maxCrew: 7,
      gold: 10000,
      inventory: [],
      shipEquipmentInventory: [],
    },
    market: { prices: buildTestPrices() },
    voyage: null,
    combat: null,
    npcRelations: {},
    activeQuests: [],
    ...overrides,
  };
}
