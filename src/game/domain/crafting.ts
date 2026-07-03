// ============================================================
// 装备合成系统 - 纯函数
// ============================================================

import { type EquipmentRecipe, ITEMS, RECIPES } from "../../data/items";
import { gainItem } from "./player";
import { DomainError, type ItemInstance, type World } from "./types";

/** 按食谱 ID 获取配置 */
export function getRecipeConfig(recipeId: string): EquipmentRecipe {
  const recipe = RECIPES.find((r) => r.id === recipeId);
  if (!recipe) throw new DomainError("RECIPE_NOT_FOUND");
  return recipe;
}

/** 获取当前港口可用配方列表 */
export function getAvailableRecipes(world: World): readonly EquipmentRecipe[] {
  const portId = world.player.currentPortId;
  return RECIPES.filter((r) => r.portId === portId);
}

/** 检查背包中某物品 ID 的总持有量 */
export function getItemCount(
  inventory: readonly ItemInstance[],
  itemId: string,
): number {
  return inventory
    .filter((item) => item.itemId === itemId)
    .reduce((sum, item) => sum + item.quantity, 0);
}

/**
 * 从背包中消耗指定数量的某物品（按 itemId）。
 * 处理非堆叠物品的逐 uid 移除。
 */
function consumeIngredient(
  world: World,
  itemId: string,
  quantity: number,
): World {
  const config = ITEMS.find((i) => i.id === itemId);
  if (!config) throw new DomainError("ITEM_NOT_FOUND");

  let result = world;
  let remaining = quantity;

  // 遍历副本（非堆叠物品各占一条）
  const entries = result.fleet.inventory
    .map((item, idx) => ({ item, idx }))
    .filter(({ item }) => item.itemId === itemId)
    // 先消耗非装备状态、无 uid 栈顶顺序
    .sort((a, b) => a.idx - b.idx);

  for (const { item } of entries) {
    if (remaining <= 0) break;

    if (item.quantity > remaining) {
      // 部分消耗（堆叠物品）
      const nextInventory = [...result.fleet.inventory];
      const realIdx = nextInventory.findIndex((i) => i.uid === item.uid);
      if (realIdx === -1) throw new DomainError("ITEM_NOT_FOUND_IN_INVENTORY");
      nextInventory[realIdx] = { ...item, quantity: item.quantity - remaining };
      remaining = 0;
      result = {
        ...result,
        fleet: { ...result.fleet, inventory: nextInventory },
      };
    } else {
      // 整条移除
      remaining -= item.quantity;
      result = {
        ...result,
        fleet: {
          ...result.fleet,
          inventory: result.fleet.inventory.filter((i) => i.uid !== item.uid),
        },
      };
    }
  }

  if (remaining > 0) throw new DomainError("INSUFFICIENT_MATERIALS");
  return result;
}

/** 同时消耗多种材料 */
function consumeIngredients(
  world: World,
  ingredients: readonly { itemId: string; quantity: number }[],
): World {
  let result = world;
  for (const ing of ingredients) {
    result = consumeIngredient(result, ing.itemId, ing.quantity);
  }
  return result;
}

/**
 * 合成装备。
 * 校验：配方存在、港口正确、金币足够、材料充足、NPC 好感度（可选）。
 * 消耗材料 + 金币 → 产物加入背包。
 */
export function craftEquipment(world: World, recipeId: string): World {
  const recipe = getRecipeConfig(recipeId);

  // 校验港口
  if (world.player.currentPortId !== recipe.portId) {
    throw new DomainError("RECIPE_WRONG_PORT");
  }

  // 校验金币
  if (world.fleet.gold < recipe.goldCost) {
    throw new DomainError("INSUFFICIENT_GOLD");
  }

  // 校验材料持有量
  for (const ing of recipe.ingredients) {
    const count = getItemCount(world.fleet.inventory, ing.itemId);
    if (count < ing.quantity) {
      throw new DomainError("INSUFFICIENT_MATERIALS");
    }
  }

  // 校验 NPC 好感度
  if (recipe.minAffinity) {
    const relation = world.npcRelations[recipe.minAffinity.npcId];
    if (!relation || relation.affinity < recipe.minAffinity.value) {
      throw new DomainError("RECIPE_AFFINITY_TOO_LOW");
    }
  }

  // 执行：消耗金币
  let result: World = {
    ...world,
    fleet: {
      ...world.fleet,
      gold: world.fleet.gold - recipe.goldCost,
    },
  };

  // 消耗材料
  result = consumeIngredients(result, recipe.ingredients);

  // 加入产物
  result = gainItem(result, recipe.resultId);

  return result;
}
