"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { selectTitleAction } from "../app/actions/titles";
import type { TitlesView } from "../types/game-view";

interface TitlesPanelProps {
  readonly view: TitlesView;
}

export function TitlesPanel({ view }: TitlesPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleSelect = (titleId: string | null) => {
    startTransition(async () => {
      const fd = new FormData();
      if (titleId) fd.set("titleId", titleId);
      await selectTitleAction(fd);
      router.refresh();
    });
  };

  return (
    <div className="flex-1 p-4 max-w-3xl mx-auto w-full space-y-4">
      <h1 className="text-xl font-semibold text-gold-400">称号</h1>
      <p className="text-sm text-parchment-dark">
        完成特定成就解锁称号，每个称号提供不同的属性加成。当前最多同时生效一个称号。
      </p>

      <div className="grid gap-3">
        {view.titles.map((title) => {
          const isSelected = view.selectedTitleId === title.id;
          return (
            <div
              key={title.id}
              className={`rounded-lg border p-4 transition-colors ${
                title.unlocked
                  ? isSelected
                    ? "border-gold-500 bg-ocean-700/90"
                    : "border-ocean-600 bg-ocean-800/80 hover:border-ocean-500"
                  : "border-ocean-700 bg-ocean-800/40 opacity-60"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className={`font-semibold ${
                      title.unlocked
                        ? "text-gold-400"
                        : "text-parchment-dark/50"
                    }`}
                  >
                    {title.name}
                  </span>
                  {!title.unlocked && (
                    <span className="text-xs text-parchment-dark/40">
                      未解锁
                    </span>
                  )}
                  {isSelected && (
                    <span className="text-xs text-gold-400">已装备</span>
                  )}
                </div>
                {title.unlocked && !isSelected && (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleSelect(title.id)}
                    className="rounded border border-ocean-500 px-3 py-1 text-xs text-parchment-dark hover:bg-ocean-700 transition-colors disabled:opacity-50"
                  >
                    装备
                  </button>
                )}
                {isSelected && (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleSelect(null)}
                    className="rounded border border-ocean-500 px-3 py-1 text-xs text-parchment-dark hover:bg-ocean-700 transition-colors disabled:opacity-50"
                  >
                    卸下
                  </button>
                )}
              </div>

              <p className="mt-1 text-xs text-parchment-dark/70">
                {title.description}
              </p>

              {title.effects.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {title.effects.map((effect) => (
                    <span
                      key={`${title.id}-${effect}`}
                      className="rounded bg-ocean-700/60 px-1.5 py-0.5 text-xs text-green-400"
                    >
                      {effect}
                    </span>
                  ))}
                </div>
              )}

              {!title.unlocked &&
                title.progress !== undefined &&
                title.target !== undefined && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ocean-700">
                      <div
                        className="h-full rounded-full bg-gold-500/60"
                        style={{
                          width: `${Math.min(100, (title.progress / title.target) * 100)}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs text-parchment-dark/50">
                      {title.progress.toLocaleString()} /{" "}
                      {title.target.toLocaleString()}
                    </span>
                  </div>
                )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
