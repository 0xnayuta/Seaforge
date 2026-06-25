"use client"

import { useActionState } from "react"
import { loadGame } from "./actions/save"

export default function HarborPage() {
  const [view, formAction, isPending] = useActionState(loadGame, null)

  if (!view) {
    return (
      <form action={formAction} className="flex-1 flex items-center justify-center">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-gold-500 px-6 py-3 text-lg font-bold text-ocean-900 hover:bg-gold-400 transition-colors disabled:opacity-50"
        >
          {isPending ? "加载中..." : "开始航海"}
        </button>
      </form>
    )
  }

  return (
    <div className="flex-1 p-4 max-w-2xl mx-auto w-full space-y-4">
      {/* 状态栏 */}
      <div className="flex items-center justify-between rounded-lg border border-ocean-600 bg-ocean-800/80 px-4 py-2 text-sm">
        <div className="flex items-center gap-4">
          <span className="font-bold text-gold-400">{view.portName}</span>
          <span className="text-parchment-dark">第 {view.currentDay} 天</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-gold-400">
            <span className="text-parchment-dark">金币</span> {view.playerGold.toLocaleString()}
          </span>
          <span className="text-parchment-dark">
            舱 {view.cargoCount}/{view.cargoCapacity}
          </span>
        </div>
      </div>

      {/* 港口信息 */}
      <div className="rounded-lg border border-ocean-600 bg-ocean-800/80 p-4">
        <h2 className="text-lg font-semibold text-gold-400">{view.portName}</h2>
        <p className="mt-1 text-sm text-parchment-dark">{view.portDescription}</p>
        <p className="mt-2 text-xs text-ocean-500">地区：{view.region}</p>
      </div>

      {/* 船只信息 */}
      <div className="rounded-lg border border-ocean-600 bg-ocean-800/80 p-4">
        <h3 className="text-sm font-semibold text-gold-400">船只</h3>
        <p className="mt-1 text-sm">{view.shipName}</p>
      </div>

      {/* 快捷操作 */}
      <div className="grid grid-cols-2 gap-3">
        <a
          href="/market"
          className="rounded-lg border border-ocean-600 bg-ocean-700/60 p-3 text-center text-sm hover:bg-ocean-700 transition-colors"
        >
          <div className="font-semibold text-gold-400">交易所</div>
          <div className="mt-1 text-xs text-parchment-dark">查看商品价格</div>
        </a>
        <a
          href="/navigation"
          className="rounded-lg border border-ocean-600 bg-ocean-700/60 p-3 text-center text-sm hover:bg-ocean-700 transition-colors"
        >
          <div className="font-semibold text-gold-400">航海图</div>
          <div className="mt-1 text-xs text-parchment-dark">选择目的港</div>
        </a>
        <a
          href="/cargo"
          className="rounded-lg border border-ocean-600 bg-ocean-700/60 p-3 text-center text-sm hover:bg-ocean-700 transition-colors"
        >
          <div className="font-semibold text-gold-400">船舱</div>
          <div className="mt-1 text-xs text-parchment-dark">查看货物</div>
        </a>
        <a
          href="/ship"
          className="rounded-lg border border-ocean-600 bg-ocean-700/60 p-3 text-center text-sm hover:bg-ocean-700 transition-colors"
        >
          <div className="font-semibold text-gold-400">造船厂</div>
          <div className="mt-1 text-xs text-parchment-dark">升级船只</div>
        </a>
      </div>
    </div>
  )
}
