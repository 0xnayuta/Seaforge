"use client";

import { useState, useTransition } from "react";
import {
  allocateAttributePointAction,
  equipCharacterItemAction,
  unequipCharacterItemAction,
} from "../app/actions/character";
import type { CharacterView } from "../types/game-view";
import { CharacterAttributes } from "./CharacterAttributes";
import { CharacterCombatStats } from "./CharacterCombatStats";
import { CharacterEquipment } from "./CharacterEquipment";
import { CharacterInventory } from "./CharacterInventory";

interface CharacterPanelProps {
  readonly view: CharacterView;
}

export function CharacterPanel({ view }: CharacterPanelProps) {
  const [displayView, setDisplayView] = useState(view);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const runAction = (
    action: (fd: FormData) => Promise<CharacterView>,
    formDataBuilder: () => FormData,
    errorMsg: string,
  ) => {
    setError(null);
    startTransition(async () => {
      try {
        const fd = formDataBuilder();
        const nextView = await action(fd);
        setDisplayView(nextView);
      } catch (e) {
        setError(e instanceof Error ? e.message : `${errorMsg}失败`);
      }
    });
  };

  /** 创建 handler：根据参数映射构建 FormData 后提交 */
  const makeHandler =
    (
      action: (fd: FormData) => Promise<CharacterView>,
      params: Record<string, string>,
      errorLabel: string,
    ) =>
    () => {
      runAction(
        action,
        () => {
          const fd = new FormData();
          for (const [key, value] of Object.entries(params)) {
            fd.set(key, value);
          }
          return fd;
        },
        errorLabel,
      );
    };

  const handleAllocate = (attribute: string) =>
    makeHandler(allocateAttributePointAction, { attribute }, "分配属性点")();
  const handleEquip = (itemUid: string, slot: string) =>
    makeHandler(equipCharacterItemAction, { itemUid, slot }, "装备道具")();
  const handleUnequip = (slot: string) =>
    makeHandler(unequipCharacterItemAction, { slot }, "卸下道具")();

  const {
    name,
    level,
    exp,
    expToNext,
    gold,
    attributePoints,
    attributes,
    panelStats,
    equipment,
    inventory,
    blockedByVoyage,
  } = displayView;

  // 整理背包：未装备的物品
  const unequippedItems = inventory.filter((item) => !item.equippedSlot);

  return (
    <div className="flex-1 p-4 max-w-4xl mx-auto w-full space-y-4">
      {error && (
        <div className="rounded-lg border border-red-500 bg-red-500/10 p-3 text-sm text-red-400 text-center">
          {error}
        </div>
      )}

      {/* 标题栏 */}
      <div className="rounded-lg border border-ocean-600 bg-ocean-800/80 px-4 py-2.5 text-sm flex justify-between items-center">
        <div className="flex items-center gap-3">
          <span className="font-bold text-gold-400 text-base">{name}</span>
          <span className="text-xs rounded bg-ocean-700 px-2 py-0.5 text-parchment-dark">
            等级 {level} (经验 {exp} / {expToNext})
          </span>
        </div>
        <span className="text-parchment-dark">
          金币 {gold.toLocaleString()}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 左半栏：属性与面板 */}
        <div className="space-y-4">
          <CharacterAttributes
            attributes={attributes}
            attributePoints={attributePoints}
            isPending={isPending}
            blockedByVoyage={blockedByVoyage}
            onAllocate={handleAllocate}
          />
          <CharacterCombatStats panelStats={panelStats} />
        </div>

        {/* 右半栏：装备与背包 */}
        <div className="space-y-4">
          <CharacterEquipment
            equipment={equipment}
            isPending={isPending}
            blockedByVoyage={blockedByVoyage}
            onUnequip={handleUnequip}
          />
          <CharacterInventory
            unequippedItems={unequippedItems}
            isPending={isPending}
            blockedByVoyage={blockedByVoyage}
            onEquip={handleEquip}
          />
        </div>
      </div>

      {blockedByVoyage && (
        <p className="text-xs text-yellow-400 text-center">
          航海期间无法更换装备、分配属性点
        </p>
      )}
    </div>
  );
}
