// ============================================================
// 装备合成系统 - 纯函数
// ============================================================

import type { EquipmentRecipe } from "../../data/items";
import { RECIPES } from "../../data/items";
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
  return RECIPES.filter((r) => r.portId === world.player.currentPortId);
}

/** 检查背包中某物品 ID 的总持有量 */
export function getItemCount(
  inventory: readonly ItemInstance[],
  itemId: string,
): number {
  return inventory
    .filter((item) => item.itemId === itemId && !item.equippedSlot)
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
  if (quantity <= 0) return world;

  const inventory = world.fleet.inventory;
  let remaining = quantity;
  const nextInventory: ItemInstance[] = [];

  for (const item of inventory) {
    if (item.itemId === itemId && !item.equippedSlot && remaining > 0) {
      if (item.quantity <= remaining) {
        // Fully consume this entry
        remaining -= item.quantity;
      } else {
        // Partially consume — reduce quantity
        nextInventory.push({
          ...item,
          quantity: item.quantity - remaining,
        });
        remaining = 0;
      }
    } else {
      nextInventory.push(item);
    }
  }

  return {
    ...world,
    fleet: {
      ...world.fleet,
      inventory: nextInventory,
    },
  };
}

/**
 * 合成装备。
 * 校验：配方存在、港口正确、金币足够、材料充足、NPC 好感度（可选）。
 * 消耗材料 + 金币 → 产物加入背包。
 */
export function craftEquipment(world: World, recipeId: string): World {
  const recipe = getRecipeConfig(recipeId);

  if (recipe.portId !== world.player.currentPortId) {
    throw new DomainError("RECIPE_WRONG_PORT");
  }

  if (world.fleet.gold < recipe.goldCost) {
    throw new DomainError("INSUFFICIENT_GOLD");
  }

  for (const ing of recipe.ingredients) {
    if (getItemCount(world.fleet.inventory, ing.itemId) < ing.quantity) {
      throw new DomainError("INSUFFICIENT_MATERIALS");
    }
  }

  if (recipe.minAffinity) {
    const relation = world.npcRelations[recipe.minAffinity.npcId];
    if (!relation) throw new DomainError("NPC_NOT_FOUND");
    if (relation.affinity < recipe.minAffinity.value) {
      throw new DomainError("RECIPE_AFFINITY_TOO_LOW");
    }
  }

  // Execute — deduct gold, consume materials, add result
  let nextWorld: World = {
    ...world,
    fleet: {
      ...world.fleet,
      gold: world.fleet.gold - recipe.goldCost,
    },
  };

  nextWorld = recipe.ingredients.reduce(
    (w, ing) => consumeIngredient(w, ing.itemId, ing.quantity),
    nextWorld,
  );
  nextWorld = gainItem(nextWorld, recipe.resultId, 1);

  return nextWorld;
}
