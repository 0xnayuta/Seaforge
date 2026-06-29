// ============================================================
// HOF 事务管道 — 固化写操作模式
// 读档 → 转换 → 保存 → 返回 View
// ============================================================

import type { World } from "../game/domain/types";
import type { PrismaTransactionClient } from "../types/prisma";
import { prisma } from "./prisma";
import { loadWorld, saveWorld } from "./repository";

/**
 * HOF: useActionState 兼容的写操作管道。
 *
 * 返回 `(_prev?, _formData?) => Promise<T>` 签名，
 * 可直接传入 `useActionState(fn, null)`。
 * `_prev` 和 `_formData` 均被忽略（状态来自 SQLite）。
 */
export function withActionState<T>(
  transform: (world: World) => World,
  buildView: (world: World) => T,
): (_prev: T | null, _formData?: FormData) => Promise<T> {
  return async (_prev, _formData) =>
    await prisma.$transaction(async (tx: PrismaTransactionClient) => {
      const world = await loadWorld(tx);
      const newWorld = transform(world);
      await saveWorld(tx, newWorld);
      return buildView(newWorld);
    });
}

/**
 * HOF: 直接调用的写操作管道。
 *
 * 返回 `() => Promise<T>`，适合在 Server Action 中
 * 直接调用并返回结果。
 */
export function withTransaction<T>(
  transform: (world: World) => World,
  buildView: (world: World) => T,
): () => Promise<T> {
  return async () =>
    await prisma.$transaction(async (tx: PrismaTransactionClient) => {
      const world = await loadWorld(tx);
      const newWorld = transform(world);
      await saveWorld(tx, newWorld);
      return buildView(newWorld);
    });
}
