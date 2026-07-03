"use client";
import { useState, useTransition } from "react";
import type { FleetView } from "../types/game-view";

interface FleetPanelProps {
  readonly view: FleetView;
  readonly onSwitchShip: (formData: FormData) => Promise<FleetView>;
  readonly onSetArmament: (formData: FormData) => Promise<FleetView>;
}

export function FleetPanel({
  view,
  onSwitchShip,
  onSetArmament,
}: FleetPanelProps) {
  const [displayView, setDisplayView] = useState(view);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleAction = (
    action: (formData: FormData) => Promise<FleetView>,
    errorPrefix: string,
  ) => {
    return (formData: FormData) => {
      setError(null);
      startTransition(async () => {
        try {
          const nextView = await action(formData);
          setDisplayView(nextView);
        } catch (e) {
          setError(e instanceof Error ? e.message : `${errorPrefix}失败`);
        }
      });
    };
  };

  const handleSwitchShip = handleAction(onSwitchShip, "切换旗舰");
  const handleSetArmament = handleAction(onSetArmament, "设置武装");
  const blockedByVoyage = displayView.blockedByVoyage;

  // 聚合计算整个舰队的货物明细
  const consolidatedCargo: Record<
    string,
    {
      goodName: string;
      quantity: number;
      totalCost: number;
      category: string;
      volume: number;
    }
  > = {};
  let totalVolumeUsed = 0;

  for (const ship of displayView.ships) {
    for (const item of ship.cargo) {
      if (!consolidatedCargo[item.goodsId]) {
        consolidatedCargo[item.goodsId] = {
          goodName: item.goodName,
          quantity: 0,
          totalCost: 0,
          category: item.category,
          volume: item.volume,
        };
      }
      consolidatedCargo[item.goodsId].quantity += item.quantity;
      consolidatedCargo[item.goodsId].totalCost +=
        item.buyPrice * item.quantity;
      totalVolumeUsed += item.quantity * item.volume;
    }
  }

  const cargoItems = Object.values(consolidatedCargo);

  return (
    <div className="flex-1 p-4 max-w-2xl mx-auto w-full space-y-4">
      {error && (
        <div className="rounded-lg border border-red-500 bg-red-500/10 p-3 text-sm text-red-400 text-center">
          {error}
        </div>
      )}

      {/* 标题栏 — 舰队状态 */}
      <div className="rounded-lg border border-ocean-600 bg-ocean-800/80 px-4 py-2 text-sm flex items-center justify-between">
        <div>
          <span className="font-bold text-gold-400">
            舰队 — {displayView.ships.length}/{displayView.maxShips} 艘
          </span>
          <span className="ml-4 text-parchment-dark">
            金币 {displayView.fleetGold.toLocaleString()}
          </span>
        </div>
        <div className="text-xs text-parchment-dark">
          舰队总载货体量:{" "}
          <span className="text-gold-400">{totalVolumeUsed}</span>
        </div>
      </div>

      {/* 舰队货物总览 (Consolidated Cargo Hold) */}
      <div className="rounded-lg border border-ocean-600 bg-ocean-800/80 p-4">
        <h3 className="mb-3 text-sm font-semibold text-gold-400">
          舰队货物总览
        </h3>
        {cargoItems.length === 0 ? (
          <p className="text-xs text-parchment-dark text-center py-2">
            舰队所有船只空空如也，去交易所采购些货物吧
          </p>
        ) : (
          <div className="overflow-hidden border border-ocean-600/50 rounded">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-ocean-700/50 text-parchment-dark border-b border-ocean-600">
                  <th className="px-3 py-2 font-semibold">货物</th>
                  <th className="px-3 py-2 font-semibold">类型</th>
                  <th className="px-3 py-2 font-semibold text-center">总量</th>
                  <th className="px-3 py-2 font-semibold text-center">
                    占用体积
                  </th>
                  <th className="px-3 py-2 font-semibold text-right">总成本</th>
                </tr>
              </thead>
              <tbody>
                {cargoItems.map((item) => (
                  <tr
                    key={item.goodName}
                    className="border-b border-ocean-750/30 hover:bg-ocean-700/20 last:border-0"
                  >
                    <td className="px-3 py-2 font-medium text-parchment">
                      {item.goodName}
                    </td>
                    <td className="px-3 py-2 text-parchment-dark">
                      {item.category}
                    </td>
                    <td className="px-3 py-2 text-center text-parchment">
                      {item.quantity}
                    </td>
                    <td className="px-3 py-2 text-center text-parchment-dark">
                      {item.quantity * item.volume}
                    </td>
                    <td className="px-3 py-2 text-right text-gold-400 font-medium">
                      {item.totalCost.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 舰队船只列表 */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-parchment-dark">舰队船只</h3>
        {displayView.ships.map((ship) => {
          const hpPct =
            ship.maxDurability > 0
              ? Math.round((ship.durability / ship.maxDurability) * 100)
              : 0;
          const hpColor =
            hpPct > 60
              ? "bg-green-500"
              : hpPct > 30
                ? "bg-yellow-500"
                : "bg-red-500";
          const cargoPct =
            ship.cargoCapacity > 0
              ? Math.round((ship.cargoUsed / ship.cargoCapacity) * 100)
              : 0;

          return (
            <div
              key={ship.id}
              className={`rounded-lg border p-4 ${
                ship.isActive
                  ? "border-gold-500 bg-ocean-800"
                  : "border-ocean-600 bg-ocean-800/60 hover:bg-ocean-700/60"
              } transition-colors`}
            >
              {/* 卡片头部 */}
              <div className="flex items-center justify-between border-b border-ocean-700/40 pb-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gold-400">
                    {ship.name}
                  </span>
                  <span className="text-xs text-parchment-dark">
                    {ship.typeName}
                  </span>
                  {ship.isActive && (
                    <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded border border-green-500/30">
                      旗舰
                    </span>
                  )}
                </div>
                {!ship.isActive && (
                  <form action={handleSwitchShip}>
                    <input type="hidden" name="shipId" value={ship.id} />
                    <button
                      type="submit"
                      disabled={blockedByVoyage || isPending}
                      className="rounded border border-ocean-600 px-3 py-1 text-xs text-parchment-dark hover:border-gold-500 hover:text-gold-400 transition-colors disabled:opacity-50"
                    >
                      设为旗舰
                    </button>
                  </form>
                )}
              </div>

              {/* 船只基本属性 */}
              <div className="grid grid-cols-3 gap-3 text-xs text-parchment-dark">
                {/* HP */}
                <div>
                  <div className="mb-0.5 flex justify-between">
                    <span>耐久</span>
                    <span className={hpColor.replace("bg-", "text-")}>
                      {ship.durability}/{ship.maxDurability}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-ocean-700">
                    <div
                      className={`h-full rounded-full ${hpColor}`}
                      style={{ width: `${hpPct}%` }}
                    />
                  </div>
                </div>
                {/* 舱容 */}
                <div>
                  <span className="text-parchment-dark">
                    舱容 {ship.cargoUsed}/{ship.cargoCapacity}
                  </span>
                  <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-ocean-700">
                    <div
                      className="h-full rounded-full bg-blue-500"
                      style={{ width: `${cargoPct}%` }}
                    />
                  </div>
                </div>
                {/* 速度 */}
                <div className="flex items-center justify-end text-parchment">
                  速度: {ship.speed}
                </div>
              </div>

              {/* 主船武装配置更改 */}
              {ship.isActive && (
                <div className="mt-3 border-t border-ocean-700/40 pt-2 flex items-center justify-between text-xs">
                  <span className="text-parchment-dark">
                    武装等级:{" "}
                    <span className="text-gold-400 font-semibold">
                      {ship.armamentLabel}
                    </span>
                  </span>
                  {!blockedByVoyage && (
                    <form action={handleSetArmament} className="flex gap-1.5">
                      <input type="hidden" name="shipId" value={ship.id} />
                      {[0, 1, 2].map((level) => (
                        <button
                          key={level}
                          type="submit"
                          name="level"
                          value={level}
                          disabled={isPending}
                          className={`rounded px-2.5 py-0.5 text-[11px] transition-colors disabled:opacity-50 ${
                            ship.armamentLevel === level
                              ? "bg-gold-500 text-ocean-900 font-bold"
                              : "border border-ocean-600 text-parchment-dark hover:border-gold-500"
                          }`}
                        >
                          {level === 0 ? "满载" : level === 1 ? "标准" : "战斗"}
                        </button>
                      ))}
                    </form>
                  )}
                </div>
              )}

              {/* 船只个人货箱清单 */}
              {ship.cargo.length > 0 && (
                <div className="mt-3 border-t border-ocean-700/40 pt-2">
                  <span className="text-[10px] font-semibold text-parchment-dark block mb-1">
                    装载货物明细
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {ship.cargo.map((item) => (
                      <div
                        key={item.goodsId}
                        className="bg-ocean-900/50 border border-ocean-700/50 rounded px-2 py-0.5 text-xs flex gap-1 items-center"
                      >
                        <span className="text-parchment">{item.goodName}</span>
                        <span className="text-gold-400 font-medium">
                          x{item.quantity}
                        </span>
                        <span className="text-parchment-dark text-[10px]">
                          ({item.buyPrice})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 返回港口 */}
      <div className="text-center pt-2">
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
