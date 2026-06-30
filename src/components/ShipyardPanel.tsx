"use client";
import { useState, useTransition } from "react";
import {
  buyEquipmentAction,
  equipItemAction,
  sellEquipmentAction,
  unequipItemAction,
} from "../app/actions/equipment";
import { SHIP_SELL_RATIO } from "../data/formulas";
import { SHIPS } from "../data/ships";
import type { ComponentView, ShipyardView } from "../types/game-view";

interface ShipyardPanelProps {
  readonly view: ShipyardView;
  readonly onBuyShip: (formData: FormData) => Promise<ShipyardView>;
  readonly onSellShip: (formData: FormData) => Promise<ShipyardView>;
  readonly onUpgrade: (
    _prev: ShipyardView | null,
    formData: FormData,
  ) => Promise<ShipyardView>;
  readonly onRepair: (
    _prev: ShipyardView | null,
    formData: FormData,
  ) => Promise<ShipyardView>;
}

export function ShipyardPanel({
  view,
  onBuyShip,
  onSellShip,
  onUpgrade,
  onRepair,
}: ShipyardPanelProps) {
  const [displayView, setDisplayView] = useState(view);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [isEquipmentPending, setIsEquipmentPending] = useState(false);
  const handleAction = (
    action: (formData: FormData) => Promise<ShipyardView>,
    errorPrefix: string,
  ) => {
    return async (formData: FormData) => {
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

  const handleBuyShip = handleAction(onBuyShip, "购买船只");
  const handleSellShip = handleAction(onSellShip, "出售船只");

  const handleUpgrade = async (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      try {
        const nextView = await onUpgrade(displayView, formData);
        setDisplayView(nextView);
      } catch (e) {
        setError(e instanceof Error ? e.message : "升级失败");
      }
    });
  };

  const handleRepair = async (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      try {
        const nextView = await onRepair(displayView, formData);
        setDisplayView(nextView);
      } catch (e) {
        setError(e instanceof Error ? e.message : "维修失败");
      }
    });
  };

  const handleEquipItem = async (equipmentId: string) => {
    setError(null);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("shipId", selectedShipId);
        fd.set("equipmentId", equipmentId);
        const nextView = await equipItemAction(fd);
        setDisplayView(nextView);
      } catch (e) {
        setError(e instanceof Error ? e.message : "装备失败");
      }
    });
  };

  const handleUnequipItem = async (equipmentId: string) => {
    setError(null);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("shipId", selectedShipId);
        fd.set("equipmentId", equipmentId);
        const nextView = await unequipItemAction(fd);
        setDisplayView(nextView);
      } catch (e) {
        setError(e instanceof Error ? e.message : "卸下失败");
      }
    });
  };
  const handleBuyEquipment = async (equipmentId: string) => {
    setIsEquipmentPending(true);
    setError(null);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("equipmentId", equipmentId);
        fd.set("shipId", selectedShipId);
        const nextView = await buyEquipmentAction(fd);
        setDisplayView(nextView);
      } catch (e) {
        setError(e instanceof Error ? e.message : "购买装备失败");
      } finally {
        setIsEquipmentPending(false);
      }
    });
  };

  const handleSellEquipment = async (equipmentId: string) => {
    setIsEquipmentPending(true);
    setError(null);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("equipmentId", equipmentId);
        fd.set("shipId", selectedShipId);
        const nextView = await sellEquipmentAction(fd);
        setDisplayView(nextView);
      } catch (e) {
        setError(e instanceof Error ? e.message : "出售装备失败");
      } finally {
        setIsEquipmentPending(false);
      }
    });
  };

  const selectedShipId = displayView.selectedShipId;
  const selectedShipSummary = displayView.ships.find(
    (s) => s.id === selectedShipId,
  );
  const selectedShipDetail = displayView.selectedShipDetail;
  const blockedByVoyage = displayView.blockedByVoyage;

  const isLastShip = displayView.ships.length <= 1;
  const hasCargo = selectedShipSummary
    ? selectedShipSummary.cargoUsed > 0
    : false;
  const canSell = !isLastShip && !hasCargo && !blockedByVoyage;

  const selectedShipConfig = SHIPS.find(
    (s) => s.name === selectedShipSummary?.typeName,
  );
  const sellPrice = selectedShipConfig
    ? Math.floor(selectedShipConfig.basePrice * SHIP_SELL_RATIO)
    : 0;

  const durPercent =
    selectedShipDetail && selectedShipDetail.maxDurability > 0
      ? Math.round(
          (selectedShipDetail.durability / selectedShipDetail.maxDurability) *
            100,
        )
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
      {error && (
        <div className="rounded-lg border border-red-500 bg-red-500/10 p-3 text-sm text-red-400 text-center">
          {error}
        </div>
      )}

      {/* 标题栏 */}
      <div className="rounded-lg border border-ocean-600 bg-ocean-800/80 px-4 py-2 text-sm flex justify-between items-center">
        <span className="font-bold text-gold-400">造船厂</span>
        <span className="text-parchment-dark">
          金币 {displayView.fleetGold.toLocaleString()}
        </span>
      </div>

      {/* 船只选择下拉菜单 */}
      {displayView.ships.length > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-ocean-600 bg-ocean-800/80 p-3">
          <span className="text-sm text-parchment-dark">
            选择要改造/维修的船只
          </span>
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
            {displayView.ships.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.typeName}) {s.isActive ? "[旗舰]" : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* 船体修理与部件升级 */}
      {selectedShipDetail ? (
        <div className="rounded-lg border border-ocean-600 bg-ocean-800/80 p-4 space-y-4">
          <h3 className="text-sm font-semibold text-gold-400">
            船只属性 & 维护 — {selectedShipSummary?.name} (
            {selectedShipSummary?.typeName})
          </h3>

          {/* 耐久条 */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-parchment-dark">船体耐久</span>
              <span className={durTextColor}>
                {selectedShipDetail.durability} /{" "}
                {selectedShipDetail.maxDurability}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-ocean-700">
              <div
                className={`h-full rounded-full transition-all ${durColor}`}
                style={{ width: `${durPercent}%` }}
              />
            </div>
          </div>

          {/* 维修表单 */}
          {selectedShipDetail.durability < selectedShipDetail.maxDurability &&
            !blockedByVoyage && (
              <form
                action={handleRepair}
                className="rounded-lg border border-ocean-600 bg-ocean-700/60 p-3"
              >
                <input type="hidden" name="shipId" value={selectedShipId} />
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm text-parchment-dark">
                      修理船体
                    </span>
                    <p className="text-xs text-parchment-dark mt-1">
                      费用：{selectedShipDetail.repairCost} 金币
                    </p>
                  </div>
                  <button
                    type="submit"
                    disabled={!selectedShipDetail.canRepair || isPending}
                    className="rounded bg-gold-500 px-4 py-2 text-sm font-bold text-ocean-900 hover:bg-gold-400 transition-colors disabled:opacity-50"
                  >
                    维修
                  </button>
                </div>
              </form>
            )}

          {/* 部件升级列表 */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-parchment-dark">
              部件升级
            </h4>
            {selectedShipDetail.components.map((comp) => (
              <ComponentCard
                key={comp.id}
                component={comp}
                shipId={selectedShipId}
                blockedByVoyage={blockedByVoyage}
                onUpgrade={handleUpgrade}
                isPending={isPending}
              />
            ))}
          </div>

          {/* 船只装备槽位 */}
          <div className="space-y-3 border-t border-ocean-700/40 pt-3">
            <h4 className="text-xs font-semibold text-parchment-dark">
              装备插槽 ({selectedShipDetail.equippedItems.length} / 3)
            </h4>

            {/* 已装备列表 */}
            {selectedShipDetail.equippedItems.length === 0 ? (
              <p className="text-xs text-parchment-dark">
                当前未配备任何装备。
              </p>
            ) : (
              <div className="space-y-2">
                {selectedShipDetail.equippedItems.map((item) => (
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
                      onClick={() => handleUnequipItem(item.id)}
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
                <h5 className="text-[11px] font-medium text-gold-400">
                  可装配装备
                </h5>
                {selectedShipDetail.fleetInventory.length === 0 ? (
                  <p className="text-xs text-parchment-dark">
                    仓库中无可用装备。请在港口铁匠铺购买。
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {selectedShipDetail.fleetInventory.map((item, index) => {
                      const isSameTypeEquipped =
                        selectedShipDetail.equippedItems.some(
                          (eq) => eq.type === item.type,
                        );
                      const slotsFull =
                        selectedShipDetail.equippedItems.length >= 3;

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
                              disabled={
                                isPending || slotsFull || isSameTypeEquipped
                              }
                              onClick={() => handleEquipItem(item.id)}
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
                              onClick={() => handleSellEquipment(item.id)}
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

          {/* 出售当前选定船只 */}
          {canSell && (
            <form
              action={handleSellShip}
              className="border-t border-ocean-700/40 pt-3"
            >
              <input type="hidden" name="shipId" value={selectedShipId} />
              <button
                type="submit"
                disabled={isPending}
                className="w-full rounded border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
              >
                出售此船（收回 {sellPrice.toLocaleString()} 金币）
              </button>
            </form>
          )}

          {isLastShip && (
            <p className="text-xs text-parchment-dark text-center">
              这是舰队中的最后一艘船，不可出售
            </p>
          )}
          {hasCargo && (
            <p className="text-xs text-yellow-400 text-center">
              此船舱内仍装有货物，请先在交易所卸货后再进行出售
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-ocean-600 bg-ocean-800/80 p-8 text-center text-sm text-parchment-dark">
          没有可查看的船只详情
        </div>
      )}

      {/* 港口铁匠铺 */}
      <div className="rounded-lg border border-ocean-600 bg-ocean-800/80 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gold-400">港口铁匠铺</h3>
        {displayView.availableEquipments.length === 0 ? (
          <p className="text-xs text-parchment-dark">
            该港口铁匠铺暂无多余装备出售。
          </p>
        ) : (
          <div className="space-y-2">
            {displayView.availableEquipments.map((eq) => (
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
                    onClick={() => handleBuyEquipment(eq.id)}
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

      {/* 可购买的船只 */}
      {displayView.availableShips.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-parchment-dark">
            可购买的船只
          </h3>
          {displayView.availableShips.map((ship) => (
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
                <form action={handleBuyShip}>
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
      )}

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

// ---- 部件卡片 ----

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
