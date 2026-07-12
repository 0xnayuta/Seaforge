"use client";

import type { FleetShipSummaryView } from "../types/game-view";

interface ShipSelectorProps {
  readonly ships: readonly FleetShipSummaryView[];
  readonly selectedShipId: string;
  readonly isPending: boolean;
}

export function ShipSelector({
  ships,
  selectedShipId,
  isPending,
}: ShipSelectorProps) {
  if (ships.length === 0) return null;

  return (
    <div className="flex items-center justify-between rounded-lg border border-ocean-600 bg-ocean-800/80 p-3">
      <span className="text-sm text-parchment-dark">选择要改造/维修的船只</span>
      <select
        value={selectedShipId}
        disabled={isPending}
        onChange={(e) => {
          const url = new URL(window.location.href);
          url.searchParams.set("shipId", e.target.value);
          window.location.href = url.pathname + url.search;
        }}
        className="rounded border border-ocean-600 bg-ocean-900 px-3 py-1 text-sm text-parchment outline-none"
      >
        {ships.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name} ({s.typeName}) {s.isActive ? "[旗舰]" : ""}
          </option>
        ))}
      </select>
    </div>
  );
}
