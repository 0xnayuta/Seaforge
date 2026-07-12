"use client";

import type { InventoryItemView } from "../types/game-view";
import { getQualityColor } from "./quality-color";

interface CharacterInventoryProps {
  readonly unequippedItems: readonly InventoryItemView[];
  readonly isPending: boolean;
  readonly blockedByVoyage: boolean;
  readonly onEquip: (itemUid: string, slot: string) => void;
}

export function CharacterInventory({
  unequippedItems,
  isPending,
  blockedByVoyage,
  onEquip,
}: CharacterInventoryProps) {
  return (
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
                          onClick={() => onEquip(item.uid, "accessory1")}
                          className="rounded bg-gold-500 hover:bg-gold-400 px-2 py-1 text-[10px] font-bold text-ocean-900 transition-colors"
                        >
                          装备饰品1
                        </button>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => onEquip(item.uid, "accessory2")}
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
                          onEquip(
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
  );
}
