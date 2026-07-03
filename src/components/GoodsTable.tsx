"use client";

import type { GoodView } from "../types/game-view";
import { useSort } from "./ui/useSort";

interface GoodsTableProps {
  readonly goods: GoodView[];
  readonly onBuy: (goodsId: string) => void;
  readonly onSell: (goodsId: string) => void;
  readonly isSelling: boolean;
}

export function GoodsTable({
  goods,
  onBuy,
  onSell,
  isSelling,
}: GoodsTableProps) {
  const { sortColumn, sortDir, toggleSort, sortIndicator } = useSort();

  const sortedGoods = [...goods].sort((a, b) => {
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

  return (
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
          <span className="text-center text-parchment-dark">{good.volume}</span>
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
                onClick={() => onBuy(good.id)}
                className="rounded bg-gold-500/20 px-1.5 py-1 text-xs text-gold-400 hover:bg-gold-500/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                买入
              </button>
            )}
            {good.inCargo > 0 && (
              <button
                type="button"
                onClick={() => onSell(good.id)}
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
  );
}
