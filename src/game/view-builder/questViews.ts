import { NPCS } from "../../data/npcs";
import { PORTS } from "../../data/ports";
import { QUESTS } from "../../data/quests";
import type {
  QuestBoardView,
  QuestDetailView,
  QuestSummaryView,
} from "../../types/game-view";
import { getAvailableQuests } from "../domain/quest";
import type { World } from "../domain/types";

// ============================================================
// Quest Views
// ============================================================

export function buildQuestBoardView(world: World): QuestBoardView {
  const port = PORTS.find((p) => p.id === world.player.currentPortId);
  const availableQuests = getAvailableQuests(world).map(
    (q) =>
      ({
        id: q.id,
        name: q.name,
        description: q.description,
        type: q.type,
        progress: 0,
        target: 0,
        isActive: false,
        canAccept: true,
      }) satisfies QuestSummaryView,
  );
  const activeQuests = world.activeQuests.map((aq) => {
    const q = QUESTS.find((x) => x.id === aq.questId);
    return {
      id: aq.questId,
      name: q?.name ?? aq.questId,
      description: q?.description ?? "",
      type: q?.type ?? "delivery",
      progress: aq.progress,
      target: aq.target,
      isActive: true,
      canAccept: false,
    } satisfies QuestSummaryView;
  });
  return { portName: port?.name ?? "未知", availableQuests, activeQuests };
}

export function buildQuestDetailView(
  world: World,
  questId: string,
): QuestDetailView | null {
  const aq = world.activeQuests.find((a) => a.questId === questId);
  const q = QUESTS.find((x) => x.id === questId);
  if (!q) return null;
  const issuerNpc = NPCS.find((n) => n.id === q.issuerNpcId);
  const canComplete = aq ? aq.progress >= aq.target : false;
  return {
    id: q.id,
    name: q.name,
    description: q.description,
    type: q.type,
    progress: aq?.progress ?? 0,
    target: aq?.target ?? 0,
    isActive: !!aq,
    canComplete,
    rewards: {
      gold: q.rewards.gold,
      exp: q.rewards.exp,
      items: q.rewards.itemIds ?? [],
    },
    issuerNpcName: issuerNpc?.name ?? "未知",
  };
}
