"use client";

import type { AvailableEquipmentView } from "../types/game-view";

interface EquipmentShopProps {
  readonly availableEquipments: readonly AvailableEquipmentView[];
  readonly isPending: boolean;
  readonly isEquipmentPending: boolean;
  readonly onBuyEquipment: (id: string) => void;
}

export function EquipmentShop({
  availableEquipments,
  isPending,
  isEquipmentPending,
  onBuyEquipment,
}: EquipmentShopProps) {
  return (
    <div className="rounded-lg border border-ocean-600 bg-ocean-800/80 p-4 space-y-3">
      <h3 className="text-sm font-semibold text-gold-400">港口铁匠铺</h3>
      {availableEquipments.length === 0 ? (
        <p className="text-xs text-parchment-dark">
          该港口铁匠铺暂无多余装备出售。
        </p>
      ) : (
        <div className="space-y-2">
          {availableEquipments.map((eq) => (
            <div
              key={eq.id}
              className="flex items-center justify-between border-b border-ocean-700/50 pb-2 text-sm"
            >
              <div>
                <div className="font-semibold text-parchment flex items-center gap-2">
                  {eq.name}
                  <span className="rounded bg-ocean-700 px-1.5 py-0.5 text-xs text-parchment-dark">
                    {eq.typeLabel}
                  </span>
                </div>
                <p className="text-xs text-parchment-dark mt-0.5">
                  {eq.effectDescription}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-gold-400 font-medium">
                  {eq.price.toLocaleString()} 金币
                </span>
                <button
                  type="button"
                  disabled={!eq.canAfford || isEquipmentPending || isPending}
                  onClick={() => onBuyEquipment(eq.id)}
                  className="rounded bg-gold-500 px-3 py-1.5 text-xs font-bold text-ocean-900 hover:bg-gold-400 transition-colors disabled:opacity-50"
                >
                  购买
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
