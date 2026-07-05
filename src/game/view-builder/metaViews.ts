import { DUNGEONS } from "../../data/dungeons";
import { GOODS } from "../../data/goods";
import { ITEMS } from "../../data/items";
import { NPCS } from "../../data/npcs";
import { PORTS } from "../../data/ports";
import { SHIPS } from "../../data/ships";
import { TITLES, type TitleConfig } from "../../data/titles";
import type {
  AchievementItemView,
  AchievementsView,
  CollectionCategoryView,
  CollectionEntryView,
  CollectionView,
  CraftingRecipeView,
  CraftingView,
  DungeonFloorEventView,
  DungeonView,
  TitleItemView,
  TitlesView,
} from "../../types/game-view";
import { getAchievementProgress } from "../domain/achievement";
import { getAvailableRecipes, getItemCount } from "../domain/crafting";
import { getCurrentFloorEvent } from "../domain/dungeon";
import { getUnlockedTitleIds } from "../domain/title";
import type { World } from "../domain/types";
import { buildPersonCombatView } from "./combatViews";

// ============================================================
// Titles Views
// ============================================================

function describeTitleEffect(effect: {
  readonly type: string;
  readonly value: number;
}): string {
  switch (effect.type) {
    case "cargoCapacity":
      return `舱容 +${effect.value}`;
    case "speedPercent":
      return `速度 +${effect.value}%`;
    case "defensePercent":
      return `防御 +${effect.value}%`;
    default:
      return "";
  }
}

function getTitleProgress(
  condition: TitleConfig["condition"],
  world: World,
): { progress: number; target: number } | undefined {
  const { player } = world;
  switch (condition.type) {
    case "level":
      return { progress: player.level, target: condition.threshold };
    case "totalSalesRevenue":
      return {
        progress: player.totalSalesRevenue,
        target: condition.threshold,
      };
    case "bestSingleProfit":
      return { progress: player.bestSingleProfit, target: condition.threshold };
    case "totalMileage":
      return { progress: player.totalMileage, target: condition.threshold };
    case "combatWins":
      return { progress: player.combatWins, target: condition.threshold };
    case "voyagesCompleted":
      return { progress: player.voyagesCompleted, target: condition.threshold };
  }
}

export function buildTitlesView(world: World): TitlesView {
  const unlockedIds = getUnlockedTitleIds(world);
  const titles: TitleItemView[] = TITLES.map((t) => {
    const unlocked = !!unlockedIds[t.id];
    const progress = unlocked
      ? undefined
      : getTitleProgress(t.condition, world);
    return {
      id: t.id,
      name: t.name,
      description: t.description,
      unlocked,
      effects: t.effects.map(describeTitleEffect),
      ...(progress
        ? { progress: progress.progress, target: progress.target }
        : {}),
    };
  });
  return { titles, selectedTitleId: world.selectedTitle };
}

// ============================================================
// Achievements View
// ============================================================

export function buildAchievementsView(world: World): AchievementsView {
  const progress = getAchievementProgress(world);
  const achievements: AchievementItemView[] = progress.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    unlocked: p.unlocked,
    claimed: p.claimed,
    progress: p.progress,
    target: p.target,
    reward: p.reward,
  }));
  return {
    achievements,
    totalClaimed: progress.filter((p) => p.claimed).length,
    totalCount: progress.length,
  };
}

// ============================================================
// Collection View
// ============================================================

function buildCollectionCategory(
  label: string,
  totalEntries: readonly { id: string; name: string }[],
  unlockedIds: readonly string[],
): CollectionCategoryView {
  const items: CollectionEntryView[] = totalEntries.map((entry) => ({
    id: entry.id,
    name: entry.name,
    unlocked: unlockedIds.includes(entry.id),
  }));
  return {
    label,
    progress: items.filter((i) => i.unlocked).length,
    total: items.length,
    items,
  };
}

