"use client";

import { useState, useTransition } from "react";
import {
  advanceDungeonFloorAction,
  escapeDungeonAction,
  performDungeonCombatAction,
} from "../app/actions/dungeon";
import type { DungeonView } from "../types/game-view";
import { CombatPanel } from "./CombatPanel";

interface DungeonPanelProps {
  readonly view: DungeonView;
}

export function DungeonPanel({ view }: DungeonPanelProps) {
  const [displayView, setDisplayView] = useState(view);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // 战斗进行中 → CombatPanel
  if (displayView.combatView) {
    return (
      <div className="flex-1 p-4 max-w-2xl mx-auto w-full space-y-4">
        <CombatPanel
          combatView={displayView.combatView}
          onAction={performDungeonCombatAction}
        />
      </div>
    );
  }

  // 副本已通关
  if (displayView.status === "cleared") {
    return (
      <div className="flex-1 p-4 max-w-2xl mx-auto w-full space-y-4">
        <div className="rounded-lg border border-green-600 bg-green-900/30 p-6 text-center">
          <h2 className="text-lg font-bold text-green-400">副本通关！</h2>
          <p className="mt-2 text-sm text-parchment-dark">
            {displayView.name} 已全部探索完毕。
          </p>
          {displayView.itemsGained.length > 0 && (
            <p className="mt-1 text-xs text-parchment-dark">
              获得物品：{displayView.itemsGained.join("、")}
            </p>
          )}
          {displayView.goldGained > 0 && (
            <p className="text-xs text-parchment-dark">
              获得金币：{displayView.goldGained.toLocaleString()}
            </p>
          )}
        </div>
        <div className="text-center">
          <a
            href="/"
            className="inline-block rounded-lg bg-gold-500 px-6 py-2 font-bold text-ocean-900 hover:bg-gold-400 transition-colors"
          >
            返回港口
          </a>
        </div>
      </div>
    );
  }

  // 副本失败
  if (displayView.status === "failed") {
    return (
      <div className="flex-1 p-4 max-w-2xl mx-auto w-full space-y-4">
        <div className="rounded-lg border border-red-600 bg-red-900/30 p-6 text-center">
          <h2 className="text-lg font-bold text-red-400">失败</h2>
          <p className="mt-2 text-sm text-parchment-dark">
            探索 {displayView.name} 失败...
          </p>
          {displayView.goldGained > 0 && (
            <p className="mt-1 text-xs text-parchment-dark">
              保留金币：{displayView.goldGained.toLocaleString()}
            </p>
          )}
        </div>
        <div className="text-center">
          <a
            href="/"
            className="inline-block rounded-lg bg-gold-500 px-6 py-2 font-bold text-ocean-900 hover:bg-gold-400 transition-colors"
          >
            返回港口
          </a>
        </div>
      </div>
    );
  }

  // 错误显示
  if (error) {
    return (
      <div className="rounded-lg border border-red-500 bg-red-500/10 p-3 text-sm text-red-400 text-center">
        {error}
      </div>
    );
  }

  // 副本进行中 — 显示当前事件
  const handleAdvance = async () => {
    setError(null);
    startTransition(async () => {
      try {
        const nextView = await advanceDungeonFloorAction();
        setDisplayView(nextView);
      } catch (e) {
        setError(e instanceof Error ? e.message : "推进失败");
      }
    });
  };

  const handleChoice = async (choiceId: string) => {
    setError(null);
    startTransition(async () => {
      try {
        const nextView = await advanceDungeonFloorAction(choiceId);
        setDisplayView(nextView);
      } catch (e) {
        setError(e instanceof Error ? e.message : "选择失败");
      }
    });
  };

  const handleEscape = async () => {
    setError(null);
    startTransition(async () => {
      try {
        const nextView = await escapeDungeonAction();
        setDisplayView(nextView);
      } catch (e) {
        setError(e instanceof Error ? e.message : "退出失败");
      }
    });
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-500 bg-red-500/10 p-3 text-sm text-red-400 text-center">
          {error}
        </div>
      )}

      {/* 标题栏 */}
      <div className="rounded-lg border border-ocean-600 bg-ocean-800/80 px-4 py-2 text-sm flex items-center justify-between">
        <span className="font-bold text-gold-400">{displayView.name}</span>
        <span className="text-parchment-dark">
          第 {displayView.currentFloor + 1} / {displayView.totalFloors} 层
        </span>
      </div>

      {/* 状态摘要 */}
      <div className="flex gap-4 text-xs text-parchment-dark">
        {displayView.hpLoss > 0 && <span>累计受伤：{displayView.hpLoss}</span>}
        {displayView.goldGained > 0 && (
          <span>获得金币：{displayView.goldGained.toLocaleString()}</span>
        )}
      </div>

      {/* 当前楼层事件 */}
      {displayView.currentEvent && (
        <div className="rounded-lg border border-ocean-600 bg-ocean-800/80 p-4 space-y-3">
          {/* 事件描述 */}
          {displayView.currentEvent.flavorText && (
            <p className="text-sm text-parchment leading-relaxed">
              {displayView.currentEvent.flavorText}
            </p>
          )}

          {/* 宝箱事件 */}
          {displayView.currentEvent.type === "treasure" && (
            <div className="text-center">
              <p className="text-sm text-gold-400">发现宝箱！</p>
              {displayView.currentEvent.goldReward && (
                <p className="text-xs text-parchment-dark">
                  +{displayView.currentEvent.goldReward} 金币
                </p>
              )}
              {displayView.currentEvent.expReward && (
                <p className="text-xs text-parchment-dark">
                  +{displayView.currentEvent.expReward} 经验
                </p>
              )}
            </div>
          )}

          {/* 选择事件 */}
          {displayView.currentEvent.type === "choice" &&
            displayView.currentEvent.options && (
              <div className="grid gap-2">
                {displayView.currentEvent.options.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={isPending}
                    onClick={() => handleChoice(opt.id)}
                    className="w-full rounded-lg border border-ocean-600 bg-ocean-700/60 px-4 py-3 text-left text-sm text-parchment hover:bg-ocean-700 transition-colors disabled:opacity-50"
                  >
                    {opt.text}
                  </button>
                ))}
              </div>
            )}
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex gap-3">
        <button
          type="button"
          disabled={isPending}
          onClick={handleAdvance}
          className="flex-1 rounded-lg bg-gold-500 px-4 py-2 text-sm font-bold text-ocean-900 hover:bg-gold-400 transition-colors disabled:opacity-50"
        >
          {isPending ? "处理中..." : "继续前进"}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={handleEscape}
          className="rounded-lg border border-red-600 px-4 py-2 text-sm text-red-400 hover:bg-red-900/30 transition-colors disabled:opacity-50"
        >
          退出副本
        </button>
      </div>
    </div>
  );
}
