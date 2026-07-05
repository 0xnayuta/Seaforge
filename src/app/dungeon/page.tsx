export const dynamic = "force-dynamic";

import { DungeonPanel } from "../../components/DungeonPanel";
import { DUNGEONS } from "../../data/dungeons";
import { PORTS } from "../../data/ports";
import { buildDungeonView } from "../../game/view-builder/buildGameView";
import { prisma } from "../../lib/prisma";
import { loadWorld } from "../../lib/repository";
import { enterDungeonAction } from "../actions/dungeon";

export default async function DungeonPage() {
  const world = await loadWorld(prisma);
  const view = buildDungeonView(world);

  // 有进行中的副本 → 显示副本面板
  if (view) {
    return (
      <div className="flex-1 p-4 max-w-2xl mx-auto w-full space-y-4">
        <DungeonPanel view={view} />
      </div>
    );
  }

  // 当前港口可用副本
  const port = PORTS.find((p) => p.id === world.player.currentPortId);
  const available = DUNGEONS.filter(
    (d) => d.entryPortId === world.player.currentPortId,
  );

  return (
    <div className="flex-1 p-4 max-w-2xl mx-auto w-full space-y-4">
      <div className="rounded-lg border border-ocean-600 bg-ocean-800/80 p-4">
        <h2 className="text-lg font-semibold text-gold-400">
          副本 — {port?.name ?? "未知"}
        </h2>
        {available.length === 0 ? (
          <p className="mt-2 text-sm text-parchment-dark">
            当前港口没有可探索的副本。
          </p>
        ) : (
          <div className="mt-3 grid gap-3">
            {available.map((d) => {
              const onCooldown =
                world.dungeonCooldowns?.[d.id] != null &&
                world.dungeonCooldowns[d.id] > world.player.day;
              const cooldownDays = onCooldown
                ? world.dungeonCooldowns[d.id] - world.player.day
                : 0;
              const meetsLevel = world.player.level >= d.levelRequirement;

              return (
                <div
                  key={d.id}
                  className="rounded-lg border border-ocean-600 bg-ocean-700/60 p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-parchment">{d.name}</h3>
                      <p className="mt-1 text-xs text-parchment-dark">
                        推荐等级：Lv.{d.levelRequirement}
                        {meetsLevel ? "" : " （等级不足）"}
                      </p>
                      <p className="text-xs text-parchment-dark">
                        层数：{d.floors.length}
                      </p>
                      {d.completionReward && (
                        <p className="text-xs text-parchment-dark">
                          通关奖励：
                          {d.completionReward.gold.toLocaleString() ?? 0} 金币
                          {d.completionReward.exp
                            ? `、${d.completionReward.exp} 经验`
                            : ""}
                        </p>
                      )}
                      {onCooldown && (
                        <p className="mt-1 text-xs text-red-400">
                          冷却中（剩余 {cooldownDays} 天）
                        </p>
                      )}
                    </div>
                    <form
                      action={async () => {
                        "use server";
                        await enterDungeonAction(d.id);
                      }}
                    >
                      <button
                        type="submit"
                        disabled={!meetsLevel || onCooldown}
                        className="rounded bg-gold-500 px-4 py-2 text-sm font-bold text-ocean-900 hover:bg-gold-400 transition-colors disabled:opacity-50"
                      >
                        进入
                      </button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div className="text-center">
        <a
          href="/"
          className="inline-block rounded-lg border border-ocean-600 px-4 py-2 text-sm text-parchment-dark hover:bg-ocean-700/60 transition-colors"
        >
          返回港口
        </a>
      </div>
    </div>
  );
}
