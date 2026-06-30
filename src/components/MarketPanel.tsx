"use client";

import { useState } from "react";
import { buyGoods, sellGoods } from "../app/actions/trade";
import type { MarketView } from "../types/game-view";
import { BuyModal } from "./BuyModal";
import { GoodsTable } from "./GoodsTable";
import { SellModal } from "./SellModal";

interface MarketPanelProps {
  readonly view: MarketView;
  readonly loadView: () => Promise<MarketView>;
}

export function MarketPanel({ view: initialView, loadView }: MarketPanelProps) {
  const [view, setView] = useState(initialView);
  const [buyingGoodId, setBuyingGoodId] = useState<string | null>(null);
  const [sellingGoodId, setSellingGoodId] = useState<string | null>(null);
  const [isBuying, setIsBuying] = useState(false);
  const [isSelling, setIsSelling] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const buyingGood = buyingGoodId
    ? (view.goods.find((g) => g.id === buyingGoodId) ?? null)
    : null;
  const sellingGood = sellingGoodId
    ? (view.goods.find((g) => g.id === sellingGoodId) ?? null)
    : null;
  const remainingCargo = view.cargoCapacity - view.cargoCount;
  const maxBuyable = buyingGood
    ? Math.floor(remainingCargo / buyingGood.volume)
    : 0;

  async function handleBuy(goodId: string, quantity: number) {
    setIsBuying(true);
    setMessage(null);
    try {
      const fd = new FormData();
      fd.set("goodId", goodId);
      fd.set("quantity", String(quantity));
      await buyGoods(fd);
      const newView = await loadView();
      setView(newView);
      const good = view.goods.find((g) => g.id === goodId);
      setMessage(`成功购买 ${quantity} 个 ${good?.name ?? ""}`);
      setBuyingGoodId(null);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "购买失败");
    } finally {
      setIsBuying(false);
    }
  }

  async function handleSell(goodId: string, quantity: number) {
    setIsSelling(true);
    setMessage(null);
    try {
      const fd = new FormData();
      fd.set("goodId", goodId);
      fd.set("quantity", String(quantity));
      await sellGoods(fd);
      const newView = await loadView();
      setView(newView);
      setMessage(`成功卖出 ${quantity} 个商品`);
      setSellingGoodId(null);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "卖出失败");
    } finally {
      setIsSelling(false);
    }
  }

  return (
    <div className="flex-1 p-4 max-w-2xl mx-auto w-full space-y-4">
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
            舱容 {view.cargoCount}/{view.cargoCapacity}
          </span>
        </div>
      </div>

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

      <GoodsTable
        goods={view.goods}
        onBuy={(id) => {
          setMessage(null);
          setBuyingGoodId(id);
        }}
        onSell={(id) => {
          setMessage(null);
          setSellingGoodId(id);
        }}
        isSelling={isSelling}
      />

      {buyingGood && (
        <BuyModal
          good={buyingGood}
          isBuying={isBuying}
          maxBuyable={maxBuyable}
          remainingCargo={remainingCargo}
          playerGold={view.playerGold}
          onBuy={handleBuy}
          onClose={() => setBuyingGoodId(null)}
        />
      )}

      {sellingGood && (
        <SellModal
          good={sellingGood}
          isSelling={isSelling}
          onSell={handleSell}
          onClose={() => setSellingGoodId(null)}
        />
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
