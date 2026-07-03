import type { CombatParticipant, PersonCombatState, World } from "../types";

/** Deterministic RNG: always returns the given value. */
export function fixedRng(value: number): () => number {
  return () => value;
}

/** Build a minimal CombatParticipant with sensible defaults. */
export function part(
  overrides?: Partial<CombatParticipant>,
): CombatParticipant {
  return {
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
    statuses: [],
    ...overrides,
  };
}

/** Build a combat state ready for test – player always goes first. */
export function makeCombat(
  overrides?: Partial<PersonCombatState>,
): PersonCombatState {
  const player = part();
  const enemy = part({
    id: "enemy-1",
    name: "海盗水手",
    type: "enemy",
    hp: 40,
    maxHp: 40,
    mp: 20,
    maxMp: 20,
    atk: 8,
    def: 4,
    spd: 7,
    luk: 3,
    mag: 3,
    mdf: 3,
    level: 1,
    weaponId: "rusted_sword",
  });

  return {
    participants: [player, enemy],
    turnOrder: ["player", "enemy-1"],
    currentTurnIndex: 0,
    round: 1,
    logs: [],
    status: "in_progress",
    ...overrides,
  };
}

/** Build a minimal World with the given combat state (or default). */
export function worldWithCombat(
  combat: PersonCombatState = makeCombat(),
): World {
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
          maxDurability: 100,
          equipment: {
            hullLevel: 0,
            sailLevel: 0,
            armorLevel: 0,
            cannonLevel: 0,
          },
          cargo: [{ goodsId: "silk", quantity: 5, buyPrice: 102 }],
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
