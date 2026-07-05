import type { HarborView } from "../types/game-view";

/** 港口总览页面的展示组件（纯渲染，无客户端交互） */
export function HarborDashboard({ view }: { view: HarborView }) {
  const hpPercent =
    view.shipMaxHp > 0
      ? Math.round((view.shipCurrentHp / view.shipMaxHp) * 100)
      : 0;
  const hpColor =
    hpPercent > 60
      ? "bg-green-500"
      : hpPercent > 30
        ? "bg-yellow-500"
        : "bg-red-500";

  return (
    <div className="flex-1 p-4 max-w-2xl mx-auto w-full space-y-4">
      {/* 状态栏 */}
      <div className="flex items-center justify-between rounded-lg border border-ocean-600 bg-ocean-800/80 px-4 py-2 text-sm">
        <div className="flex items-center gap-4">
          <span className="font-bold text-gold-400">{view.portName}</span>
          {view.selectedTitleName && (
            <a
              href="/titles"
              className="text-xs text-parchment-dark/80 hover:text-gold-400 transition-colors border border-ocean-600 rounded px-1.5 py-0.5"
            >
              {view.selectedTitleName}
            </a>
          )}
          <span className="text-parchment-dark">第 {view.currentDay} 天</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gold-400">Lv.{view.playerLevel}</span>
            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-ocean-700">
              <div
                className="h-full rounded-full bg-gold-500"
                style={{
                  width: `${view.playerExpToNext > 0 ? Math.min(100, (view.playerExp / view.playerExpToNext) * 100) : 0}%`,
                }}
              />
            </div>
            <span className="text-xs text-parchment-dark/60">
              {view.playerExpToNext > 0
                ? Math.round((view.playerExp / view.playerExpToNext) * 100)
                : 0}
              %
            </span>
          </div>
          <span className="text-gold-400">
            <span className="text-parchment-dark">金币</span>{" "}
            {view.playerGold.toLocaleString()}
          </span>
          <span className="text-parchment-dark">
            舱容 {view.cargoCount}/{view.cargoCapacity}
          </span>
          <span className="text-parchment-dark">
            船员 {view.crew}/{view.maxCrew}
          </span>
        </div>
      </div>

      {/* 港口信息 */}
      <div className="rounded-lg border border-ocean-600 bg-ocean-800/80 p-4">
        <h2 className="text-lg font-semibold text-gold-400">{view.portName}</h2>
        <p className="mt-1 text-sm text-parchment-dark">
          {view.portDescription}
        </p>
        <p className="mt-2 text-xs text-parchment-dark">地区：{view.region}</p>
      </div>

      {/* 船只信息 */}
      <div className="rounded-lg border border-ocean-600 bg-ocean-800/80 p-4">
        <h3 className="text-sm font-semibold text-gold-400">船只</h3>
        <p className="mt-1 text-sm">{view.shipName}</p>
        <div className="mt-2 flex items-center gap-2">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-ocean-700">
            <div
              className={`h-full rounded-full ${hpColor}`}
              style={{
                width: `${hpPercent}%`,
              }}
            />
          </div>
          <span className="text-xs text-parchment-dark">
            {view.shipCurrentHp}/{view.shipMaxHp}
          </span>
        </div>
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
          href="/ship"
          className="rounded-lg border border-ocean-600 bg-ocean-700/60 p-3 text-center text-sm hover:bg-ocean-700 transition-colors"
        >
          <div className="font-semibold text-gold-400">造船厂</div>
          <div className="mt-1 text-xs text-parchment-dark">维护与买卖船只</div>
        </a>
        <a
          href="/tavern"
          className="rounded-lg border border-ocean-600 bg-ocean-700/60 p-3 text-center text-sm hover:bg-ocean-700 transition-colors"
        >
          <div className="font-semibold text-gold-400">酒馆</div>
          <div className="mt-1 text-xs text-parchment-dark">招募与解雇船员</div>
        </a>
        <a
          href="/fleet"
          className="rounded-lg border border-ocean-600 bg-ocean-700/60 p-3 text-center text-sm hover:bg-ocean-700 transition-colors"
        >
          <div className="font-semibold text-gold-400">舰队</div>
          <div className="mt-1 text-xs text-parchment-dark">管理舰队</div>
        </a>
        <a
          href="/npc"
          className="rounded-lg border border-ocean-600 bg-ocean-700/60 p-3 text-center text-sm hover:bg-ocean-700 transition-colors"
        >
          <div className="font-semibold text-gold-400">
            人物
            {view.npcsAtPort.length > 0 ? ` (${view.npcsAtPort.length})` : ""}
          </div>
          <div className="mt-1 text-xs text-parchment-dark">对话·送礼·招募</div>
        </a>
        <a
          href="/quests"
          className="rounded-lg border border-ocean-600 bg-ocean-700/60 p-3 text-center text-sm hover:bg-ocean-700 transition-colors"
        >
          <div className="font-semibold text-gold-400">
            任务{view.questsAvailable > 0 ? ` (${view.questsAvailable})` : ""}
          </div>
          <div className="mt-1 text-xs text-parchment-dark">接取与交付任务</div>
        </a>
        <a
          href="/titles"
          className="rounded-lg border border-ocean-600 bg-ocean-700/60 p-3 text-center text-sm hover:bg-ocean-700 transition-colors"
        >
          <div className="font-semibold text-gold-400">
            称号
            {view.unlockedTitleCount > 0 ? ` (${view.unlockedTitleCount})` : ""}
          </div>
          <div className="mt-1 text-xs text-parchment-dark">查看与切换称号</div>
        </a>
        <a
          href="/saves"
          className="rounded-lg border border-ocean-600 bg-ocean-700/60 p-3 text-center text-sm hover:bg-ocean-700 transition-colors"
        >
          <div className="font-semibold text-gold-400">存档管理</div>
          <div className="mt-1 text-xs text-parchment-dark">
            手动存档、读取与删除
          </div>
        </a>
      </div>

      {/* 副本 — 仅在当前港口有副本时显示 */}
      {view.availableDungeonName && (
        <a
          href="/dungeon"
          className="block rounded-lg border border-ocean-600 bg-ocean-700/60 p-3 text-center text-sm hover:bg-ocean-700 transition-colors"
        >
          <div className="font-semibold text-gold-400">副本</div>
          <div className="mt-1 text-xs text-parchment-dark">
            {view.availableDungeonName}
          </div>
        </a>
      )}

      {/* 收集 */}
      <h3 className="text-sm font-semibold text-gold-400">记录</h3>
      <div className="grid grid-cols-2 gap-3">
        <a
          href="/achievements"
          className="rounded-lg border border-ocean-600 bg-ocean-700/60 p-3 text-center text-sm hover:bg-ocean-700 transition-colors"
        >
          <div className="font-semibold text-gold-400">成就</div>
          <div className="mt-1 text-xs text-parchment-dark">
            查看与领取成就奖励
          </div>
        </a>
        <a
          href="/collection"
          className="rounded-lg border border-ocean-600 bg-ocean-700/60 p-3 text-center text-sm hover:bg-ocean-700 transition-colors"
        >
          <div className="font-semibold text-gold-400">图鉴</div>
          <div className="mt-1 text-xs text-parchment-dark">已探索内容一览</div>
        </a>
      </div>
    </div>
  );
}
