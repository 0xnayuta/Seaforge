"use server";
import { setArmamentLevel } from "../../game/domain/ship";
import { buildNavigationView } from "../../game/view-builder/buildGameView";
import { prisma } from "../../lib/prisma";
import { loadWorld } from "../../lib/repository";
import { withTransaction } from "../../lib/with-transaction";
import type { NavigationView } from "../../types/game-view";

/** 加载航海图视图（读档 + 组装 View）。无副作用。 */
export async function loadNavigationView(): Promise<NavigationView> {
  const world = await loadWorld(prisma);
  return buildNavigationView(world);
}
/** 更新武装等级（通过 HOF `withTransaction` 管道）。 */
export async function updateArmamentLevel(
  level: 0 | 1 | 2,
): Promise<NavigationView> {
  return withTransaction(
    (w) => setArmamentLevel(w, level),
    buildNavigationView,
  )();
}
