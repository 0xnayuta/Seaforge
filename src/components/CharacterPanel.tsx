"use client";
import { useState, useTransition } from "react";
import {
  allocateAttributePointAction,
  equipCharacterItemAction,
  unequipCharacterItemAction,
} from "../app/actions/character";
import type { CharacterView } from "../types/game-view";

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

  const handleAllocate = (attribute: string) => {
    runAction(
      allocateAttributePointAction,
      () => {
        const fd = new FormData();
        fd.set("attribute", attribute);
        return fd;
      },
      "分配属性点",
    );
  };

  const handleEquip = (itemUid: string, slot: string) => {
    runAction(
      equipCharacterItemAction,
      () => {
        const fd = new FormData();
        fd.set("itemUid", itemUid);
        fd.set("slot", slot);
        return fd;
      },
      "装备道具",
    );
  };

  const handleUnequip = (slot: string) => {
    runAction(
      unequipCharacterItemAction,
      () => {
        const fd = new FormData();
        fd.set("slot", slot);
        return fd;
      },
      "卸下道具",
    );
  };

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

  // 装备品质对应的文字颜色
  const getQualityColor = (quality: string) => {
    switch (quality) {
      case "传说":
        return "text-red-400 font-bold";
      case "稀有":
        return "text-orange-400 font-bold";
      case "优秀":
        return "text-purple-400";
      case "良":
        return "text-blue-400";
      default:
        return "text-parchment";
    }
  };

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
          {/* 核心属性 */}
          <div className="rounded-lg border border-ocean-600 bg-ocean-800/80 p-4 space-y-3">
            <div className="flex justify-between items-center border-b border-ocean-750 pb-2">
              <h3 className="text-sm font-semibold text-gold-400">核心属性</h3>
              {attributePoints > 0 && (
                <span className="text-xs text-yellow-400">
                  可用属性点: {attributePoints}
                </span>
              )}
            </div>

            <div className="space-y-2.5">
              {[
                {
                  key: "str",
                  label: "力量 (STR)",
                  desc: "提升物理伤害与装备承重",
                },
                {
                  key: "dex",
                  label: "敏捷 (DEX)",
                  desc: "提升攻击速度、暴击率与回避率",
                },
                {
                  key: "int",
                  label: "智力 (INT)",
                  desc: "提升魔法威力与特殊炮弹威力",
                },
                {
                  key: "fth",
                  label: "信仰 (FTH)",
                  desc: "提升魔法防御与船员士气",
                },
                {
                  key: "arc",
                  label: "感应 (ARC)",
                  desc: "提升幸运、掉落率与商品议价能力",
                },
              ].map(({ key, label, desc }) => {
                const val = attributes[key as keyof typeof attributes];
                return (
                  <div key={key} className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-parchment">
                        {label}
                      </div>
                      <div className="text-[10px] text-parchment-dark">
                        {desc}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-parchment w-8 text-right">
                        {val}
                      </span>
                      <button
                        type="button"
                        disabled={
                          attributePoints <= 0 || isPending || blockedByVoyage
                        }
                        onClick={() => handleAllocate(key)}
                        className="rounded bg-gold-500 hover:bg-gold-400 disabled:opacity-30 disabled:hover:bg-gold-500 w-6 h-6 flex items-center justify-center text-sm font-bold text-ocean-900 transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 战斗面板 */}
          <div className="rounded-lg border border-ocean-600 bg-ocean-800/80 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gold-400 border-b border-ocean-750 pb-2">
              战斗面板
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                { label: "生命值 (HP)", value: panelStats.hp },
                { label: "物理攻击 (ATK)", value: panelStats.atk },
                { label: "物理防御 (DEF)", value: panelStats.def },
                { label: "魔法攻击 (MAG)", value: panelStats.mag },
                { label: "魔法防御 (MDF)", value: panelStats.mdf },
                { label: "行动速度 (SPD)", value: panelStats.spd },
                { label: "幸运值 (LUK)", value: panelStats.luk },
                { label: "最大承载 (LOAD)", value: panelStats.equipLoad },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="rounded border border-ocean-750 bg-ocean-900/20 p-2"
                >
                  <div className="text-xs text-parchment-dark">{label}</div>
                  <div className="text-base font-bold text-parchment mt-0.5">
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 右半栏：装备与背包 */}
        <div className="space-y-4">
          {/* 装备栏 */}
          <div className="rounded-lg border border-ocean-600 bg-ocean-800/80 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gold-400 border-b border-ocean-750 pb-2">
              装备栏
            </h3>
            <div className="space-y-2.5">
              {[
                { key: "weapon", label: "主手武器", placeholder: "无主手武器" },
                { key: "armor", label: "铠甲防具", placeholder: "无铠甲防护" },
                {
                  key: "accessory1",
                  label: "首饰饰品 1",
                  placeholder: "无饰品",
                },
                {
                  key: "accessory2",
                  label: "首饰饰品 2",
                  placeholder: "无饰品",
                },
              ].map(({ key, label, placeholder }) => {
                const item = equipment[key as keyof typeof equipment];
                return (
                  <div
                    key={key}
                    className="flex items-center justify-between rounded border border-ocean-750 bg-ocean-900/40 p-2"
                  >
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="text-[10px] text-parchment-dark font-medium">
                        {label}
                      </div>
                      {item ? (
                        <div className="min-w-0">
                          <span
                            className={`text-sm font-semibold truncate block ${getQualityColor(item.qualityLabel)}`}
                          >
                            {item.name}
                          </span>
                          <span className="text-[10px] text-parchment-dark block truncate mt-0.5">
                            {item.effectDescription}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-parchment-dark italic block mt-1">
                          {placeholder}
                        </span>
                      )}
                    </div>
                    {item && (
                      <button
                        type="button"
                        disabled={isPending || blockedByVoyage}
                        onClick={() => handleUnequip(key)}
                        className="rounded bg-ocean-750 border border-ocean-600 px-3 py-1.5 text-xs text-parchment hover:text-gold-400 transition-colors disabled:opacity-50"
                      >
                        卸下
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 背包装备物品 */}
          <div className="rounded-lg border border-ocean-600 bg-ocean-800/80 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gold-400 border-b border-ocean-750 pb-2">
              个人背包
            </h3>
            {unequippedItems.length === 0 ? (
              <p className="text-xs text-parchment-dark py-4 text-center">
                背包空空如也。
              </p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {unequippedItems.map((item) => (
                  <div
                    key={item.uid}
                    className="rounded border border-ocean-750 bg-ocean-900/20 p-2.5 space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className={`font-bold truncate ${getQualityColor(item.qualityLabel)}`}
                        >
                          {item.name}
                        </span>
                        <span className="rounded bg-ocean-700 px-1 py-0.5 text-[9px] text-parchment-dark shrink-0">
                          {item.typeLabel}
                        </span>
                      </div>
                      <div className="text-[10px] text-parchment-dark shrink-0">
                        数量: {item.quantity}
                      </div>
                    </div>
                    <p className="text-[10px] text-parchment-dark leading-relaxed">
                      {item.effectDescription}
                    </p>
                    {item.description && (
                      <p className="text-[9px] text-parchment-dark/70 italic leading-relaxed border-t border-ocean-700/30 pt-1">
                        {item.description}
                      </p>
                    )}
                    {/* 操作按钮 */}
                    {["weapon", "armor", "accessory"].includes(item.type) &&
                      !blockedByVoyage && (
                        <div className="flex justify-end gap-2 pt-0.5">
                          {item.type === "accessory" ? (
                            <>
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() =>
                                  handleEquip(item.uid, "accessory1")
                                }
                                className="rounded bg-gold-500 hover:bg-gold-400 px-2 py-1 text-[10px] font-bold text-ocean-900 transition-colors"
                              >
                                装备饰品1
                              </button>
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() =>
                                  handleEquip(item.uid, "accessory2")
                                }
                                className="rounded bg-gold-500 hover:bg-gold-400 px-2 py-1 text-[10px] font-bold text-ocean-900 transition-colors"
                              >
                                装备饰品2
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() =>
                                handleEquip(
                                  item.uid,
                                  item.type === "weapon" ? "weapon" : "armor",
                                )
                              }
                              className="rounded bg-gold-500 hover:bg-gold-400 px-3 py-1 text-[10px] font-bold text-ocean-900 transition-colors"
                            >
                              装备
                            </button>
                          )}
                        </div>
                      )}
                  </div>
                ))}
              </div>
            )}
          </div>
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
