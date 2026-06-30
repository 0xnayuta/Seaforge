import { BASE_EXP } from "../data/formulas";
import { SHIPS } from "../data/ships";
import { createDefaultWorld } from "../game/domain/player";
import type { World } from "../game/domain/types";
import type { PrismaTransactionClient } from "../types/prisma";

const AUTO_SAVE_SLOT = 0;

function migrateOldShipToFleet(parsed: Record<string, unknown>): World {
  const oldShip = parsed.ship as Record<string, unknown>;
  const player = parsed.player as Record<string, unknown>;
  const shipConfig = SHIPS.find((s) => s.id === (oldShip.typeId as string));

  const hasLevel = (player.level as number) != null;

  return {
    player: {
      name: player.name as string,
      currentPortId: player.currentPortId as string,
      day: (player.day as number) ?? 1,
      level: hasLevel ? ((player.level as number) ?? 1) : 1,
      exp: hasLevel ? ((player.exp as number) ?? 0) : 0,
      expToNext: hasLevel
        ? ((player.expToNext as number) ?? BASE_EXP)
        : BASE_EXP,
    },
    fleet: {
      ships: [
        {
          id: "ship-1",
          typeId: oldShip.typeId as string,
          name: shipConfig?.name ?? "未知",
          equipment: {
            hullLevel: (oldShip.upgradeLevel as number) ?? 0,
            sailLevel: 0,
            armorLevel: 0,
            cannonLevel: 0,
          },
          durability: (oldShip.currentHp as number) ?? 50,
          maxDurability: (oldShip.maxHp as number) ?? 50,
          cargo: (oldShip.cargo ??
            []) as unknown as readonly import("../game/domain/types").CargoItem[],
          armamentLevel: Math.min(
            2,
            Math.max(0, (oldShip.armamentLevel as number) ?? 0),
          ) as 0 | 1 | 2,
          equippedItems: [],
        },
      ],
      activeShipId: "ship-1",
      maxShips: 1,
      crew: shipConfig?.baseCrew ?? 3,
      maxCrew: (shipConfig?.baseCrew ?? 3) * 2,
      gold: (player.gold as number) ?? 5000,
      inventory: [],
    },
    market:
      parsed.market as unknown as import("../game/domain/types").MarketPriceState,
    voyage: (parsed.voyage ?? null) as World["voyage"],
  };
}

export async function loadWorld(tx: PrismaTransactionClient): Promise<World> {
  const save = await tx.save.findUnique({
    where: { slot: AUTO_SAVE_SLOT },
  });
  if (!save) return createDefaultWorld();

  try {
    const parsed = JSON.parse(save.data) as Record<string, unknown>;

    // Phase 2.2: Old save with `ship` → migrate to fleet
    if (parsed.ship != null && parsed.fleet == null) {
      return migrateOldShipToFleet(parsed);
    }

    let data = parsed as unknown as World;

    // Phase 2.1: Complement level fields
    if (data.player.level == null) {
      data = {
        ...data,
        player: { ...data.player, level: 1, exp: 0, expToNext: BASE_EXP },
      };
    }

    // Phase 2.5: Ensure fleet has inventory
    if (data.fleet && data.fleet.inventory == null) {
      data = {
        ...data,
        fleet: {
          ...data.fleet,
          inventory: [],
        },
      };
    }

    return data;
  } catch {
    return createDefaultWorld();
  }
}

export async function saveWorld(
  tx: PrismaTransactionClient,
  world: World,
): Promise<void> {
  await tx.save.upsert({
    where: { slot: AUTO_SAVE_SLOT },
    update: { data: JSON.stringify(world) },
    create: { slot: AUTO_SAVE_SLOT, data: JSON.stringify(world) },
  });
}
