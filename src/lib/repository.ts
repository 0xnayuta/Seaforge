import { createDefaultWorld } from "../game/domain/player";
import type { World } from "../game/domain/types";
import type { PrismaTransactionClient } from "../types/prisma";

// ============================================================
// Repository — 数据读写层
// 只做 CRUD，不含业务逻辑
// ============================================================

const AUTO_SAVE_SLOT = 0;

/** 从 SQLite 读档，无存档则创建默认 World */
export async function loadWorld(tx: PrismaTransactionClient): Promise<World> {
  const save = await tx.save.findUnique({
    where: { slot: AUTO_SAVE_SLOT },
  });
  if (!save) return createDefaultWorld();

  return JSON.parse(save.data) as World;
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
