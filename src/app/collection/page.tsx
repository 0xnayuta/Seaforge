import { buildCollectionView } from "../../game/view-builder/buildGameView";
import { prisma } from "../../lib/prisma";
import { loadWorld } from "../../lib/repository";

export const dynamic = "force-dynamic";

export default async function CollectionPage() {
  const world = await loadWorld(prisma);
  const view = buildCollectionView(world);

  return (
    <div className="flex-1 p-4 max-w-2xl mx-auto w-full space-y-4">
      <h1 className="text-xl font-semibold text-gold-400">图鉴</h1>
      <p className="text-sm text-parchment-dark">
        收集进度：{view.totalProgress} / {view.totalCount}
      </p>
      {view.categories.map((cat) => (
        <div
          key={cat.label}
          className="rounded-lg border border-ocean-600 bg-ocean-800/40 p-3"
        >
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-sm text-gold-400">{cat.label}</h2>
            <span className="text-xs text-parchment-dark">
              {cat.progress}/{cat.total}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {cat.items.map((item) => (
              <div
                key={item.id}
                className={`rounded px-2 py-1 text-xs ${
                  item.unlocked
                    ? "bg-ocean-700/60 text-parchment-light"
                    : "bg-ocean-800/60 text-parchment-dark/40"
                }`}
              >
                {item.unlocked ? (
                  <span>{item.name}</span>
                ) : (
                  <span className="italic">???</span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
