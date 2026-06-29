"use client";

import { useState } from "react";
import { buyGoods, sellGoods } from "../app/actions/trade";
import type { MarketView } from "../types/game-view";
import { Modal } from "./ui/Modal";
import { QuantityInput } from "./ui/QuantityInput";

interface MarketPanelProps {
  readonly view: MarketView;
  readonly loadView: () => Promise<MarketView>;
}

export function MarketPanel({ view: initialView, loadView }: MarketPanelProps) {
  const [view, setView] = useState(initialView);
  const [isBuying, setIsBuying] = useState(false);
  const [selectedGoodId, setSelectedGoodId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState<string | null>(null);
  // L3: 卖出状态
  const [isSelling, setIsSelling] = useState(false);
  const [selectedSellGoodId, setSelectedSellGoodId] = useState<string | null>(
    null,
  );
  const [sellQuantity, setSellQuantity] = useState(1);
  // L3: 排序状态
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc" | null>(null);
  function toggleSort(col: string) {
    if (sortColumn === col) {
      setSortDir((prev) =>
        prev === "asc" ? "desc" : prev === "desc" ? null : "asc",
      );
    } else {
      setSortColumn(col);
      setSortDir("asc");
    }
  }
  const sortedGoods = [...view.goods].sort((a, b) => {
    if (!sortColumn || !sortDir) return 0;
    let cmp = 0;
    switch (sortColumn) {
      case "name":
        cmp = a.name.localeCompare(b.name);
        break;
      case "category":
        cmp = a.category.localeCompare(b.category);
        break;
      case "buyPrice":
        cmp = a.buyPrice - b.buyPrice;
        break;
      case "sellPrice":
        cmp = a.sellPrice - b.sellPrice;
        break;
      case "estimatedProfit":
        cmp = (a.estimatedProfit ?? 0) - (b.estimatedProfit ?? 0);
        break;
      case "inCargo":
        cmp = a.inCargo - b.inCargo;
        break;
      case "volume":
        cmp = a.volume - b.volume;
        break;
    }
    return sortDir === "desc" ? -cmp : cmp;
  });
  function sortIndicator(col: string): string {
    return sortColumn === col
      ? sortDir === "asc"
        ? " ▲"
        : sortDir === "desc"
          ? " ▼"
          : ""
      : "";
  }

  async function doBuy(formData: FormData) {
    setIsBuying(true);
    setMessage(null);
    try {
      await buyGoods(formData);
      const newView = await loadView();
      setView(newView);
      const goodId = formData.get("goodId") as string;
      const qty = formData.get("quantity") as string;
      const good = view.goods.find((g) => g.id === goodId);
      setMessage(`成功购买 ${qty} 个 ${good?.name ?? ""}`);
      setSelectedGoodId(null);
      setQuantity(1);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "购买失败");
    } finally {
      setIsBuying(false);
    }
  }
  async function doSell(formData: FormData) {
    setIsSelling(true);
    setMessage(null);
    try {
      await sellGoods(formData);
      const newView = await loadView();
      setView(newView);
      const qty = formData.get("quantity") as string;
      setMessage(`成功卖出 ${qty} 个商品`);
      setSelectedSellGoodId(null);
      setSellQuantity(1);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "卖出失败");
    } finally {
      setIsSelling(false);
    }
  }

  const selectedGood = view.goods.find((g) => g.id === selectedGoodId);
  const remainingCargo = view.cargoCapacity - view.cargoCount;
  const maxBuyable = selectedGood
    ? Math.floor(remainingCargo / selectedGood.volume)
    : 0;
  const totalCost = selectedGood ? selectedGood.buyPrice * quantity : 0;
  const canBuy = selectedGood
    ? totalCost <= view.playerGold && quantity > 0 && quantity <= maxBuyable
    : false;

  const selectedSellGood = view.goods.find((g) => g.id === selectedSellGoodId);
  const sellProfit = selectedSellGood?.estimatedProfit
    ? (selectedSellGood.estimatedProfit / selectedSellGood.inCargo) *
      sellQuantity
    : 0;

  return (
    <div className="flex-1 p-4 max-w-2xl mx-auto w-full space-y-4">
      {/* 顶部信息 */}
      <div className="flex items-center justify-between rounded-lg border border-ocean-600 bg-ocean-800/80 px-4 py-2 text-sm">
        <span className="font-bold text-gold-400">
          {view.portName} - 交易所
        </span>
        <div className="flex items-center gap-4">
          <span className="text-gold-400">
            <span className="text-parchment-dark">金币</span>{" "}
            {view.playerGold.toLocaleString()}
          </span>
          <span className="text-parchment-dark">
            舱 {view.cargoCount}/{view.cargoCapacity}
          </span>
        </div>
      </div>

      {/* 消息提示 */}
      {message && (
        <div className="rounded bg-ocean-700/80 px-3 py-2 text-sm text-gold-400 border border-gold-600/50">
          {message}
          <button
            type="button"
            onClick={() => setMessage(null)}
            className="ml-2 text-xs text-parchment-dark hover:text-parchment"
          >
            ×
          </button>
        </div>
      )}

      {/* 商品列表 */}
      <div className="rounded-lg border border-ocean-600 bg-ocean-800/80 overflow-hidden">
        <div className="grid grid-cols-8 gap-2 border-b border-ocean-600 bg-ocean-700/60 px-4 py-2 text-xs font-semibold text-parchment-dark uppercase tracking-wider">
          <button
            type="button"
            onClick={() => toggleSort("name")}
            className="text-left cursor-pointer hover:text-gold-400 transition-colors"
          >
            商品{sortIndicator("name")}
          </button>
          <button
            type="button"
            onClick={() => toggleSort("category")}
            className="text-left cursor-pointer hover:text-gold-400 transition-colors"
          >
            分类{sortIndicator("category")}
          </button>
          <button
            type="button"
            onClick={() => toggleSort("volume")}
            className="text-center cursor-pointer hover:text-gold-400 transition-colors"
          >
            占用舱容{sortIndicator("volume")}
          </button>
          <button
            type="button"
            onClick={() => toggleSort("buyPrice")}
            className="text-center cursor-pointer hover:text-gold-400 transition-colors"
          >
            买入价{sortIndicator("buyPrice")}
          </button>
          <button
            type="button"
            onClick={() => toggleSort("sellPrice")}
            className="text-center cursor-pointer hover:text-gold-400 transition-colors"
          >
            卖出价{sortIndicator("sellPrice")}
          </button>
          <button
            type="button"
            onClick={() => toggleSort("estimatedProfit")}
            className="text-center cursor-pointer hover:text-gold-400 transition-colors"
          >
            预期利润{sortIndicator("estimatedProfit")}
          </button>
          <button
            type="button"
            onClick={() => toggleSort("inCargo")}
            className="text-center cursor-pointer hover:text-gold-400 transition-colors"
          >
            持有{sortIndicator("inCargo")}
          </button>
          <span className="text-center">操作</span>
        </div>
        {sortedGoods.map((good) => (
          <div
            key={good.id}
            className="grid grid-cols-8 gap-2 items-center border-b border-ocean-700/30 px-4 py-3 text-sm hover:bg-ocean-700/40 transition-colors last:border-b-0"
          >
            <span className="font-medium">{good.name}</span>
            <span className="text-xs text-parchment-dark">{good.category}</span>
            <span className="text-center text-parchment-dark">
              {good.volume}
            </span>
            <span
              className={`text-center ${good.priceChangePercent > 10 ? "text-red-400" : good.priceChangePercent < -10 ? "text-green-400" : "text-gold-400"}`}
            >
              {good.buyPrice}
            </span>
            <span
              className={`text-center ${good.priceChangePercent > 10 ? "text-green-400" : good.priceChangePercent < -10 ? "text-red-400" : "text-gold-400"}`}
            >
              {good.sellPrice}
            </span>
            <span
              className={`text-center ${
                good.estimatedProfit != null
                  ? good.estimatedProfit >= 0
                    ? "text-green-400"
                    : "text-red-400"
                  : ""
              }`}
            >
              {good.estimatedProfit != null
                ? `${good.estimatedProfit >= 0 ? "+" : ""}${good.estimatedProfit.toLocaleString()}`
                : "-"}
            </span>
            <span className="text-center text-parchment-dark">
              {good.inCargo}
            </span>
            <span className="flex justify-center gap-0.5 whitespace-nowrap">
              {good.canAfford && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedGoodId(good.id);
                    setQuantity(1);
                    setMessage(null);
                  }}
                  className="rounded bg-gold-500/20 px-1.5 py-1 text-xs text-gold-400 hover:bg-gold-500/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  买入
                </button>
              )}
              {good.inCargo > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSellGoodId(good.id);
                    setSellQuantity(1);
                    setMessage(null);
                  }}
                  disabled={isSelling}
                  className="rounded bg-red-900/30 px-1.5 py-1 text-xs text-red-400 hover:bg-red-900/50 transition-colors disabled:opacity-30"
                >
                  卖出
                </button>
              )}
            </span>
          </div>
        ))}
      </div>

      {/* 购买弹窗 */}
      {selectedGood && (
        <Modal
          title={`购买 ${selectedGood.name}`}
          onClose={() => {
            setSelectedGoodId(null);
            setQuantity(1);
          }}
        >
          <div className="space-y-2 text-sm text-parchment-dark">
            <div className="flex justify-between">
              <span>单价</span>
              <span className="text-gold-400">{selectedGood.buyPrice}</span>
            </div>
            <div className="flex justify-between">
              <span>数量</span>
              <span className="text-gold-400">{quantity}</span>
            </div>
            <div className="flex justify-between border-t border-ocean-700 pt-2">
              <span>总价</span>
              <span className="text-gold-400 font-bold">
                {totalCost.toLocaleString()}
              </span>
            </div>
          </div>

          <QuantityInput
            value={quantity}
            onChange={setQuantity}
            max={maxBuyable}
          />

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => {
                const fd = new FormData();
                fd.set("goodId", selectedGood.id);
                fd.set("quantity", String(quantity));
                doBuy(fd);
              }}
              disabled={!canBuy || isBuying}
              className="flex-1 rounded bg-gold-500 py-2 text-sm font-bold text-ocean-900 hover:bg-gold-400 transition-colors disabled:opacity-50"
            >
              {isBuying ? "购买中..." : "确认购买"}
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedGoodId(null);
                setQuantity(1);
              }}
              className="rounded bg-ocean-700 px-4 py-2 text-sm hover:bg-ocean-600 transition-colors"
            >
              取消
            </button>
          </div>
        </Modal>
      )}

      {selectedSellGood && (
        <Modal
          title={`卖出 ${selectedSellGood.name}`}
          onClose={() => {
            setSelectedSellGoodId(null);
            setSellQuantity(1);
          }}
        >
          <div className="space-y-2 text-sm text-parchment-dark">
            <div className="flex justify-between">
              <span>持有</span>
              <span>{selectedSellGood.inCargo}</span>
            </div>
            <div className="flex justify-between">
              <span>买入价</span>
              <span>{selectedSellGood.cargoBuyPrice}</span>
            </div>
            <div className="flex justify-between">
              <span>当前卖价</span>
              <span className="text-gold-400">
                {selectedSellGood.sellPrice}
              </span>
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
            max={selectedSellGood.inCargo}
            onChange={setSellQuantity}
          />

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => {
                const fd = new FormData();
                fd.set("goodId", selectedSellGood.id);
                fd.set("quantity", String(sellQuantity));
                doSell(fd);
              }}
              disabled={isSelling || sellQuantity <= 0}
              className="flex-1 rounded bg-gold-500 py-2 text-sm font-bold text-ocean-900 hover:bg-gold-400 transition-colors disabled:opacity-50"
            >
              {isSelling ? "卖出中..." : "确认卖出"}
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedSellGoodId(null);
                setSellQuantity(1);
              }}
              className="rounded bg-ocean-700 px-4 py-2 text-sm hover:bg-ocean-600 transition-colors"
            >
              取消
            </button>
          </div>
        </Modal>
      )}

      {/* 返回 */}
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
