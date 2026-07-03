import { createDefaultWorld } from "../game/domain/player";
import type { World } from "../game/domain/types";
import type { PrismaTransactionClient } from "../types/prisma";
import { prisma } from "./prisma";

export const AUTO_SAVE_SLOT = 0;
export const MANUAL_SAVE_SLOTS = [1, 2, 3] as const;
export const ALL_SAVE_SLOTS = [0, 1, 2, 3] as const;

/** 从指定槽位加载 World（槽位为空时抛异常） */
export async function loadWorldFromSlot(
  tx: PrismaTransactionClient,
  slot: number,
): Promise<World> {
  const save = await tx.save.findUnique({ where: { slot } });
  if (!save) throw new Error("该存档槽位为空");
  return JSON.parse(save.data) as World;
}

/** 加载自动存档（槽位为空时返回默认 World，用于游戏初始化） */
export async function loadWorld(tx: PrismaTransactionClient): Promise<World> {
  const save = await tx.save.findUnique({ where: { slot: AUTO_SAVE_SLOT } });
  if (!save) return createDefaultWorld();
  try {
    return JSON.parse(save.data) as World;
  } catch (error) {
    console.error(
      "❌ [存档重创] 存档 Schema 冲突或解析失败，旧存档已报废:",
      error,
    );
    throw new Error(
      "存档版本不匹配！因底层配置或核心玩法变更，该存档已无法解析。请手动清理数据库或切换至新存档位开始新游戏。",
    );
  }
}

/** 保存 World 到指定槽位 */
export async function saveWorldToSlot(
  tx: PrismaTransactionClient,
  world: World,
  slot: number,
): Promise<void> {
  let data: string;
  try {
    data = JSON.stringify(world);
  } catch {
    throw new Error("世界序列化失败，存档无法保存");
  }
  await tx.save.upsert({
    where: { slot },
    update: { data },
    create: { slot, data },
  });
}

/** 保存 World 到自动存档槽位 */
export async function saveWorld(
  tx: PrismaTransactionClient,
  world: World,
): Promise<void> {
  await saveWorldToSlot(tx, world, AUTO_SAVE_SLOT);
}

/** 列出所有存档（按槽位升序），供存档列表预览使用 */
export async function listSaves(): Promise<
  { slot: number; data: string; updatedAt: Date }[]
> {
  return prisma.save.findMany({ orderBy: { slot: "asc" } });
}

/** 删除指定槽位的存档（槽位为空时静默忽略） */
export async function deleteSave(slot: number): Promise<void> {
  const existing = await prisma.save.findUnique({ where: { slot } });
  if (!existing) return;
  await prisma.save.delete({ where: { slot } });
}
