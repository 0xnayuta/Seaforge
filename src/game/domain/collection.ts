// ============================================================
// 图鉴系统领域逻辑 — 纯函数
// 被动记录港口访问、商品交易、船只拥有、装备收集历史
// ============================================================
import type { World } from "./types";

/** 从当前 World 同步收集记录，返回更新后的 World */
export function updateCollection(world: World): World {
  const { player, fleet } = world;
  const prev = world.collection;

  const visitedPorts = addUnique(prev.visitedPorts, player.currentPortId);

  // 从舰队中提取持有的船只类型
  const shipTypeIds = fleet.ships.map((s) => s.typeId);
  const ownedShips = mergeUnique(prev.ownedShips, shipTypeIds);

  // 从存货中提取持有的物品类型
  const inventoryItemIds = fleet.inventory.map((item) => item.itemId);
  const collectedItems = mergeUnique(prev.collectedItems, inventoryItemIds);

  // 从各船货舱中提取交易过的商品
  const cargoGoodIds = fleet.ships.flatMap((s) => s.cargo.map((c) => c.goodId));
  const tradedGoods = mergeUnique(prev.tradedGoods, cargoGoodIds);

  if (
    visitedPorts === prev.visitedPorts &&
    ownedShips === prev.ownedShips &&
    collectedItems === prev.collectedItems &&
    tradedGoods === prev.tradedGoods
  ) {
    return world;
  }

  return {
    ...world,
    collection: {
      visitedPorts,
      tradedGoods,
      ownedShips,
      collectedItems,
    },
  };
}

/** 获取图鉴完成进度摘要 */
export function getCollectionProgress(world: World): CollectionProgress {
  const { collection } = world;
  return {
    portsVisited: collection.visitedPorts.length,
    goodsTraded: collection.tradedGoods.length,
    shipsOwned: collection.ownedShips.length,
    itemsCollected: collection.collectedItems.length,
  };
}

export interface CollectionProgress {
  readonly portsVisited: number;
  readonly goodsTraded: number;
  readonly shipsOwned: number;
  readonly itemsCollected: number;
}

// ---- 辅助函数 ----

/** 向只读数组追加值（如已存在则返回原引用） */
function addUnique(arr: readonly string[], value: string): readonly string[] {
  if (arr.includes(value)) return arr;
  return [...arr, value];
}

/** 合并两个只读数组（去重，如无变化则返回原引用） */
function mergeUnique(
  existing: readonly string[],
  newValues: readonly string[],
): readonly string[] {
  const newSet = new Set(existing);
  let changed = false;
  for (const v of newValues) {
    if (!newSet.has(v)) {
      newSet.add(v);
      changed = true;
    }
  }
  if (!changed) return existing;
  return Array.from(newSet);
}
