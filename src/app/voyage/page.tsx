export const dynamic = "force-dynamic";

import { buildVoyageView } from "../../game/view-builder/buildGameView";
import { prisma } from "../../lib/prisma";
import { loadWorld } from "../../lib/repository";
import { completeVoyage } from "./actions";

export default async function VoyagePage() {
  const world = await loadWorld(prisma);

  if (!world.voyage) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 space-y-4">
        <div className="rounded-lg border border-ocean-600 bg-ocean-800/80 p-6 text-center max-w-md">
          <h2 className="text-lg font-bold text-gold-400">没有进行中的航行</h2>
          <p className="mt-2 text-sm text-parchment-dark">
            请先通过航海图选择目的港
          </p>
        </div>
        <a
          href="/navigation"
          className="rounded-lg bg-gold-500 px-6 py-3 font-bold text-ocean-900 hover:bg-gold-400 transition-colors"
        >
          前往航海图
        </a>
      </div>
    );
  }

  const view = buildVoyageView(world);

  return (
    <div className="flex-1 p-4 max-w-2xl mx-auto w-full space-y-4">
      {/* 航行状态 */}
      <div className="rounded-lg border border-ocean-600 bg-ocean-800/80 px-4 py-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="font-bold text-gold-400">航行中</span>
          <span className="text-parchment-dark">
            {view.fromPortName} → {view.toPortName}
          </span>
        </div>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-xs text-ocean-500">
            预计 {view.travelDays} 天后到达
          </span>
          <span className="text-xs text-gold-500/70">
            配置：{view.armamentLabel}
          </span>
        </div>
      </div>

      {/* 航线 */}
      <div className="rounded-lg border border-ocean-600 bg-ocean-800/80 p-4">
        <div className="flex items-center gap-2 text-sm text-parchment-dark">
          <span>{view.fromPortName}</span>
          <span className="flex-1 text-center text-ocean-500">······</span>
          <span className="text-gold-400">{view.toPortName}</span>
        </div>
      </div>

      {/* 航行日志 */}
      {view.events.length > 0 ? (
        <div className="rounded-lg border border-ocean-600 bg-ocean-800/80 p-4">
          <h3 className="mb-3 text-sm font-semibold text-gold-400">航行日志</h3>
          <div className="space-y-2">
            {view.events.map((event, i) => (
              <div
                key={`day-${event.day}-${i}`}
                className="rounded bg-ocean-700/40 px-3 py-2 text-sm"
              >
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 text-xs text-ocean-500 whitespace-nowrap">
                    第 {event.day} 天
                  </span>
                  <div className="flex-1">
                    <p className="text-parchment">{event.description}</p>
                    {event.effect !== "无影响" && (
                      <p
                        className={
                          event.effect.includes("损失") ||
                          event.effect.includes("丢失")
                            ? "mt-0.5 text-xs text-red-400"
                            : "mt-0.5 text-xs text-green-400"
                        }
                      >
                        {event.effect}
                      </p>
                    )}
                    {/* 战斗日志 */}
                    {event.combatLog && (
                      <div className="mt-1 rounded border border-ocean-600 bg-ocean-800/60 px-2 py-1.5">
                        <div className="flex items-center gap-2 text-xs">
                          <span
                            className={
                              event.combatLog.result === "胜利"
                                ? "text-green-400"
                                : event.combatLog.result === "受损"
                                  ? "text-yellow-400"
                                  : "text-red-400"
                            }
                          >
                            [{event.combatLog.result}]
                          </span>
                          <span className="text-parchment-dark">
                            {event.combatLog.description}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-parchment-dark/60">
                          {event.combatLog.hpDamage > 0 && (
                            <span>船体受损 -{event.combatLog.hpDamage} </span>
                          )}
                          {event.combatLog.cargoLoss > 0 && (
                            <span>
                              货物损失 {event.combatLog.cargoLoss} 单位
                            </span>
                          )}
                          {event.combatLog.allCargoLost && (
                            <span>所有货物全部丢失</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-ocean-600 bg-ocean-800/80 p-4 text-center text-sm text-parchment-dark">
          航行风平浪静，没有任何特别的事情发生
        </div>
      )}

      {/* 抵达按钮 */}
      <div className="text-center">
        <form action={completeVoyage}>
          <button
            type="submit"
            className="rounded-lg bg-gold-500 px-8 py-3 text-lg font-bold text-ocean-900 hover:bg-gold-400 transition-colors"
          >
            抵达
          </button>
        </form>
      </div>
    </div>
  );
}
