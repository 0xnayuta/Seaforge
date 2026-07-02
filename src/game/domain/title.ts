// ============================================================
// 称号系统领域逻辑 — 纯函数
// ============================================================

import { TITLES, type TitleConfig, type TitleEffect } from "../../data/titles";
import { DomainError, type World } from "./types";

/** 获取当前已解锁的称号配置列表（从 World 数据现场推导） */
export function getUnlockedTitles(world: World): readonly TitleConfig[] {
  return TITLES.filter((title) => checkCondition(title.condition, world));
}

/** 获取当前已解锁的称号 ID 集合（Record 用于 O(1) 成员检查） */
export function getUnlockedTitleIds(world: World): Record<string, true> {
  const ids: Record<string, true> = {};
  for (const t of getUnlockedTitles(world)) {
    ids[t.id] = true;
  }
  return ids;
}

/** 选中一个称号（必须是已解锁的） */
export function selectTitle(world: World, titleId: string | null): World {
  if (titleId !== null) {
    const title = TITLES.find((t) => t.id === titleId);
    if (!title) throw new DomainError("TITLE_NOT_FOUND");
    if (!checkCondition(title.condition, world))
      throw new DomainError("TITLE_NOT_UNLOCKED");
  }
  return { ...world, selectedTitle: titleId };
}

/** 获取当前选中称号的属性加成列表 */
export function getSelectedTitleEffects(world: World): readonly TitleEffect[] {
  if (!world.selectedTitle) return [];
  const title = TITLES.find((t) => t.id === world.selectedTitle);
  if (!title) return [];
  return title.effects;
}

/** 检查单个条件是否满足 */
function checkCondition(
  condition: TitleConfig["condition"],
  world: World,
): boolean {
  const { player } = world;
  switch (condition.type) {
    case "level":
      return player.level >= condition.threshold;
    case "totalSalesRevenue":
      return player.totalSalesRevenue >= condition.threshold;
    case "bestSingleProfit":
      return player.bestSingleProfit >= condition.threshold;
    case "totalMileage":
      return player.totalMileage >= condition.threshold;
    case "combatWins":
      return player.combatWins >= condition.threshold;
    case "voyagesCompleted":
      return player.voyagesCompleted >= condition.threshold;
  }
}
