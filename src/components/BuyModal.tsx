"use client";

import { useState } from "react";
import type { GoodView } from "../types/game-view";
import { Modal } from "./ui/Modal";
import { QuantityInput } from "./ui/QuantityInput";

interface BuyModalProps {
  readonly good: GoodView;
  readonly isBuying: boolean;
  readonly maxBuyable: number;
  readonly remainingCargo: number;
  readonly playerGold: number;
  readonly onBuy: (goodsId: string, quantity: number) => void;
  readonly onClose: () => void;
}

export function BuyModal({
  good,
  isBuying,
  maxBuyable,
  remainingCargo,
  playerGold,
  onBuy,
  onClose,
}: BuyModalProps) {
  const [quantity, setQuantity] = useState(1);
  const totalCost = good.buyPrice * quantity;
  const canBuy =
    totalCost <= playerGold && quantity > 0 && quantity <= maxBuyable;

  return (
    <Modal title={`购买 ${good.name}`} onClose={onClose}>
      <div className="space-y-2 text-sm text-parchment-dark">
        <div className="flex justify-between">
          <span>单价</span>
          <span className="text-gold-400">{good.buyPrice}</span>
        </div>
        <div className="flex justify-between">
          <span>数量</span>
          <span className="text-gold-400">{quantity}</span>
        </div>
        <div className="flex justify-between">
          <span>余舱</span>
          <span className="text-parchment">{remainingCargo}</span>
        </div>
        <div className="flex justify-between border-t border-ocean-700 pt-2">
          <span>总价</span>
          <span className="text-gold-400 font-bold">
            {totalCost.toLocaleString()}
          </span>
        </div>
      </div>

      <QuantityInput value={quantity} onChange={setQuantity} max={maxBuyable} />

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => onBuy(good.id, quantity)}
          disabled={!canBuy || isBuying}
          className="flex-1 rounded bg-gold-500 py-2 text-sm font-bold text-ocean-900 hover:bg-gold-400 transition-colors disabled:opacity-50"
        >
          {isBuying ? "购买中..." : "确认购买"}
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
