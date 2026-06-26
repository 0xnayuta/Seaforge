export const dynamic = "force-dynamic";

import { VoyageScreen } from "../../components/VoyageScreen";
import { buildVoyageView } from "../../game/view-builder/buildGameView";
import { prisma } from "../../lib/prisma";
import { loadWorld } from "../../lib/repository";
import { completeVoyage } from "./actions";

export default async function VoyagePage() {
  const world = await loadWorld(prisma);

  if (!world.voyage) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 space-y-4">
        <div className="rounded-lg border border-ocean-600 bg-ocean-800/80 p-6 text-center max-w-md">
          <h2 className="text-lg font-bold text-gold-400">没有进行中的航行</h2>
          <p className="mt-2 text-sm text-parchment-dark">
            请先通过航海图选择目的港
          </p>
        </div>
        <a
          href="/navigation"
          className="rounded-lg bg-gold-500 px-6 py-3 font-bold text-ocean-900 hover:bg-gold-400 transition-colors"
        >
          前往航海图
        </a>
      </div>
    );
  }

  const view = buildVoyageView(world);

  return (
    <div className="flex-1 p-4 max-w-2xl mx-auto w-full space-y-4">
      <VoyageScreen view={view} />

      <div className="text-center">
        <form action={completeVoyage}>
          <button
            type="submit"
            className="rounded-lg bg-gold-500 px-8 py-3 text-lg font-bold text-ocean-900 hover:bg-gold-400 transition-colors"
          >
            抵达
          </button>
        </form>
      </div>
    </div>
  );
}
