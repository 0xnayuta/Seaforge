import { buildAchievementsView } from "../../game/view-builder/buildGameView";
import { prisma } from "../../lib/prisma";
import { loadWorld } from "../../lib/repository";

export const dynamic = "force-dynamic";

export default async function AchievementsPage() {
  const world = await loadWorld(prisma);
  const view = buildAchievementsView(world);

  return (
    <div className="flex-1 p-4 max-w-2xl mx-auto w-full space-y-4">
      <h1 className="text-xl font-semibold text-gold-400">成就</h1>
      <p className="text-sm text-parchment-dark">
        已领取 {view.totalClaimed} / {view.totalCount}
      </p>
      <div className="space-y-2">
        {view.achievements.map((a) => (
          <div
            key={a.id}
            className={`rounded-lg border p-3 ${
              a.claimed
                ? "border-green-600 bg-green-900/30"
                : a.unlocked
                  ? "border-gold-600 bg-ocean-700/60"
                  : "border-ocean-600 bg-ocean-800/40 text-parchment-dark/50"
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-sm">{a.name}</h3>
                <p className="text-xs mt-0.5">{a.description}</p>
              </div>
              <span className="text-xs whitespace-nowrap ml-2">
                {a.progress}/{a.target}
              </span>
            </div>
            {a.unlocked && !a.claimed && a.reward && (
              <div className="mt-1 text-xs text-gold-400">
                奖励：{a.reward.gold ? `💰 ${a.reward.gold}` : ""}
                {a.reward.exp ? ` ✨ ${a.reward.exp} 经验` : ""}
              </div>
            )}
            {a.unlocked && !a.claimed && (
              <form action={undefined} className="mt-2">
                <button
                  type="submit"
                  className="rounded bg-gold-600 px-2 py-0.5 text-xs text-white hover:bg-gold-500 transition-colors"
                >
                  领取奖励
                </button>
              </form>
            )}
            {a.claimed && (
              <span className="mt-1 block text-xs text-green-400">已领取</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
