"use client";

import { useActionState } from "react";
import type { ShipView } from "../types/game-view";

interface ShipyardPanelProps {
  readonly view: ShipView;
  readonly onUpgrade: (
    _prev: ShipView | null,
    formData: FormData,
  ) => Promise<ShipView>;
  readonly onRepair: (
    _prev: ShipView | null,
    formData?: FormData,
  ) => Promise<ShipView>;
}

export function ShipyardPanel({
  view,
  onUpgrade,
  onRepair,
}: ShipyardPanelProps) {
  const [afterUpgrade, doUpgrade] = useActionState(onUpgrade, null);
  const [afterRepair, doRepair] = useActionState(onRepair, null);
  const displayView = afterUpgrade ?? afterRepair ?? view;
  const blockedByVoyage = displayView.blockedByVoyage;

  const durPercent =
    displayView.maxDurability > 0
      ? Math.round((displayView.durability / displayView.maxDurability) * 100)
      : 0;
  const durColor =
    durPercent > 60
      ? "bg-green-500"
      : durPercent > 30
        ? "bg-yellow-500"
        : "bg-red-500";
  const durTextColor =
    durPercent > 60
      ? "text-green-400"
      : durPercent > 30
        ? "text-yellow-400"
        : "text-red-400";

  return (
    <div className="flex-1 p-4 max-w-2xl mx-auto w-full space-y-4">
      <div className="rounded-lg border border-ocean-600 bg-ocean-800/80 px-4 py-2 text-sm">
        <span className="font-bold text-gold-400">
          {displayView.shipName} — 造船厂
        </span>
        <span className="ml-4 text-parchment-dark">
          金币 {displayView.fleetGold.toLocaleString()}
        </span>
      </div>

      {/* 耐久条 */}
      <div className="rounded-lg border border-ocean-600 bg-ocean-800/80 p-4">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-parchment-dark">船体耐久</span>
          <span className={durTextColor}>
            {displayView.durability} / {displayView.maxDurability}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-ocean-700">
          <div
            className={`h-full rounded-full transition-all ${durColor}`}
            style={{ width: `${durPercent}%` }}
          />
        </div>
      </div>

      {/* 维修 */}
      {displayView.durability < displayView.maxDurability &&
        !blockedByVoyage && (
          <form
            action={doRepair}
            className="rounded-lg border border-ocean-600 bg-ocean-800/80 p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-parchment-dark">维修船体</span>
                <p className="text-xs text-parchment-dark mt-1">
                  费用：{displayView.repairCost} 金币
                </p>
              </div>
              <button
                type="submit"
                disabled={!displayView.canRepair}
                className="rounded bg-gold-500 px-4 py-2 text-sm font-bold text-ocean-900 hover:bg-gold-400 transition-colors disabled:opacity-50"
              >
                维修
              </button>
            </div>
          </form>
        )}

      {/* 部件升级 */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-parchment-dark">部件升级</h3>
        {displayView.components.map((comp) => (
          <ComponentCard
            key={comp.id}
            component={comp}
            blockedByVoyage={blockedByVoyage}
            onUpgrade={doUpgrade}
          />
        ))}
      </div>

      <div className="text-center">
        <a
          href="/"
          className="inline-block rounded border border-ocean-600 px-4 py-2 text-sm text-parchment-dark hover:bg-ocean-700 transition-colors"
        >
          返回港口
        </a>
      </div>
    </div>
  );
}

// ---- 部件卡片 ----

interface ComponentCardProps {
  readonly component: {
    readonly id: string;
    readonly label: string;
    readonly level: number;
    readonly maxLevel: number;
    readonly nextCost: number | null;
    readonly canUpgrade: boolean;
    readonly upgradeDescription: string;
  };
  readonly blockedByVoyage: boolean;
  readonly onUpgrade: (formData: FormData) => void;
}

function ComponentCard({
  component,
  blockedByVoyage,
  onUpgrade,
}: ComponentCardProps) {
  const isMaxed = component.level >= component.maxLevel;
  const btnLabel = blockedByVoyage ? "航行中" : isMaxed ? "已达最高" : "升级";

  return (
    <div className="rounded-lg border border-ocean-600 bg-ocean-800/80 p-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gold-400">
              {component.label}
            </span>
            <span className="text-xs text-parchment-dark">
              Lv.{component.level}/{component.maxLevel}
            </span>
          </div>
          {!isMaxed && (
            <p className="text-xs text-parchment-dark mt-1">
              {component.upgradeDescription}
              {component.nextCost != null && (
                <span className="ml-2 text-gold-400">
                  {component.nextCost.toLocaleString()} 金币
                </span>
              )}
            </p>
          )}
          {isMaxed && <p className="text-xs text-green-400 mt-1">已满级</p>}
        </div>
        <form action={onUpgrade}>
          <input type="hidden" name="component" value={component.id} />
          <button
            type="submit"
            disabled={!component.canUpgrade}
            className="rounded bg-gold-500 px-4 py-2 text-sm font-bold text-ocean-900 hover:bg-gold-400 transition-colors disabled:opacity-50"
          >
            {btnLabel}
          </button>
        </form>
      </div>
    </div>
  );
}
