"use client";

import { useState, useTransition } from "react";
import { craftEquipmentAction } from "../app/actions/crafting";
import { ITEM_QUALITY_LABELS } from "../data/items";
import type { CraftingView } from "../types/game-view";

interface CraftingPanelProps {
  readonly view: CraftingView;
}

export function CraftingPanel({ view }: CraftingPanelProps) {
  const [displayView, setDisplayView] = useState(view);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [craftingId, setCraftingId] = useState<string | null>(null);

  const handleCraft = (recipeId: string) => {
    setError(null);
    setCraftingId(recipeId);
    startTransition(async () => {
      try {
        const nextView = await craftEquipmentAction(recipeId);
        setDisplayView(nextView);
      } catch (e) {
        setError(e instanceof Error ? e.message : "合成失败");
      } finally {
        setCraftingId(null);
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

      <h3 className="text-sm font-semibold text-gold-400">
        铁匠铺 — {displayView.portName}
      </h3>
      <p className="text-xs text-parchment-dark">
        金币：{displayView.fleetGold.toLocaleString()}
      </p>

      {displayView.recipes.length === 0 ? (
        <div className="rounded-lg border border-ocean-600 bg-ocean-800/80 p-4 text-center">
          <p className="text-sm text-parchment-dark">
            当前港口没有可用的合成配方。
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {displayView.recipes.map((recipe) => (
            <div
              key={recipe.recipeId}
              className="rounded-lg border border-ocean-600 bg-ocean-800/80 p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-parchment">
                      {recipe.resultName}
                    </span>
                    <span className="rounded bg-ocean-700 px-1.5 py-0.5 text-[10px] text-parchment-dark">
                      {ITEM_QUALITY_LABELS[
                        recipe.resultQuality as keyof typeof ITEM_QUALITY_LABELS
                      ] ?? recipe.resultQuality}
                    </span>
                  </div>
                  {recipe.resultDescription && (
                    <p className="mt-1 text-xs text-parchment-dark">
                      {recipe.resultDescription}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  disabled={!recipe.canCraft || isPending}
                  onClick={() => handleCraft(recipe.recipeId)}
                  className="rounded bg-gold-500 px-4 py-2 text-sm font-bold text-ocean-900 hover:bg-gold-400 transition-colors disabled:opacity-50 shrink-0 ml-4"
                >
                  {craftingId === recipe.recipeId ? "合成中..." : "合成"}
                </button>
              </div>

              {/* 材料需求 */}
              <div className="mt-3 space-y-1">
                <p className="text-xs font-semibold text-parchment-dark">
                  材料需求：
                </p>
                {recipe.ingredients.map((ing) => (
                  <div
                    key={ing.itemId}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="text-parchment-dark">{ing.name}</span>
                    <span
                      className={
                        ing.sufficient ? "text-green-400" : "text-red-400"
                      }
                    >
                      {ing.owned} / {ing.required}
                    </span>
                  </div>
                ))}
              </div>

              {recipe.affinityRequirement && (
                <div className="mt-2 text-xs text-parchment-dark">
                  <span>好感度需求：{recipe.affinityRequirement.npcName} </span>
                  <span
                    className={
                      recipe.affinityRequirement.met
                        ? "text-green-400"
                        : "text-red-400"
                    }
                  >
                    {recipe.affinityRequirement.current} /{" "}
                    {recipe.affinityRequirement.required}
                  </span>
                </div>
              )}

              <div className="mt-2 text-xs text-parchment-dark">
                费用：{recipe.goldCost.toLocaleString()} 金币
              </div>

              {!recipe.canCraft && recipe.blockedReason && (
                <div className="mt-2 text-xs text-red-400">
                  {recipe.blockedReason}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
