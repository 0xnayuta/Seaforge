"use client";

import { useState } from "react";
import type { CargoView } from "../types/game-view";

export function CargoHold({ view }: { readonly view: CargoView }) {
  const [message, setMessage] = useState<string | null>(null);
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
  const sortedItems = [...view.items].sort((a, b) => {
    if (!sortColumn || !sortDir) return 0;
    let cmp = 0;
    switch (sortColumn) {
      case "name":
        cmp = a.goodName.localeCompare(b.goodName);
        break;
      case "category":
        cmp = a.category.localeCompare(b.category);
        break;
      case "usedVolume":
        cmp = a.quantity * a.volume - b.quantity * b.volume;
        break;
      case "buyPrice":
        cmp = a.buyPrice - b.buyPrice;
        break;
      case "quantity":
        cmp = a.quantity - b.quantity;
        break;
      case "totalCost":
        cmp = a.buyPrice * a.quantity - b.buyPrice * b.quantity;
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

  return (
    <div className="flex-1 p-4 max-w-2xl mx-auto w-full space-y-4">
      <div className="flex items-center justify-between rounded-lg border border-ocean-600 bg-ocean-800/80 px-4 py-2 text-sm">
        <span className="font-bold text-gold-400">{view.shipName} - 船舱</span>
        <span className="text-parchment-dark">
          舱容 {view.usedCapacity} / {view.effectiveCapacity}（原始{" "}
          {view.maxCapacity}）
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
          <div className="grid grid-cols-6 gap-2 border-b border-ocean-600 bg-ocean-700/60 px-4 py-2 text-xs font-semibold text-parchment-dark uppercase tracking-wider">
            <button
              type="button"
              onClick={() => toggleSort("name")}
              className="text-left cursor-pointer hover:text-gold-400 transition-colors"
            >
              货物{sortIndicator("name")}
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
              onClick={() => toggleSort("usedVolume")}
              className="text-center cursor-pointer hover:text-gold-400 transition-colors"
            >
              占用舱容{sortIndicator("usedVolume")}
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
              onClick={() => toggleSort("totalCost")}
              className="text-center cursor-pointer hover:text-gold-400 transition-colors"
            >
              成本{sortIndicator("totalCost")}
            </button>
            <button
              type="button"
              onClick={() => toggleSort("quantity")}
              className="text-center cursor-pointer hover:text-gold-400 transition-colors"
            >
              数量{sortIndicator("quantity")}
            </button>
          </div>
          {sortedItems.map((item) => (
            <div
              key={item.goodId}
              className="grid grid-cols-6 gap-2 items-center border-b border-ocean-700/30 px-4 py-3 text-sm hover:bg-ocean-700/40 transition-colors last:border-b-0"
            >
              <span className="text-left font-medium">{item.goodName}</span>
              <span className="text-left text-parchment-dark">
                {item.category}
              </span>
              <span className="text-center text-parchment-dark">
                {item.quantity * item.volume}
              </span>
              <span className="text-center text-parchment-dark">
                {item.buyPrice}
              </span>
              <span className="text-center text-gold-400">
                {(item.buyPrice * item.quantity).toLocaleString()}
              </span>
              <span className="text-center text-parchment-dark">
                {item.quantity}
              </span>
            </div>
          ))}
        </div>
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
