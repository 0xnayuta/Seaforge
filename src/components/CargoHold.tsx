"use client";

import { useState } from "react";
import { sellGoods } from "../app/actions/trade";
import type { CargoItemView, CargoView } from "../types/game-view";
import { Modal } from "./ui/Modal";
import { QuantityInput } from "./ui/QuantityInput";

interface CargoHoldProps {
  readonly view: CargoView;
  readonly onRefresh: () => void;
}

export function CargoHold({ view, onRefresh }: CargoHoldProps) {
  const [isSelling, setIsSelling] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CargoItemView | null>(null);
  const [sellQuantity, setSellQuantity] = useState(1);
  const [message, setMessage] = useState<string | null>(null);

  async function doSell(formData: FormData) {
    setIsSelling(true);
    setMessage(null);
    try {
      await sellGoods(null, formData);
      onRefresh();
      setMessage("成功卖出");
      setSelectedItem(null);
      setSellQuantity(1);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "卖出失败");
    } finally {
      setIsSelling(false);
    }
  }

  return (
    <div className="flex-1 p-4 max-w-2xl mx-auto w-full space-y-4">
      <div className="flex items-center justify-between rounded-lg border border-ocean-600 bg-ocean-800/80 px-4 py-2 text-sm">
        <span className="font-bold text-gold-400">{view.shipName} - 船舱</span>
        <span className="text-parchment-dark">
          舱容 {view.usedCapacity}/{view.maxCapacity}
        </span>
      </div>

      {message && (
        <div className="rounded bg-ocean-700/80 px-3 py-2 text-sm text-gold-400 border border-gold-600/50">
          {message}
          <button
            type="button"
            onClick={() => setMessage(null)}
            className="ml-2 text-xs text-parchment-dark"
          >
            ×
          </button>
        </div>
      )}

      {view.items.length === 0 ? (
        <div className="rounded-lg border border-ocean-600 bg-ocean-800/80 p-8 text-center text-sm text-parchment-dark">
          船舱空空如也，去交易所采购些货物吧
        </div>
      ) : (
        <div className="rounded-lg border border-ocean-600 bg-ocean-800/80 overflow-hidden">
          <div className="grid grid-cols-5 gap-2 border-b border-ocean-600 bg-ocean-700/60 px-4 py-2 text-xs font-semibold text-parchment-dark uppercase tracking-wider">
            <span>货物</span>
            <span className="text-right">数量</span>
            <span className="text-right">买入价</span>
            <span className="text-right">利润</span>
            <span />
          </div>
          {view.items.map((item) => (
            <div
              key={item.goodId}
              className="grid grid-cols-5 gap-2 items-center border-b border-ocean-700/30 px-4 py-3 text-sm hover:bg-ocean-700/40 transition-colors last:border-b-0"
            >
              <span className="font-medium">{item.goodName}</span>
              <span className="text-right text-parchment-dark">
                {item.quantity}
              </span>
              <span className="text-right text-parchment-dark">
                {item.buyPrice}
              </span>
              <span
                className={`text-right ${
                  item.estimatedProfit >= 0 ? "text-green-400" : "text-red-400"
                }`}
              >
                {item.estimatedProfit >= 0 ? "+" : ""}
                {item.estimatedProfit.toLocaleString()}
              </span>
              <button
                type="button"
                onClick={() => {
                  setSelectedItem(item);
                  setSellQuantity(1);
                  setMessage(null);
                }}
                className="rounded bg-gold-500/20 px-2 py-1 text-xs text-gold-400 hover:bg-gold-500/30 transition-colors"
              >
                卖出
              </button>
            </div>
          ))}
        </div>
      )}

      {selectedItem && (
        <Modal
          title={`卖出 ${selectedItem.goodName}`}
          onClose={() => {
            setSelectedItem(null);
            setSellQuantity(1);
          }}
        >
          <div className="space-y-2 text-sm text-parchment-dark">
            <div className="flex justify-between">
              <span>持有</span>
              <span>{selectedItem.quantity}</span>
            </div>
            <div className="flex justify-between">
              <span>买入价</span>
              <span>{selectedItem.buyPrice}</span>
            </div>
            <div className="flex justify-between">
              <span>当前卖价</span>
              <span className="text-gold-400">{selectedItem.sellPrice}</span>
            </div>
            <div className="flex justify-between border-t border-ocean-700 pt-2">
              <span>预计利润</span>
              <span
                className={`font-bold ${
                  selectedItem.sellPrice - selectedItem.buyPrice >= 0
                    ? "text-green-400"
                    : "text-red-400"
                }`}
              >
                {(
                  (selectedItem.sellPrice - selectedItem.buyPrice) *
                  sellQuantity
                ).toLocaleString()}
              </span>
            </div>
          </div>

          <QuantityInput
            value={sellQuantity}
            max={selectedItem.quantity}
            onChange={setSellQuantity}
          />

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => {
                const fd = new FormData();
                fd.set("goodId", selectedItem.goodId);
                fd.set("quantity", String(sellQuantity));
                doSell(fd);
              }}
              disabled={isSelling}
              className="flex-1 rounded bg-gold-500 py-2 text-sm font-bold text-ocean-900 hover:bg-gold-400 transition-colors disabled:opacity-50"
            >
              {isSelling ? "卖出中..." : "确认卖出"}
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedItem(null);
                setSellQuantity(1);
              }}
              className="rounded bg-ocean-700 px-4 py-2 text-sm hover:bg-ocean-600 transition-colors"
            >
              取消
            </button>
          </div>
        </Modal>
      )}

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
