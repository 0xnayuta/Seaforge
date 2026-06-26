"use server";
import { DomainError } from "../../game/domain/types";

import { buildNavigationView } from "../../game/view-builder/buildGameView";
import { prisma } from "../../lib/prisma";
import { loadWorld } from "../../lib/repository";
import type { NavigationView } from "../../types/game-view";

/** 加载航海图视图（读档 + 组装 View）。无副作用。 */
export async function loadNavigationView(): Promise<NavigationView> {
  const world = await loadWorld(prisma);
  return buildNavigationView(world);
}
/** 更新武装等级。航海中拒绝更改（抛 DomainError）。 */

export async function updateArmamentLevel(
  level: 0 | 1 | 2,
): Promise<NavigationView> {
  return await prisma.$transaction(async (tx) => {
    const world = await loadWorld(tx);
    if (world.voyage) throw new DomainError("IN_VOYAGE");
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
