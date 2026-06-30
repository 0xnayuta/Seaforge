"use client";

import { useState, useTransition } from "react";
import type { TavernView } from "../types/game-view";
import { QuantityInput } from "./ui/QuantityInput";

interface TavernPanelProps {
  readonly view: TavernView;
  readonly onHireCrew: (formData: FormData) => Promise<TavernView>;
  readonly onFireCrew: (formData: FormData) => Promise<TavernView>;
}

export function TavernPanel({
  view,
  onHireCrew,
  onFireCrew,
}: TavernPanelProps) {
  const [displayView, setDisplayView] = useState(view);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // 数量状态
  const [hireQty, setHireQty] = useState(1);
  const [fireQty, setFireQty] = useState(1);

  const blockedByVoyage = displayView.blockedByVoyage;

  const handleAction = (
    action: (formData: FormData) => Promise<TavernView>,
    quantity: number,
    successMessage: string,
    resetQty: (v: number) => void,
  ) => {
    return (e: React.FormEvent) => {
      e.preventDefault();
      if (blockedByVoyage) return;

      setError(null);
      setMessage(null);

      startTransition(async () => {
        try {
          const fd = new FormData();
          fd.set("quantity", String(quantity));
          const nextView = await action(fd);
          setDisplayView(nextView);
          setMessage(successMessage);
          resetQty(1);
        } catch (err) {
          setError(err instanceof Error ? err.message : "操作失败");
        }
      });
    };
  };

  const handleHireAll = (e: React.MouseEvent) => {
    e.preventDefault();
    if (displayView.maxHireable <= 0 || blockedByVoyage) return;

    setError(null);
    setMessage(null);

    const qtyToHire = displayView.maxHireable;

    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("quantity", String(qtyToHire));
        const nextView = await onHireCrew(fd);
        setDisplayView(nextView);
        setMessage(`成功招满，共招募 ${qtyToHire} 名船员`);
        setHireQty(1);
      } catch (err) {
        setError(err instanceof Error ? err.message : "操作失败");
      }
    });
  };

  const handleFireSurplus = (e: React.MouseEvent) => {
    e.preventDefault();
    const surplus = displayView.crew - displayView.minCrew;
    if (surplus <= 0 || blockedByVoyage) return;

    setError(null);
    setMessage(null);

    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("quantity", String(surplus));
        const nextView = await onFireCrew(fd);
        setDisplayView(nextView);
        setMessage(`成功解雇所有多余船员，共裁撤 ${surplus} 人`);
        setFireQty(1);
      } catch (err) {
        setError(err instanceof Error ? err.message : "操作失败");
      }
    });
  };

  return (
    <div className="flex-1 p-4 max-w-2xl mx-auto w-full space-y-4">
      {/* 标题 */}
      <div className="flex items-center justify-between rounded-lg border border-ocean-600 bg-ocean-800/80 px-4 py-2 text-sm">
        <span className="font-bold text-gold-400">
          {displayView.portName} - 航海家酒馆
        </span>
      </div>

      {/* 提示信息 */}
      {error && (
        <div className="rounded-lg border border-red-500 bg-red-500/10 p-3 text-sm text-red-400 text-center">
          {error}
        </div>
      )}
      {message && (
        <div className="rounded bg-ocean-700/80 px-3 py-2 text-sm text-gold-400 border border-gold-600/50 text-center">
          {message}
        </div>
      )}

      {/* 状态面板 */}
      <div className="grid grid-cols-2 gap-4">
        {/* 舰队船员状态 */}
        <div className="rounded-lg border border-ocean-600 bg-ocean-800/80 p-4 space-y-2">
          <h3 className="text-sm font-semibold text-gold-400">船员状态</h3>
          <div className="flex justify-between text-xs text-parchment-dark">
            <span>当前船员</span>
            <span
              className={
                displayView.crew < displayView.minCrew
                  ? "text-red-400 font-bold"
                  : "text-parchment"
              }
            >
              {displayView.crew} / {displayView.maxCrew} 人
            </span>
          </div>
          <div className="flex justify-between text-xs text-parchment-dark">
            <span>最低航行要求</span>
            <span className="text-parchment">{displayView.minCrew} 人</span>
          </div>
          {displayView.crew < displayView.minCrew && (
            <p className="text-[11px] text-red-400 font-medium">
              ⚠ 船员不足以操作舰队所有船只，出航将被限制
            </p>
          )}
        </div>

        {/* 招募费率面板 */}
        <div className="rounded-lg border border-ocean-600 bg-ocean-800/80 p-4 space-y-2">
          <h3 className="text-sm font-semibold text-gold-400">招募费率</h3>
          <div className="flex justify-between text-xs text-parchment-dark">
            <span>当前持有金币</span>
            <span className="text-gold-400 font-semibold">
              {displayView.gold.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between text-xs text-parchment-dark">
            <span>下名船员招募费用</span>
            <span className="text-parchment">{displayView.hireCost} 金币</span>
          </div>
        </div>
      </div>

      {/* 招募与解雇操作区 */}
      {!blockedByVoyage ? (
        <div className="grid grid-cols-2 gap-4">
          {/* 招募船员 */}
          <div className="rounded-lg border border-ocean-600 bg-ocean-800/80 p-4 space-y-4 flex flex-col justify-between">
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gold-400">
                招募新船员
              </h3>
              <p className="text-xs text-parchment-dark">
                招募费用随舰队人数增加而递增。最多可招募{" "}
                <span className="text-gold-400 font-medium">
                  {displayView.maxHireable}
                </span>{" "}
                人。
              </p>
            </div>

            {displayView.maxHireable > 0 ? (
              <form
                onSubmit={handleAction(
                  onHireCrew,
                  hireQty,
                  `成功招募 ${hireQty} 名船员`,
                  setHireQty,
                )}
                className="space-y-3"
              >
                <QuantityInput
                  value={hireQty}
                  min={1}
                  max={displayView.maxHireable}
                  onChange={setHireQty}
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="flex-1 rounded bg-gold-500 py-1.5 text-xs font-bold text-ocean-900 hover:bg-gold-400 transition-colors disabled:opacity-50"
                  >
                    招募
                  </button>
                  <button
                    type="button"
                    onClick={handleHireAll}
                    disabled={isPending}
                    className="rounded border border-ocean-600 px-3 py-1.5 text-xs text-parchment-dark hover:border-gold-500 hover:text-gold-400 transition-colors disabled:opacity-50"
                  >
                    一键招满
                  </button>
                </div>
              </form>
            ) : (
              <div className="rounded border border-ocean-700 bg-ocean-900/50 p-3 text-center text-xs text-parchment-dark">
                {displayView.crew >= displayView.maxCrew
                  ? "已达到舰队最大船员上限"
                  : "金币不足，无法招募新船员"}
              </div>
            )}
          </div>

          {/* 解雇船员 */}
          <div className="rounded-lg border border-ocean-600 bg-ocean-800/80 p-4 space-y-4 flex flex-col justify-between">
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gold-400">解雇船员</h3>
              <p className="text-xs text-parchment-dark">
                解雇不产生费用，但船员不足会导致舰队无法出航。
              </p>
            </div>

            {displayView.crew > 0 ? (
              <form
                onSubmit={handleAction(
                  onFireCrew,
                  fireQty,
                  `成功解雇 ${fireQty} 名船员`,
                  setFireQty,
                )}
                className="space-y-3"
              >
                <QuantityInput
                  value={fireQty}
                  min={1}
                  max={displayView.crew}
                  onChange={setFireQty}
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="flex-1 rounded border border-red-500/40 bg-red-500/10 py-1.5 text-xs font-bold text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                  >
                    解雇
                  </button>
                  <button
                    type="button"
                    onClick={handleFireSurplus}
                    disabled={
                      isPending || displayView.crew <= displayView.minCrew
                    }
                    className="rounded border border-ocean-600 px-3 py-1.5 text-xs text-parchment-dark hover:border-gold-500 hover:text-gold-400 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                  >
                    裁撤多余
                  </button>
                </div>
              </form>
            ) : (
              <div className="rounded border border-ocean-700 bg-ocean-900/50 p-3 text-center text-xs text-parchment-dark">
                当前舰队无船员可解雇
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4 text-center text-sm text-red-400">
          航行中无法进行招募与解雇操作
        </div>
      )}

      {/* 船只配属关系清单 */}
      <div className="rounded-lg border border-ocean-600 bg-ocean-800/80 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gold-400">
          各船只最低配属标准
        </h3>
        <div className="overflow-hidden border border-ocean-600/50 rounded">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-ocean-700/50 text-parchment-dark border-b border-ocean-600">
                <th className="px-3 py-2 font-semibold">船只名称</th>
                <th className="px-3 py-2 font-semibold">船只型号</th>
                <th className="px-3 py-2 font-semibold text-right">
                  最低配置船员
                </th>
              </tr>
            </thead>
            <tbody>
              {displayView.ships.map((s) => (
                <tr
                  key={s.id}
                  className="border-b border-ocean-700/40 last:border-0 hover:bg-ocean-700/20"
                >
                  <td className="px-3 py-2 text-parchment font-medium">
                    {s.name}
                  </td>
                  <td className="px-3 py-2 text-parchment-dark">
                    {s.typeName}
                  </td>
                  <td className="px-3 py-2 text-right text-gold-400 font-semibold">
                    {s.baseCrew} 人
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 返回按钮 */}
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
