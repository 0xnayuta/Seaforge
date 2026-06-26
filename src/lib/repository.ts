import type { GoodConfig } from "../data/goods";
import { GOODS } from "../data/goods";
import { PORTS } from "../data/ports";
import { getBasePriceFor, initMarketPrices } from "../game/domain/market";
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

  const world = JSON.parse(save.data) as World;

  // 迁移：旧存档没有 market 字段 → 初始化价格
  if (!world.market) {
    return {
      ...world,
      market: initMarketPrices(),
    };
  }

  // 迁移：旧存档缺少新商品的价格 → 用均衡价补齐
  const allGoodIds = new Set(GOODS.map((g: GoodConfig) => g.id));
  let needsFill = false;
  for (const port of PORTS) {
    const portPrices = world.market.prices[port.id];
    if (!portPrices) continue;
    for (const goodId of allGoodIds) {
      if (!(goodId in portPrices)) {
        needsFill = true;
        break;
      }
    }
    if (needsFill) break;
  }

  if (needsFill) {
    for (const port of PORTS) {
      for (const goodId of allGoodIds) {
        if (!(world.market.prices[port.id]?.[goodId] !== undefined)) {
          world.market.prices[port.id][goodId] = getBasePriceFor(
            goodId,
            port.id,
          );
        }
      }
    }
  }

  return world;
}

/** 保存 World 到 SQLite（upsert） */
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
