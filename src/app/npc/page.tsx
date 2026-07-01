export const dynamic = "force-dynamic";

import Link from "next/link";
import { buildHarborView } from "../../game/view-builder/buildGameView";
import { prisma } from "../../lib/prisma";
import { loadWorld } from "../../lib/repository";

export default async function NpcListPage() {
  const world = await loadWorld(prisma);
  const view = buildHarborView(world);
  const npcs = view.npcsAtPort;

  return (
    <div className="flex-1 p-4 max-w-2xl mx-auto w-full space-y-4">
      {/* Header with back link */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gold-400">
          {view.portName} - 人物
        </h1>
        <Link
          href="/"
          className="rounded bg-ocean-700 px-3 py-1.5 text-sm text-parchment-dark hover:bg-ocean-600 transition-colors"
        >
          返回港口
        </Link>
      </div>

      {/* NPC list or empty state */}
      {npcs.length === 0 ? (
        <div className="rounded-lg border border-ocean-600 bg-ocean-800/80 p-6 text-center">
          <p className="text-parchment-dark">当前港口没有人物</p>
        </div>
      ) : (
        <div className="space-y-3">
          {npcs.map((npc) => {
            const affinityColor =
              npc.affinity >= 60
                ? "bg-green-500"
                : npc.affinity >= 30
                  ? "bg-yellow-500"
                  : "bg-red-500";

            return (
              <Link
                key={npc.id}
                href={`/npc/${npc.id}`}
                className="block rounded-lg border border-ocean-600 bg-ocean-800/80 p-4 hover:bg-ocean-700/80 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gold-400">
                    {npc.name}
                  </h3>
                  <span className="rounded bg-ocean-700 px-2 py-0.5 text-xs text-parchment-dark">
                    {npc.typeLabel}
                  </span>
                </div>
                <p className="mt-1 text-xs text-parchment-dark">
                  {npc.portName}
                </p>

                {/* Affinity bar */}
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs text-parchment-dark">
                    <span>好感度</span>
                    <span>{npc.affinity}/100</span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-ocean-900">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${affinityColor}`}
                      style={{ width: `${Math.min(npc.affinity, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Recruit status */}
                <div className="mt-2 flex items-center gap-2">
                  {npc.recruited && (
                    <span className="rounded bg-green-900/50 px-2 py-0.5 text-xs text-green-400">
                      已招募
                    </span>
                  )}
                  {!npc.recruited && npc.recruitable && (
                    <span className="rounded bg-blue-900/50 px-2 py-0.5 text-xs text-blue-400">
                      可招募
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
