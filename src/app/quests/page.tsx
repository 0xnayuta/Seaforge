export const dynamic = "force-dynamic";

import Link from "next/link";
import { QuestBoardClient } from "../../components/QuestBoardClient";
import { ITEMS } from "../../data/items";
import { QUESTS } from "../../data/quests";
import { buildQuestBoardView } from "../../game/view-builder/buildGameView";
import { prisma } from "../../lib/prisma";
import { loadWorld } from "../../lib/repository";

export interface RewardInfo {
  readonly gold: number;
  readonly exp: number;
  readonly itemNames: readonly string[];
}

function buildRewardInfo(): Record<string, RewardInfo> {
  const info: Record<string, RewardInfo> = {};
  for (const config of QUESTS) {
    info[config.id] = {
      gold: config.rewards.gold,
      exp: config.rewards.exp,
      itemNames: (config.rewards.itemIds ?? []).map(
        (id) => ITEMS.find((i) => i.id === id)?.name ?? id,
      ),
    };
  }
  return info;
}

export default async function QuestBoardPage() {
  const world = await loadWorld(prisma);
  const board = buildQuestBoardView(world);
  const rewardInfo = buildRewardInfo();

  return (
    <div className="flex-1 p-4 max-w-2xl mx-auto w-full space-y-6">
      <h1 className="text-2xl font-bold text-gold-500">任务板</h1>
      <p className="text-sm text-parchment-dark/60">
        {board.portName} — 委托看板
      </p>

      <QuestBoardClient board={board} rewardInfo={rewardInfo} />

      <div className="pt-4">
        <Link href="/" className="text-gold-500 hover:text-gold-400 underline">
          返回港口
        </Link>
      </div>
    </div>
  );
}
