"use client";

import type { ShipView } from "../types/game-view";

interface ShipyardPanelProps {
  readonly view: ShipView;
  readonly onUpgrade: (formData: FormData) => void;
  readonly onRepair: (formData: FormData) => void;
  readonly afterUpgrade: ShipView | null;
  readonly afterRepair: ShipView | null;
}

export function ShipyardPanel({
  view,
  onUpgrade,
  onRepair,
  afterUpgrade,
  afterRepair,
}: ShipyardPanelProps) {
  const displayView = afterUpgrade ?? afterRepair ?? view;
  const blockedByVoyage = displayView.blockedByVoyage;
  const hpPercent =
    displayView.maxHp > 0
      ? Math.round((displayView.currentHp / displayView.maxHp) * 100)
      : 0;

  const hpColor =
    hpPercent > 60
      ? "bg-green-500"
      : hpPercent > 30
        ? "bg-yellow-500"
        : "bg-red-500";

  const hpTextColor =
    hpPercent > 60
      ? "text-green-400"
      : hpPercent > 30
        ? "text-yellow-400"
        : "text-red-400";

  return (
    <div className="flex-1 p-4 max-w-2xl mx-auto w-full space-y-4">
      <div className="rounded-lg border border-ocean-600 bg-ocean-800/80 px-4 py-2 text-sm">
        <span className="font-bold text-gold-400">造船厂</span>
      </div>

      {/* 当前船只 */}
      <ShipInfoCard
        shipName={displayView.shipName}
        upgradeLevel={displayView.upgradeLevel}
        capacity={displayView.capacity}
        speed={displayView.speed}
        currentHp={displayView.currentHp}
        maxHp={displayView.maxHp}
        hpPercent={hpPercent}
        hpColor={hpColor}
        hpTextColor={hpTextColor}
      />

      {/* 维修区域 */}
      {displayView.currentHp < displayView.maxHp && !blockedByVoyage && (
        <RepairForm
          repairCost={displayView.repairCost}
          canRepair={displayView.canRepair}
          onRepair={onRepair}
        />
      )}

      {/* 升级区域 */}
      <UpgradeForm
        upgradeCost={displayView.upgradeCost}
        canUpgrade={displayView.canUpgrade}
        blockedByVoyage={blockedByVoyage}
        onUpgrade={onUpgrade}
      />

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

// ---- 子组件 ----

interface ShipInfoCardProps {
  readonly shipName: string;
  readonly upgradeLevel: number;
  readonly capacity: number;
  readonly speed: number;
  readonly currentHp: number;
  readonly maxHp: number;
  readonly hpPercent: number;
  readonly hpColor: string;
  readonly hpTextColor: string;
}

function ShipInfoCard({
  shipName,
  upgradeLevel,
  capacity,
  speed,
  currentHp,
  maxHp,
  hpPercent,
  hpColor,
  hpTextColor,
}: ShipInfoCardProps) {
  return (
    <div className="rounded-lg border border-ocean-600 bg-ocean-800/80 p-4">
      <h3 className="text-lg font-semibold text-gold-400">{shipName}</h3>
      <div className="mt-3 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-parchment-dark">等级</span>
          <span className="text-parchment">Lv.{upgradeLevel}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-parchment-dark">舱容</span>
          <span className="text-parchment">{capacity}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-parchment-dark">航速</span>
          <span className="text-parchment">{speed}</span>
        </div>

        {/* HP 条 */}
        <div className="pt-1">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-parchment-dark">船体耐久</span>
            <span className={hpTextColor}>
              {currentHp} / {maxHp}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-ocean-700">
            <div
              className={`h-full rounded-full transition-all ${hpColor}`}
              style={{ width: `${hpPercent}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

interface RepairFormProps {
  readonly repairCost: number;
  readonly canRepair: boolean;
  readonly onRepair: (formData: FormData) => void;
}

function RepairForm({ repairCost, canRepair, onRepair }: RepairFormProps) {
  return (
    <form
      action={onRepair}
      className="rounded-lg border border-ocean-600 bg-ocean-800/80 p-4"
    >
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm text-parchment-dark">维修船体</span>
          <p className="text-xs text-parchment-dark mt-1">
            费用：{repairCost} 金币
          </p>
        </div>
        <button
          type="submit"
          disabled={!canRepair}
          className="rounded bg-gold-500 px-4 py-2 text-sm font-bold text-ocean-900 hover:bg-gold-400 transition-colors disabled:opacity-50"
        >
          维修
        </button>
      </div>
    </form>
  );
}

interface UpgradeFormProps {
  readonly upgradeCost: number | null;
  readonly canUpgrade: boolean;
  readonly blockedByVoyage: boolean;
  readonly onUpgrade: (formData: FormData) => void;
}

function UpgradeForm({
  upgradeCost,
  canUpgrade,
  blockedByVoyage,
  onUpgrade,
}: UpgradeFormProps) {
  return (
    <div className="rounded-lg border border-ocean-600 bg-ocean-800/80 p-4">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm text-parchment-dark">
            升级船只
            {upgradeCost !== null && (
              <span className="ml-2 text-xs text-gold-400">
                费用：{upgradeCost.toLocaleString()} 金币
              </span>
            )}
          </span>
          <p className="text-xs text-parchment-dark mt-1">
            升级后舱容扩大，耐久提升
          </p>
        </div>
        <form action={onUpgrade}>
          <button
            type="submit"
            disabled={!canUpgrade}
            className="rounded bg-gold-500 px-4 py-2 text-sm font-bold text-ocean-900 hover:bg-gold-400 transition-colors disabled:opacity-50"
          >
            {blockedByVoyage
              ? "航行中"
              : upgradeCost === null
                ? "已达最高"
                : "升级"}
          </button>
        </form>
      </div>
    </div>
  );
}
