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
import type { ShipyardView } from "../types/game-view";
import { EquipmentShop } from "./EquipmentShop";
import { ShipEquipment } from "./ShipEquipment";
import { ShipMaintenance } from "./ShipMaintenance";
import { ShipMarket } from "./ShipMarket";
import { ShipSelector } from "./ShipSelector";

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

  // ── 通用 action 调用包装 ──
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

  /** 装备操作通用处理器 */
  const runEquipmentAction = (
    action: (fd: FormData) => Promise<ShipyardView>,
    equipmentId: string,
    errorMsg: string,
    usePending?: boolean,
  ) => {
    if (usePending) setIsEquipmentPending(true);
    setError(null);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("shipId", selectedShipId);
        fd.set("equipmentId", equipmentId);
        const nextView = await action(fd);
        setDisplayView(nextView);
      } catch (e) {
        setError(e instanceof Error ? e.message : `${errorMsg}失败`);
      } finally {
        if (usePending) setIsEquipmentPending(false);
      }
    });
  };

  const handleEquipItem = (id: string) =>
    runEquipmentAction(equipItemAction, id, "装备");
  const handleUnequipItem = (id: string) =>
    runEquipmentAction(unequipItemAction, id, "卸下");
  const handleBuyEquipment = (id: string) =>
    runEquipmentAction(buyEquipmentAction, id, "购买装备", true);
  const handleSellEquipment = (id: string) =>
    runEquipmentAction(sellEquipmentAction, id, "出售装备", true);

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

      <ShipSelector
        ships={displayView.ships}
        selectedShipId={selectedShipId}
        isPending={isPending}
      />

      {selectedShipDetail ? (
        <div className="rounded-lg border border-ocean-600 bg-ocean-800/80 p-4 space-y-4">
          <ShipMaintenance
            shipDetail={selectedShipDetail}
            shipName={selectedShipSummary?.name ?? ""}
            shipTypeName={selectedShipSummary?.typeName ?? ""}
            shipId={selectedShipId}
            blockedByVoyage={blockedByVoyage}
            isPending={isPending}
            onRepair={handleRepair}
            onUpgrade={handleUpgrade}
          />

          <ShipEquipment
            equippedItems={selectedShipDetail.equippedItems}
            fleetInventory={selectedShipDetail.fleetInventory}
            isPending={isPending}
            isEquipmentPending={isEquipmentPending}
            blockedByVoyage={blockedByVoyage}
            onUnequip={handleUnequipItem}
            onEquip={handleEquipItem}
            onSellEquipment={handleSellEquipment}
          />

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

      <EquipmentShop
        availableEquipments={displayView.availableEquipments}
        isPending={isPending}
        isEquipmentPending={isEquipmentPending}
        onBuyEquipment={handleBuyEquipment}
      />

      <ShipMarket
        availableShips={displayView.availableShips}
        isPending={isPending}
        onBuyShip={handleBuyShip}
      />

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