export function buildCollectionView(world: World): CollectionView {
  const { collection } = world;
  const categories: CollectionCategoryView[] = [
    buildCollectionCategory(
      "港口",
      PORTS.map((p) => ({ id: p.id, name: p.name })),
      collection.visitedPorts,
    ),
    buildCollectionCategory(
      "商品",
      GOODS.map((g) => ({ id: g.id, name: g.name })),
      collection.tradedGoods,
    ),
    buildCollectionCategory(
      "船只",
      SHIPS.map((s) => ({ id: s.id, name: s.name })),
      collection.ownedShips,
    ),
    buildCollectionCategory(
      "物品",
      ITEMS.map((item) => ({ id: item.id, name: item.name })),
      collection.collectedItems,
    ),
  ];
  const totalProgress = categories.reduce((sum, c) => sum + c.progress, 0);
  const totalCount = categories.reduce((sum, c) => sum + c.total, 0);
  return { categories, totalProgress, totalCount };
}

// ============================================================
// Crafting View
// ============================================================

export function buildCraftingView(world: World): CraftingView {
  const port = PORTS.find((p) => p.id === world.player.currentPortId);
  const recipes = getAvailableRecipes(world).map((r) => {
    const resultItem = ITEMS.find((i) => i.id === r.resultId);
    const ingredients = r.ingredients.map((ing) => {
      const ingItem = ITEMS.find((i) => i.id === ing.itemId);
      const owned = getItemCount(world.fleet.inventory, ing.itemId);
      return {
        itemId: ing.itemId,
        name: ingItem?.name ?? ing.itemId,
        required: ing.quantity,
        owned,
        sufficient: owned >= ing.quantity,
      };
    });
    let affinityRequirement: CraftingRecipeView["affinityRequirement"] = null;
    if (r.minAffinity) {
      const npc = NPCS.find((n) => n.id === r.minAffinity!.npcId);
      const currentAffinity =
        world.npcRelations[r.minAffinity.npcId]?.affinity ?? 0;
      affinityRequirement = {
        npcName: npc?.name ?? r.minAffinity.npcId,
        required: r.minAffinity.value,
        current: currentAffinity,
        met: currentAffinity >= r.minAffinity.value,
      };
    }
    const canCraftIngredients = ingredients.every((i) => i.sufficient);
    const hasGold = world.fleet.gold >= r.goldCost;
    const meetsAffinity = !affinityRequirement || affinityRequirement.met;
    const canCraft = canCraftIngredients && hasGold && meetsAffinity;
    let blockedReason: string | null = null;
    if (!canCraft) {
      if (!hasGold) {
        blockedReason = "金币不足";
      } else if (!canCraftIngredients) {
        const missing = ingredients.find((i) => !i.sufficient);
        blockedReason = missing ? `缺少材料：${missing.name}` : "材料不足";
      } else if (!meetsAffinity) {
        blockedReason = "NPC 好感度不足";
      }
    }
    return {
      recipeId: r.id,
      name: r.name,
      goldCost: r.goldCost,
      ingredients,
      resultName: resultItem?.name ?? "未知",
      resultQuality: resultItem?.quality ?? "normal",
      resultDescription: resultItem?.description ?? "",
      canCraft,
      blockedReason,
      affinityRequirement,
    } satisfies CraftingRecipeView;
  });

  return {
    recipes,
    fleetGold: world.fleet.gold,
    portName: port?.name ?? "未知",
  };
}

// ============================================================
// Dungeon View
// ============================================================

export function buildDungeonView(world: World): DungeonView | null {
  if (!world.dungeon) return null;
  const config = DUNGEONS.find((d) => d.id === world.dungeon!.dungeonId);
  const currentEvent = getCurrentFloorEvent(world);
  const eventView: DungeonFloorEventView | null = currentEvent
    ? {
        type: currentEvent.type,
        flavorText: currentEvent.flavorText,
        difficulty: currentEvent.difficulty,
        goldReward: currentEvent.goldReward,
        expReward: currentEvent.expReward,
        hpDamage: currentEvent.hpDamage,
        itemRewards: currentEvent.itemRewards,
        options: currentEvent.options?.map((o) => ({ id: o.id, text: o.text })),
      }
    : null;
  return {
    dungeonId: world.dungeon.dungeonId,
    name: config?.name ?? "",
    currentFloor: world.dungeon.currentFloor,
    totalFloors: world.dungeon.totalFloors,
    itemsGained: world.dungeon.itemsGained,
    hpLoss: world.dungeon.hpLoss,
    goldGained: world.dungeon.goldGained,
    status: world.dungeon.status,
    currentEvent: eventView,
    combatView: buildPersonCombatView(world),
  };
}
