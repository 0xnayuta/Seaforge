"use client";

import { useState } from "react";
import type { GoodView } from "../types/game-view";
import { Modal } from "./ui/Modal";
import { QuantityInput } from "./ui/QuantityInput";

interface SellModalProps {
  readonly good: GoodView;
  readonly isSelling: boolean;
  readonly onSell: (goodsId: string, quantity: number) => void;
  readonly onClose: () => void;
}

export function SellModal({
  good,
  isSelling,
  onSell,
  onClose,
}: SellModalProps) {
  const [sellQuantity, setSellQuantity] = useState(1);
  const sellProfit = good.estimatedProfit
    ? (good.estimatedProfit / good.inCargo) * sellQuantity
    : 0;

  return (
    <Modal title={`卖出 ${good.name}`} onClose={onClose}>
      <div className="space-y-2 text-sm text-parchment-dark">
        <div className="flex justify-between">
          <span>持有</span>
          <span>{good.inCargo}</span>
        </div>
        <div className="flex justify-between">
          <span>买入价</span>
          <span>{good.cargoBuyPrice}</span>
        </div>
        <div className="flex justify-between">
          <span>当前卖价</span>
          <span className="text-gold-400">{good.sellPrice}</span>
        </div>
        <div className="flex justify-between border-t border-ocean-700 pt-2">
          <span>预计利润</span>
          <span
            className={`font-bold ${
              sellProfit >= 0 ? "text-green-400" : "text-red-400"
            }`}
          >
            {sellProfit.toLocaleString()}
          </span>
        </div>
      </div>

      <QuantityInput
        value={sellQuantity}
        max={good.inCargo}
        onChange={setSellQuantity}
      />

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => onSell(good.id, sellQuantity)}
          disabled={isSelling || sellQuantity <= 0}
          className="flex-1 rounded bg-gold-500 py-2 text-sm font-bold text-ocean-900 hover:bg-gold-400 transition-colors disabled:opacity-50"
        >
          {isSelling ? "卖出中..." : "确认卖出"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded bg-ocean-700 px-4 py-2 text-sm hover:bg-ocean-600 transition-colors"
        >
          取消
        </button>
      </div>
    </Modal>
  );
}
