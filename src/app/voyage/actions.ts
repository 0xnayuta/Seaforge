"use server";

import { redirect } from "next/navigation";
import { progressVoyage } from "../../game/domain/voyage";
import { buildVoyageView } from "../../game/view-builder/buildGameView";
import { getErrorMessage } from "../../lib/domain-errors";
import { prisma } from "../../lib/prisma";
import { loadWorld } from "../../lib/repository";
import { withTransaction } from "../../lib/with-transaction";
import type { VoyageView } from "../../types/game-view";

export async function loadVoyageView(): Promise<VoyageView> {
  const world = await loadWorld(prisma);
  return buildVoyageView(world);
}

/** 推进航行：一次处理所有已生成且无需交互的航行事件 */
export async function completeVoyage(): Promise<void> {
  try {
    await withTransaction(
      (w) => {
        if (!w.voyage) throw new Error("没有进行中的航行");
        if (w.voyage.combatSelection) throw new Error("请先选择投降或接舷战");
        if (w.combat) throw new Error("战斗中无法完成航行");
        return progressVoyage(w);
      },
      () => undefined,
    )();
  } catch (e) {
    throw new Error(getErrorMessage(e));
  }

  // 重新加载以判断航行是否已完成
  const world = await loadWorld(prisma);
  if (!world.voyage && !world.combat) {
    redirect("/");
  }
  // 否则停留在 /voyage 等待玩家交互
  redirect("/voyage");
}
