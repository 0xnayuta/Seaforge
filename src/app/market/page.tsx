"use client"

import { useState } from "react"
import { loadMarketView } from "./actions"
import { buyGoods } from "../actions/trade"
import type { MarketView } from "../../types/game-view"

export default function MarketPage() {
  const [view, setView] = useState<MarketView | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedGoodId, setSelectedGoodId] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [message, setMessage] = useState<string | null>(null)

  async function doLoad() {
    setLoading(true)
    try {
      const result = await loadMarketView()
      setView(result)
    } finally {
      setLoading(false)
    }
  }

  async function doBuy(formData: FormData) {
    setLoading(true)
    try {
      const result = await buyGoods(null, formData)
      setView(result)
      const goodId = formData.get("goodId") as string
      const qty = formData.get("quantity") as string
      const good = view?.goods.find((g) => g.id === goodId)
      setMessage(`成功购买 ${qty} 个 ${good?.name ?? ""}`)
      setSelectedGoodId(null)
      setQuantity(1)
    } finally {
      setLoading(false)
    }
  }

  if (!view) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <button
          type="button"
          onClick={doLoad}
          disabled={loading}
          className="rounded-lg bg-gold-500 px-6 py-3 text-lg font-bold text-ocean-900 hover:bg-gold-400 transition-colors disabled:opacity-50"
        >
          {loading ? "加载中..." : "进入交易所"}
        </button>
      </div>
    )
  }

  const selectedGood = view.goods.find((g) => g.id === selectedGoodId)
  const totalCost = selectedGood ? selectedGood.buyPrice * quantity : 0
  const canBuy =
    selectedGood ? totalCost <= view.playerGold && quantity > 0 : false

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
        <div className="grid grid-cols-5 gap-2 border-b border-ocean-600 bg-ocean-700/60 px-4 py-2 text-xs font-semibold text-parchment-dark uppercase tracking-wider">
          <span>商品</span>
          <span>分类</span>
          <span className="text-right">买入价</span>
          <span className="text-right">持有</span>
          <span />
        </div>
        {view.goods.map((good) => (
          <div
            key={good.id}
            className="grid grid-cols-5 gap-2 items-center border-b border-ocean-700/30 px-4 py-3 text-sm hover:bg-ocean-700/40 transition-colors last:border-b-0"
          >
            <span className="font-medium">{good.name}</span>
            <span className="text-xs text-parchment-dark">
              {good.category}
            </span>
            <span className="text-right text-gold-400">{good.buyPrice}</span>
            <span className="text-right text-parchment-dark">
              {good.inCargo}
            </span>
            <button
              type="button"
              onClick={() => {
                setSelectedGoodId(good.id)
                setQuantity(1)
                setMessage(null)
              }}
              disabled={!good.canAfford}
              className="rounded bg-gold-500/20 px-2 py-1 text-xs text-gold-400 hover:bg-gold-500/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              买入
            </button>
          </div>
        ))}
      </div>

      {/* 购买弹窗 */}
      {selectedGood && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-80 rounded-lg border border-ocean-600 bg-ocean-800 p-6 shadow-xl">
            <h3 className="mb-2 text-lg font-semibold text-gold-400">
              购买 {selectedGood.name}
            </h3>
            <div className="space-y-2 text-sm text-parchment-dark">
              <div className="flex justify-between">
                <span>单价</span>
                <span className="text-gold-400">
                  {selectedGood.buyPrice}
                </span>
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

            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
                className="rounded bg-ocean-700 px-3 py-1 text-sm hover:bg-ocean-600 disabled:opacity-30"
              >
                -
              </button>
              <input
                type="number"
                value={quantity}
                min={1}
                onChange={(e) =>
                  setQuantity(Math.max(1, Number(e.target.value)))
                }
                className="w-20 rounded bg-ocean-900 border border-ocean-600 px-3 py-1 text-center text-sm text-parchment"
              />
              <button
                type="button"
                onClick={() => setQuantity(quantity + 1)}
                className="rounded bg-ocean-700 px-3 py-1 text-sm hover:bg-ocean-600"
              >
                +
              </button>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const fd = new FormData()
                  fd.set("goodId", selectedGood.id)
                  fd.set("quantity", String(quantity))
                  doBuy(fd)
                }}
                disabled={!canBuy || loading}
                className="flex-1 rounded bg-gold-500 py-2 text-sm font-bold text-ocean-900 hover:bg-gold-400 transition-colors disabled:opacity-50"
              >
                {loading ? "购买中..." : "确认购买"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedGoodId(null)
                  setQuantity(1)
                }}
                className="rounded bg-ocean-700 px-4 py-2 text-sm hover:bg-ocean-600 transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
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
  )
}
