"use client";

import type { EquippedItemView } from "../types/game-view";

interface ShipEquipmentProps {
  readonly equippedItems: readonly EquippedItemView[];
  readonly fleetInventory: readonly EquippedItemView[];
  readonly isPending: boolean;
  readonly isEquipmentPending: boolean;
  readonly blockedByVoyage: boolean;
  readonly onUnequip: (id: string) => void;
  readonly onEquip: (id: string) => void;
  readonly onSellEquipment: (id: string) => void;
}

export function ShipEquipment({
  equippedItems,
  fleetInventory,
  isPending,
  isEquipmentPending,
  blockedByVoyage,
  onUnequip,
  onEquip,
  onSellEquipment,
}: ShipEquipmentProps) {
  return (
    <div className="space-y-3 border-t border-ocean-700/40 pt-3">
      <h4 className="text-xs font-semibold text-parchment-dark">
        装备插槽 ({equippedItems.length} / 3)
      </h4>

      {/* 已装备列表 */}
      {equippedItems.length === 0 ? (
        <p className="text-xs text-parchment-dark">当前未配备任何装备。</p>
      ) : (
        <div className="space-y-2">
          {equippedItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded border border-ocean-750 bg-ocean-900/40 p-2 text-xs"
            >
              <div>
                <div className="font-semibold text-parchment flex items-center gap-1.5">
                  {item.name}
                  <span className="rounded bg-ocean-700 px-1 py-0.5 text-[10px] text-parchment-dark">
                    {item.typeLabel}
                  </span>
                </div>
                <p className="text-parchment-dark mt-0.5">
                  {item.effectDescription}
                </p>
              </div>
              <button
                type="button"
                disabled={isPending || blockedByVoyage}
                onClick={() => onUnequip(item.id)}
                className="rounded bg-ocean-750 border border-ocean-600 px-2 py-1 text-parchment-dark hover:text-parchment transition-colors animate-none"
              >
                卸下
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 可装配列表 (从舰队装备包中选择) */}
      {!blockedByVoyage && (
        <div className="space-y-2 pt-1">
          <h5 className="text-[11px] font-medium text-gold-400">可装配装备</h5>
          {fleetInventory.length === 0 ? (
            <p className="text-xs text-parchment-dark">
              仓库中无可用装备。请在港口铁匠铺购买。
            </p>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {fleetInventory.map((item, index) => {
                const isSameTypeEquipped = equippedItems.some(
                  (eq) => eq.type === item.type,
                );
                const slotsFull = equippedItems.length >= 3;

                return (
                  <div
                    key={`${item.id}-${index}`}
                    className="flex items-center justify-between rounded border border-ocean-700/60 bg-ocean-700/20 p-2 text-xs"
                  >
                    <div>
                      <span className="font-semibold text-parchment flex items-center gap-1">
                        {item.name}
                        <span className="rounded bg-ocean-700 px-1 py-0.5 text-[10px] text-parchment-dark">
                          {item.typeLabel}
                        </span>
                      </span>
                      <p className="text-parchment-dark text-[10px] mt-0.5">
                        {item.effectDescription}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={isPending || slotsFull || isSameTypeEquipped}
                        onClick={() => onEquip(item.id)}
                        className="rounded bg-gold-500 px-2.5 py-1 text-[11px] font-bold text-ocean-900 hover:bg-gold-400 transition-colors disabled:opacity-50"
                      >
                        {slotsFull
                          ? "槽位已满"
                          : isSameTypeEquipped
                            ? "类型冲突"
                            : "装配"}
                      </button>
                      <button
                        type="button"
                        disabled={isPending || isEquipmentPending}
                        onClick={() => onSellEquipment(item.id)}
                        className="rounded border border-red-500/40 bg-red-500/10 px-2.5 py-1 text-[11px] text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                      >
                        出售 ({item.sellPrice.toLocaleString()})
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
