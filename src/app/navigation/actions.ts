"use server";
import { getActiveShip, setArmamentLevel } from "../../game/domain/ship";
import { buildNavigationView } from "../../game/view-builder/buildGameView";
import { prisma } from "../../lib/prisma";
import { loadWorld } from "../../lib/repository";
import { withTransaction } from "../../lib/with-transaction";
import type { NavigationView } from "../../types/game-view";

export async function loadNavigationView(): Promise<NavigationView> {
  const world = await loadWorld(prisma);
  return buildNavigationView(world);
}

export async function updateArmamentLevel(
  level: 0 | 1 | 2,
): Promise<NavigationView> {
  return withTransaction(
    (w) => setArmamentLevel(w, getActiveShip(w).id, level),
    buildNavigationView,
  )();
}
