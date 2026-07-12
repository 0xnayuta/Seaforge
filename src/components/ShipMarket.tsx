"use client";

import type { AvailableShipView } from "../types/game-view";

interface ShipMarketProps {
  readonly availableShips: readonly AvailableShipView[];
  readonly isPending: boolean;
  readonly onBuyShip: (formData: FormData) => void;
}

export function ShipMarket({
  availableShips,
  isPending,
  onBuyShip,
}: ShipMarketProps) {
  if (availableShips.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-parchment-dark">
        可购买的船只
      </h3>
      {availableShips.map((ship) => (
        <div
          key={ship.typeId}
          className="rounded-lg border border-ocean-600 bg-ocean-800/80 p-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-semibold text-gold-400">
                {ship.name}
              </span>
              <div className="mt-1 flex gap-3 text-xs text-parchment-dark">
                <span>舱容 {ship.capacity}</span>
                <span>速度 {ship.speed}</span>
                <span className="text-gold-400">
                  {ship.price.toLocaleString()} 金币
                </span>
              </div>
            </div>
            <form action={onBuyShip}>
              <input type="hidden" name="typeId" value={ship.typeId} />
              <button
                type="submit"
                disabled={!ship.canAfford || ship.fleetFull || isPending}
                className="rounded bg-gold-500 px-4 py-2 text-sm font-bold text-ocean-900 hover:bg-gold-400 transition-colors disabled:opacity-50"
              >
                {ship.fleetFull ? "舰队已满" : "购买"}
              </button>
            </form>
          </div>
        </div>
      ))}
    </div>
  );
}
