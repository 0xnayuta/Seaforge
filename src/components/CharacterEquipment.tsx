"use client";

import type { EquippedCharacterItemView } from "../types/game-view";

interface CharacterEquipmentProps {
  readonly equipment: {
    readonly weapon: EquippedCharacterItemView | null;
    readonly armor: EquippedCharacterItemView | null;
    readonly accessory1: EquippedCharacterItemView | null;
    readonly accessory2: EquippedCharacterItemView | null;
  };
  readonly isPending: boolean;
  readonly blockedByVoyage: boolean;
  readonly onUnequip: (slot: string) => void;
}

function getQualityColor(quality: string): string {
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
}

export function CharacterEquipment({
  equipment,
  isPending,
  blockedByVoyage,
  onUnequip,
}: CharacterEquipmentProps) {
  return (
    <div className="rounded-lg border border-ocean-600 bg-ocean-800/80 p-4 space-y-3">
      <h3 className="text-sm font-semibold text-gold-400 border-b border-ocean-750 pb-2">
        装备栏
      </h3>
      <div className="space-y-2.5">
        {[
          {
            key: "weapon" as const,
            label: "主手武器",
            placeholder: "无主手武器",
          },
          {
            key: "armor" as const,
            label: "铠甲防具",
            placeholder: "无铠甲防护",
          },
          {
            key: "accessory1" as const,
            label: "首饰饰品 1",
            placeholder: "无饰品",
          },
          {
            key: "accessory2" as const,
            label: "首饰饰品 2",
            placeholder: "无饰品",
          },
        ].map(({ key, label, placeholder }) => {
          const item = equipment[key];
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
                  onClick={() => onUnequip(key)}
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
  );
}
