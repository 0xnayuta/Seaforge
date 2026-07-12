"use client";

import type { ComponentView, ShipView } from "../types/game-view";

interface ShipMaintenanceProps {
  readonly shipDetail: ShipView;
  readonly shipName: string;
  readonly shipTypeName: string;
  readonly shipId: string;
  readonly blockedByVoyage: boolean;
  readonly isPending: boolean;
  readonly onRepair: (formData: FormData) => void;
  readonly onUpgrade: (formData: FormData) => void;
}

// ---- 本地计算 ----

function getDurPercent(detail: ShipView): number {
  return detail.maxDurability > 0
    ? Math.round((detail.durability / detail.maxDurability) * 100)
    : 0;
}

function getDurColor(pct: number): string {
  return pct > 60 ? "bg-green-500" : pct > 30 ? "bg-yellow-500" : "bg-red-500";
}

function getDurTextColor(pct: number): string {
  return pct > 60
    ? "text-green-400"
    : pct > 30
      ? "text-yellow-400"
      : "text-red-400";
}

// ---- 子组件：部件升级卡片 ----

interface ComponentCardProps {
  readonly component: ComponentView;
  readonly shipId: string;
  readonly blockedByVoyage: boolean;
  readonly onUpgrade: (formData: FormData) => void;
  readonly isPending: boolean;
}

function ComponentCard({
  component,
  shipId,
  blockedByVoyage,
  onUpgrade,
  isPending,
}: ComponentCardProps) {
  const isMaxed = component.level >= component.maxLevel;
  const btnLabel = blockedByVoyage ? "航行中" : isMaxed ? "已达最高" : "升级";

  return (
    <div className="rounded-lg border border-ocean-600 bg-ocean-700/60 p-3">
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
          <input type="hidden" name="shipId" value={shipId} />
          <input type="hidden" name="component" value={component.id} />
          <button
            type="submit"
            disabled={!component.canUpgrade || isPending}
            className="rounded bg-gold-500 px-4 py-2 text-sm font-bold text-ocean-900 hover:bg-gold-400 transition-colors disabled:opacity-50"
          >
            {btnLabel}
          </button>
        </form>
      </div>
    </div>
  );
}

// ---- 主组件 ----

export function ShipMaintenance({
  shipDetail,
  shipName,
  shipTypeName,
  shipId,
  blockedByVoyage,
  isPending,
  onRepair,
  onUpgrade,
}: ShipMaintenanceProps) {
  const durPct = getDurPercent(shipDetail);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gold-400">
        船只属性 & 维护 — {shipName} ({shipTypeName})
      </h3>

      {/* 耐久条 */}
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="text-parchment-dark">船体耐久</span>
          <span className={getDurTextColor(durPct)}>
            {shipDetail.durability} / {shipDetail.maxDurability}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-ocean-700">
          <div
            className={`h-full rounded-full transition-all ${getDurColor(durPct)}`}
            style={{ width: `${durPct}%` }}
          />
        </div>
      </div>

      {/* 维修表单 */}
      {shipDetail.durability < shipDetail.maxDurability && !blockedByVoyage && (
        <form
          action={onRepair}
          className="rounded-lg border border-ocean-600 bg-ocean-700/60 p-3"
        >
          <input type="hidden" name="shipId" value={shipId} />
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm text-parchment-dark">修理船体</span>
              <p className="text-xs text-parchment-dark mt-1">
                费用：{shipDetail.repairCost} 金币
              </p>
            </div>
            <button
              type="submit"
              disabled={!shipDetail.canRepair || isPending}
              className="rounded bg-gold-500 px-4 py-2 text-sm font-bold text-ocean-900 hover:bg-gold-400 transition-colors disabled:opacity-50"
            >
              维修
            </button>
          </div>
        </form>
      )}

      {/* 部件升级列表 */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-parchment-dark">部件升级</h4>
        {shipDetail.components.map((comp) => (
          <ComponentCard
            key={comp.id}
            component={comp}
            shipId={shipId}
            blockedByVoyage={blockedByVoyage}
            onUpgrade={onUpgrade}
            isPending={isPending}
          />
        ))}
      </div>
    </div>
  );
}
