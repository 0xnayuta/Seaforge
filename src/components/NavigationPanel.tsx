"use client";
import { useState, useTransition } from "react";

import { startTravel } from "../app/actions/travel";
import { computeSurvivalRate } from "../game/domain/survival";
import type { NavigationView } from "../types/game-view";
import { DepartureConfirmModal } from "./DepartureConfirmModal";
import { DestinationsTable } from "./DestinationsTable";

interface NavigationPanelProps {
  readonly view: NavigationView;
}

export function NavigationPanel({ view }: NavigationPanelProps) {
  const [isTravelPending, startTravelTransition] = useTransition();
  const [selectedDest, setSelectedDest] = useState<{
    portId: string;
    portName: string;
    travelDays: number;
    estimatedProfit: number;
    baseDangerScore: number;
  } | null>(null);

  // 舰队船只选择 — 默认全选
  // 舰队船只选择 — 默认全选
  const [selectedShipIds, setSelectedShipIds] = useState<string[]>(() =>
    view.fleetShips.map((s) => s.id),
  );

  const selectedShips = view.fleetShips.filter((s) =>
    selectedShipIds.includes(s.id),
  );

  // 舰队统计
  const totalCargoCapacity = selectedShips.reduce(
    (sum, s) => sum + s.cargoCapacity,
    0,
  );
  const totalCargoUsed = selectedShips.reduce((sum, s) => sum + s.cargoUsed, 0);
  const isOverCargo = totalCargoUsed > totalCargoCapacity;
  const totalCrewRequired = selectedShips.reduce(
    (sum, s) => sum + s.baseCrew,
    0,
  );
  const isCrewInsufficient = view.crew < totalCrewRequired;
  const slowestSpeed =
    selectedShips.length > 0
      ? Math.min(...selectedShips.map((s) => s.speed))
      : 0;

  function getSurvivalRate(baseDangerScore: number): number {
    if (selectedShips.length === 0) return 0;
    const totalDefenseMultiplier = selectedShips.reduce(
      (sum, s) => sum + s.defenseMultiplier,
      0,
    );
    const totalHpRatio = selectedShips.reduce((sum, s) => {
      const hpRatio = s.maxDurability > 0 ? s.durability / s.maxDurability : 0;
      return sum + hpRatio;
    }, 0);
    const avgDefenseMultiplier = totalDefenseMultiplier / selectedShips.length;
    const avgHpRatio = totalHpRatio / selectedShips.length;

    return computeSurvivalRate(
      avgDefenseMultiplier,
      avgHpRatio,
      baseDangerScore,
    );
  }

  function toggleShip(shipId: string) {
    setSelectedShipIds((prev) =>
      prev.includes(shipId)
        ? prev.filter((id) => id !== shipId)
        : [...prev, shipId],
    );
  }

  return (
    <div className="flex-1 p-4 max-w-2xl mx-auto w-full space-y-4">
      <div className="rounded-lg border border-ocean-600 bg-ocean-800/80 px-4 py-2 text-sm flex items-center justify-between">
        <span className="font-bold text-gold-400">
          航海图 - 当前港口：{view.currentPortName}
        </span>
        <span className="text-xs text-parchment-dark">
          拥有船员：{view.crew}/{view.maxCrew} 人
        </span>
      </div>

      {isCrewInsufficient && view.fleetShips.length <= 1 && (
        <div className="rounded-lg border border-red-500 bg-red-500/10 p-3 text-sm text-red-400 text-center">
          ⚠ 拥有船员不足最低起航需求（需要 {totalCrewRequired} 人，当前拥有{" "}
          {view.crew} 人），请先前往酒馆招募！
        </div>
      )}

      {/* 舰队选择 */}
      {view.fleetShips.length > 1 && (
        <div className="rounded-lg border border-ocean-600 bg-ocean-800/80 p-4">
          <h3 className="mb-3 text-sm font-semibold text-gold-400">
            出航舰队选择
          </h3>
          <div className="space-y-2">
            {view.fleetShips.map((ship) => {
              const isSelected = selectedShipIds.includes(ship.id);
              const hpPct =
                ship.maxDurability > 0
                  ? Math.round((ship.durability / ship.maxDurability) * 100)
                  : 0;
              return (
                <label
                  key={ship.id}
                  className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                    ship.durability <= 0
                      ? "border-red-500/40 bg-red-500/10 opacity-60"
                      : isSelected
                        ? "border-gold-500 bg-gold-500/10"
                        : "border-ocean-600 hover:border-ocean-500"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    disabled={ship.durability <= 0}
                    onChange={() => toggleShip(ship.id)}
                    className="accent-gold-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-parchment">
                        {ship.name}
                      </span>
                      <span className="text-xs text-parchment-dark">
                        {ship.typeName}
                      </span>
                    </div>
                    <div className="mt-1 flex gap-3 text-xs text-parchment-dark">
                      <span>速度 {ship.speed}</span>
                      <span>
                        耐久 {ship.durability}/{ship.maxDurability}
                      </span>
                      <span>
                        舱容 {ship.cargoUsed}/{ship.cargoCapacity}
                      </span>
                    </div>
                    {ship.durability > 0 && (
                      <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-ocean-700">
                        <div
                          className={`h-full rounded-full ${
                            hpPct > 60
                              ? "bg-green-500"
                              : hpPct > 30
                                ? "bg-yellow-500"
                                : "bg-red-500"
                          }`}
                          style={{ width: `${hpPct}%` }}
                        />
                      </div>
                    )}
                    {ship.durability <= 0 && (
                      <p className="mt-1 text-xs text-red-400">
                        船体严重损坏，无法出航
                      </p>
                    )}
                  </div>
                </label>
              );
            })}
          </div>

          {/* 舰队统计 */}
          {selectedShips.length > 0 && (
            <div className="mt-3 space-y-1.5 border-t border-ocean-700 pt-3 text-xs text-parchment-dark">
              <div className="flex gap-4">
                <span>出航船只：{selectedShips.length} 艘</span>
                <span>
                  舱容：{totalCargoUsed}/{totalCargoCapacity}
                </span>
                <span>最慢速度：{slowestSpeed}</span>
              </div>
              <div className="flex gap-4 items-center">
                <span>
                  船员需求：
                  <span
                    className={
                      isCrewInsufficient
                        ? "text-red-400 font-bold"
                        : "text-parchment"
                    }
                  >
                    {totalCrewRequired}
                  </span>{" "}
                  / 拥有：{view.crew} 人
                </span>
                {isCrewInsufficient && (
                  <span className="text-red-400 font-medium">
                    ⚠ 船员不足，无法起航！
                  </span>
                )}
              </div>
            </div>
          )}
          {selectedShips.length === 0 && (
            <p className="mt-2 text-xs text-yellow-400">请至少选择一艘船只</p>
          )}
        </div>
      )}

      <DestinationsTable
        destinations={view.destinations}
        getSurvivalRate={getSurvivalRate}
        onSelectDestination={setSelectedDest}
      />

      {selectedDest && (
        <DepartureConfirmModal
          dest={selectedDest}
          isOverCargo={isOverCargo}
          isCrewInsufficient={isCrewInsufficient}
          selectedShipNames={selectedShips
            .map((s) => `${s.name} (${s.armamentLabel})`)
            .join(", ")}
          survivalRate={getSurvivalRate(selectedDest.baseDangerScore)}
          isTravelPending={isTravelPending}
          selectedShipCount={selectedShips.length}
          isSingleShip={view.fleetShips.length <= 1}
          onConfirm={() => {
            startTravelTransition(async () => {
              try {
                const fd = new FormData();
                fd.set("portId", selectedDest.portId);
                fd.set("shipIds", JSON.stringify(selectedShipIds));
                await startTravel(fd);
              } catch {
                // startTravel 成功后 redirect 到 /voyage，
                // 抛异常时关闭弹窗由用户重试
                setSelectedDest(null);
              }
            });
          }}
          onClose={() => setSelectedDest(null)}
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
