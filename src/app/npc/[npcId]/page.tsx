export const dynamic = "force-dynamic";

import { NpcInteractionPanel } from "../../../components/NpcInteractionPanel";
import { buildNpcDetailView } from "../../../game/view-builder/buildGameView";
import { prisma } from "../../../lib/prisma";
import { loadWorld } from "../../../lib/repository";

export default async function NpcDetailPage({
  params,
}: {
  params: Promise<{ npcId: string }>;
}) {
  const { npcId } = await params;
  const world = await loadWorld(prisma);
  const view = buildNpcDetailView(world, npcId);

  if (!view) {
    return (
      <div className="flex-1 p-4 max-w-2xl mx-auto w-full">
        <div className="rounded-lg border border-ocean-600 bg-ocean-800/80 p-8 text-center">
          <p className="text-parchment-dark mb-4">NPC 未找到</p>
          <a
            href="/npc"
            className="text-gold-400 hover:text-gold-300 underline"
          >
            返回 NPC 列表
          </a>
        </div>
      </div>
    );
  }

  return <NpcInteractionPanel view={view} npcId={npcId} />;
}
