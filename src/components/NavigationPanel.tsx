"use client";

import { useState, useTransition } from "react";
import { startTravel } from "../app/actions/travel";
import type { NavigationView } from "../types/game-view";
import { Modal } from "./ui/Modal";

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
  } | null>(null);

  // L3: 当前选择的武装配置
  const [selectedArmament, setSelectedArmament] = useState(0);

  const selectedOption = view.armamentOptions[selectedArmament];
  const cargoRatio = selectedOption?.cargoRatio ?? 1;
  const isOverCargo =
    view.currentCargoCount >
    (selectedOption?.effectiveCapacity ?? view.currentCargoCount);
  const riskLevel = selectedOption?.defenseMultiplier ?? 1;

  return (
    <div className="flex-1 p-4 max-w-2xl mx-auto w-full space-y-4">
      <div className="rounded-lg border border-ocean-600 bg-ocean-800/80 px-4 py-2 text-sm">
        <span className="font-bold text-gold-400">
          航海图 - 当前港口：{view.currentPortName}
        </span>
      </div>

      {/* 武装配置选择 */}
      <ArmamentConfig
        options={view.armamentOptions}
        selectedIndex={selectedArmament}
        cargoRatio={cargoRatio}
        isOverCargo={isOverCargo}
        riskLevel={riskLevel}
        currentCargoCount={view.currentCargoCount}
        onChange={setSelectedArmament}
      />

      {/* 目的地列表 */}
      <div className="rounded-lg border border-ocean-600 bg-ocean-800/80 overflow-hidden">
        <div className="grid grid-cols-6 gap-2 border-b border-ocean-600 bg-ocean-700/60 px-4 py-2 text-xs font-semibold text-parchment-dark uppercase tracking-wider">
          <span className="col-span-2">目的地</span>
          <span className="text-right">地区</span>
          <span className="text-right">距离</span>
          <span className="text-right">天数</span>
          <span />
        </div>
        {view.destinations.map((dest) => (
          <div
            key={dest.portId}
            className="grid grid-cols-6 gap-2 items-center border-b border-ocean-700/30 px-4 py-3 text-sm hover:bg-ocean-700/40 transition-colors last:border-b-0"
          >
            <span className="col-span-2 font-medium">{dest.portName}</span>
            <span className="text-right text-xs text-parchment-dark">
              {dest.region}
            </span>
            <span className="text-right text-parchment-dark">
              {dest.distance}
            </span>
            <span className="text-right text-gold-400">{dest.travelDays}</span>
            <button
              type="button"
              onClick={() =>
                setSelectedDest({
                  portId: dest.portId,
                  portName: dest.portName,
                  travelDays: dest.travelDays,
                  estimatedProfit: dest.estimatedProfit,
                })
              }
              className="rounded bg-gold-500/20 px-2 py-1 text-xs text-gold-400 hover:bg-gold-500/30 transition-colors"
            >
              前往
            </button>
          </div>
        ))}
      </div>

      {/* 确认出航弹窗 */}
      {selectedDest && (
        <DepartureConfirmModal
          dest={selectedDest}
          armamentLabel={selectedOption?.label ?? "满载货物"}
          survivalRate={selectedOption?.survivalRate ?? 0}
          isTravelPending={isTravelPending}
          onConfirm={() => {
            startTravelTransition(async () => {
              const fd = new FormData();
              fd.set("portId", selectedDest.portId);
              fd.set("armamentLevel", String(selectedArmament));
              await startTravel(fd);
              window.location.href = "/voyage";
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

// ---- 子组件 ----

interface ArmamentConfigProps {
  readonly options: NavigationView["armamentOptions"];
  readonly selectedIndex: number;
  readonly cargoRatio: number;
  readonly isOverCargo: boolean;
  readonly riskLevel: number;
  readonly currentCargoCount: number;
  readonly onChange: (index: number) => void;
}
function ArmamentConfig({
  options,
  selectedIndex,
  cargoRatio,
  isOverCargo,
  riskLevel,
  currentCargoCount,
  onChange,
}: ArmamentConfigProps) {
  return (
    <div className="rounded-lg border border-ocean-600 bg-ocean-800/80 p-4">
      <h3 className="text-sm font-semibold text-gold-400 mb-3">出航配置</h3>
      <div className="space-y-2">
        {options.map((opt) => (
          <label
            key={opt.level}
            className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
              selectedIndex === opt.level
                ? "border-gold-500 bg-gold-500/10"
                : "border-ocean-600 hover:border-ocean-500"
            }`}
          >
            <input
              type="radio"
              name="armamentLevel"
              value={opt.level}
              checked={selectedIndex === opt.level}
              onChange={() => onChange(opt.level)}
              className="mt-0.5 accent-gold-500"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-parchment">
                  {opt.label}
                </span>
                <span className="text-xs text-gold-400">
                  生存率 {opt.survivalRate}%
                </span>
              </div>
              <div className="mt-1 flex gap-3 text-xs text-parchment-dark">
                <span>舱容 {opt.effectiveCapacity}</span>
                <span>{Math.round(cargoRatio * 100)}%</span>
                <span>防御 {opt.defenseMultiplier.toFixed(1)}x</span>
              </div>
            </div>
          </label>
        ))}
      </div>

      {/* 风险提示 */}
      {riskLevel < 1.5 && currentCargoCount > 0 && (
        <div className="mt-3 rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-400">
          ⚠ 当前配置防御较低，高价值货物面临较高风险
        </div>
      )}
      {isOverCargo && (
        <div className="mt-2 rounded border border-yellow-500/40 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-400">
          ⚠ 当前货物量超出该配置有效舱容，建议换装满载
        </div>
      )}
    </div>
  );
}

interface DepartureConfirmModalProps {
  readonly dest: {
    portId: string;
    portName: string;
    travelDays: number;
    estimatedProfit: number;
  };
  readonly armamentLabel: string;
  readonly survivalRate: number;
  readonly isTravelPending: boolean;
  readonly onConfirm: () => void;
  readonly onClose: () => void;
}

function DepartureConfirmModal({
  dest,
  armamentLabel,
  survivalRate,
  isTravelPending,
  onConfirm,
  onClose,
}: DepartureConfirmModalProps) {
  return (
    <Modal title="出航确认" onClose={onClose}>
      <div className="space-y-2 text-sm text-parchment-dark">
        <div className="flex justify-between">
          <span>目的港</span>
          <span className="font-medium text-parchment">{dest.portName}</span>
        </div>
        <div className="flex justify-between">
          <span>航行天数</span>
          <span className="text-gold-400">{dest.travelDays} 天</span>
        </div>
        <div className="flex justify-between">
          <span>出航配置</span>
          <span className="text-parchment">{armamentLabel}</span>
        </div>
        <div className="flex justify-between">
          <span>生存率</span>
          <span className="text-green-400">{survivalRate}%</span>
        </div>
        {dest.estimatedProfit !== 0 && (
          <div className="flex justify-between">
            <span>预估利润</span>
            <span
              className={
                dest.estimatedProfit > 0 ? "text-gold-400" : "text-red-400"
              }
            >
              {dest.estimatedProfit > 0
                ? `+${dest.estimatedProfit.toLocaleString()}`
                : dest.estimatedProfit.toLocaleString()}
            </span>
          </div>
        )}
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={onConfirm}
          disabled={isTravelPending}
          className="flex-1 rounded bg-gold-500 py-2 text-sm font-bold text-ocean-900 hover:bg-gold-400 transition-colors disabled:opacity-50"
        >
          {isTravelPending ? "出航中..." : "确认出航"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded bg-ocean-700 px-4 py-2 text-sm hover:bg-ocean-600 transition-colors"
        >
          取消
        </button>
      </div>
    </Modal>
  );
}
