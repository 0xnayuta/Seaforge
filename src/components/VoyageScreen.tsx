"use client";

import type { VoyageEventView, VoyageView } from "../types/game-view";

interface VoyageScreenProps {
  readonly view: VoyageView;
}

export function VoyageScreen({ view }: VoyageScreenProps) {
  return (
    <div className="flex-1 p-4 max-w-2xl mx-auto w-full space-y-4">
      <VoyageStatusBar
        fromPortName={view.fromPortName}
        toPortName={view.toPortName}
        travelDays={view.travelDays}
        armamentLabel={view.armamentLabel}
      />

      <VoyageRoute
        fromPortName={view.fromPortName}
        toPortName={view.toPortName}
      />

      <EventLog events={view.events} />
    </div>
  );
}

// ---- 子组件 ----

interface VoyageStatusBarProps {
  readonly fromPortName: string;
  readonly toPortName: string;
  readonly travelDays: number;
  readonly armamentLabel: string;
}

function VoyageStatusBar({
  fromPortName,
  toPortName,
  travelDays,
  armamentLabel,
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
        <span className="text-xs text-gold-500/70">配置：{armamentLabel}</span>
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
        {events.map((event, i) => (
          <EventLogEntry key={`day-${event.day}-${i}`} event={event} />
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
  const resultColor =
    log.result === "胜利"
      ? "text-green-400"
      : log.result === "受损"
        ? "text-yellow-400"
        : "text-red-400";

  return (
    <div className="mt-1 rounded border border-ocean-600 bg-ocean-800/60 px-2 py-1.5">
      <div className="flex items-center gap-2 text-xs">
        <span className={resultColor}>[{log.result}]</span>
        <span className="text-parchment-dark">{log.description}</span>
      </div>
      <div className="mt-1 text-xs text-parchment-dark/60">
        {log.hpDamage > 0 && <span>船体受损 -{log.hpDamage} </span>}
        {log.cargoLoss > 0 && <span>货物损失 {log.cargoLoss} 单位</span>}
        {log.allCargoLost && <span>所有货物全部丢失</span>}
      </div>
    </div>
  );
}
