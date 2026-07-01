"use client";

import { acceptBoarding, surrenderAfterFleetLoss } from "../app/actions/combat";
import { completeVoyage } from "../app/voyage/actions";
import type { VoyageEventView, VoyageView } from "../types/game-view";
import { CombatPanel } from "./CombatPanel";

interface VoyageScreenProps {
  readonly view: VoyageView;
}

export function VoyageScreen({ view }: VoyageScreenProps) {
  // 战斗进行中 → 显示战斗面板
  if (view.combatState) {
    // 战斗已结束
    if (view.combatState.status === "victory") {
      return (
        <div className="flex-1 p-4 max-w-2xl mx-auto w-full space-y-4">
          <CombatPanel combatView={view.combatState} />
          <div className="text-center">
            <form action={completeVoyage}>
              <button
                type="submit"
                disabled={false}
                className="rounded-lg bg-gold-500 px-6 py-2 font-bold text-ocean-900 hover:bg-gold-400 transition-colors disabled:opacity-50"
              >
                继续航行
              </button>
            </form>
          </div>
        </div>
      );
    }
    // 战斗失败 → 已遣返港口，显示结果后返回港口
    if (view.combatState.status === "defeat") {
      return (
        <div className="flex-1 p-4 max-w-2xl mx-auto w-full space-y-4">
          <CombatPanel combatView={view.combatState} />
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
    // 战斗中（in_progress / surrendered）→ 显示战斗面板
    return (
      <div className="flex-1 p-4 max-w-2xl mx-auto w-full space-y-4">
        <CombatPanel combatView={view.combatState} />
      </div>
    );
  }
  if (view.combatChoice?.hasSelection) {
    return (
      <div className="flex-1 p-4 max-w-2xl mx-auto w-full space-y-4">
        <div className="rounded-lg border border-red-600 bg-red-900/30 p-6 text-center">
          <h2 className="text-lg font-bold text-red-400">舰队战败！</h2>
          <p className="mt-2 text-sm text-parchment-dark">
            你的舰队在海战中失利了。请选择您的命运：
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <form action={surrenderAfterFleetLoss}>
            <button
              type="submit"
              disabled={false}
              className="w-full rounded-lg border border-yellow-600 bg-yellow-700/40 px-4 py-4 text-center hover:bg-yellow-600/40 transition-colors disabled:opacity-50"
            >
              <span className="block font-bold text-yellow-300">投降</span>
              <span className="mt-1 text-xs text-parchment-dark">
                损失全部货物与 15% 金币，继续航行
              </span>
            </button>
          </form>

          <form action={acceptBoarding}>
            <button
              type="submit"
              disabled={false}
              className="w-full rounded-lg border border-red-600 bg-red-700/40 px-4 py-4 text-center hover:bg-red-600/40 transition-colors disabled:opacity-50"
            >
              <span className="block font-bold text-red-300">接舷战</span>
              <span className="mt-1 text-xs text-parchment-dark">
                进入人物回合制战斗，胜负在此一举！
              </span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 正常航行界面
  return (
    <div className="flex-1 p-4 max-w-2xl mx-auto w-full space-y-4">
      <VoyageStatusBar
        fromPortName={view.fromPortName}
        toPortName={view.toPortName}
        travelDays={view.travelDays}
        fleetShipCount={view.fleetShipCount}
      />

      <VoyageRoute
        fromPortName={view.fromPortName}
        toPortName={view.toPortName}
      />

      <EventLog events={view.events} />

      <div className="text-center">
        <form action={completeVoyage}>
          <button
            type="submit"
            disabled={false}
            className="rounded-lg bg-gold-500 px-8 py-3 text-lg font-bold text-ocean-900 hover:bg-gold-400 transition-colors disabled:opacity-50"
          >
            推进航行
          </button>
        </form>
      </div>
    </div>
  );
}

// ---- 子组件 ----

interface VoyageStatusBarProps {
  readonly fromPortName: string;
  readonly toPortName: string;
  readonly travelDays: number;
  readonly fleetShipCount: number;
}

function VoyageStatusBar({
  fromPortName,
  toPortName,
  travelDays,
  fleetShipCount,
}: VoyageStatusBarProps) {
  return (
    <div className="rounded-lg border border-ocean-600 bg-ocean-800/80 px-4 py-3 text-sm">
      <div className="flex items-center justify-between">
        <span className="font-bold text-gold-400">航行中</span>
        <span className="text-parchment-dark">
          {fromPortName} → {toPortName}
        </span>
      </div>
      <div className="mt-1 flex items-center justify-between">
        <span className="text-xs text-ocean-500">
          预计 {travelDays} 天后到达
        </span>
        <span className="text-xs text-gold-500/70">
          编队：{fleetShipCount} 艘
        </span>
      </div>
    </div>
  );
}

interface VoyageRouteProps {
  readonly fromPortName: string;
  readonly toPortName: string;
}

function VoyageRoute({ fromPortName, toPortName }: VoyageRouteProps) {
  return (
    <div className="rounded-lg border border-ocean-600 bg-ocean-800/80 p-4">
      <div className="flex items-center gap-2 text-sm text-parchment-dark">
        <span>{fromPortName}</span>
        <span className="flex-1 text-center text-ocean-500">······</span>
        <span className="text-gold-400">{toPortName}</span>
      </div>
    </div>
  );
}

interface EventLogProps {
  readonly events: readonly VoyageEventView[];
}

function EventLog({ events }: EventLogProps) {
  if (events.length === 0) {
    return (
      <div className="rounded-lg border border-ocean-600 bg-ocean-800/80 p-4 text-center text-sm text-parchment-dark">
        航行风平浪静，没有任何特别的事情发生
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-ocean-600 bg-ocean-800/80 p-4">
      <h3 className="mb-3 text-sm font-semibold text-gold-400">航行日志</h3>
      <div className="space-y-2">
        {events.map((event) => (
          <EventLogEntry key={`day-${event.day}`} event={event} />
        ))}
      </div>
    </div>
  );
}

interface EventLogEntryProps {
  readonly event: VoyageEventView;
}

function EventLogEntry({ event }: EventLogEntryProps) {
  const effectClass =
    event.effect.includes("损失") || event.effect.includes("丢失")
      ? "mt-0.5 text-xs text-red-400"
      : "mt-0.5 text-xs text-green-400";

  return (
    <div className="rounded bg-ocean-700/40 px-3 py-2 text-sm">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 text-xs text-ocean-500 whitespace-nowrap">
          第 {event.day} 天
        </span>
        <div className="flex-1">
          <p className="text-parchment">{event.description}</p>
          {event.effect !== "无影响" && (
            <p className={effectClass}>{event.effect}</p>
          )}
          {event.combatLog && <CombatLogEntry log={event.combatLog} />}
        </div>
      </div>
    </div>
  );
}

interface CombatLogEntryProps {
  readonly log: {
    readonly result: string;
    readonly description: string;
    readonly hpDamage: number;
    readonly cargoLoss: number;
    readonly allCargoLost?: true;
  };
}

function CombatLogEntry({ log }: CombatLogEntryProps) {
  return (
    <div className="mt-1 rounded bg-ocean-800/60 px-2 py-1">
      <p className="text-xs font-semibold text-gold-500">
        {log.result === "victory"
          ? "战斗胜利"
          : log.result === "partialLoss"
            ? "遭受损失"
            : "全损"}
      </p>
      <p className="text-xs text-parchment-dark">{log.description}</p>
      {log.hpDamage > 0 && (
        <p className="text-xs text-red-400">舰体损伤：{log.hpDamage}</p>
      )}
      {log.cargoLoss > 0 && (
        <p className="text-xs text-red-400">货物损失：{log.cargoLoss} 单位</p>
      )}
      {log.allCargoLost && (
        <p className="text-xs text-red-400">全部货物丢失！</p>
      )}
    </div>
  );
}
