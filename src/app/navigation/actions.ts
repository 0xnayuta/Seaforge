"use server";

import { buildNavigationView } from "../../game/view-builder/buildGameView";
import { prisma } from "../../lib/prisma";
import { loadWorld } from "../../lib/repository";
import type { NavigationView } from "../../types/game-view";

export async function loadNavigationView(): Promise<NavigationView> {
  const world = await loadWorld(prisma);
  return buildNavigationView(world);
}

export async function updateArmamentLevel(
  level: 0 | 1 | 2,
): Promise<NavigationView> {
  return await prisma.$transaction(async (tx) => {
    const world = await loadWorld(tx);
    if (world.voyage) throw new Error("航行中无法更改配置");
    const newWorld = {
      ...world,
      ship: { ...world.ship, armamentLevel: level },
    };
    await tx.save.upsert({
      where: { slot: 0 },
      update: { data: JSON.stringify(newWorld) },
      create: { slot: 0, data: JSON.stringify(newWorld) },
    });
    return buildNavigationView(newWorld);
  });
}
