import { ITEM_QUALITY_LABELS, ITEMS } from "../../data/items";
import { NPCS } from "../../data/npcs";
import type { NpcDetailView, QuestSummaryView } from "../../types/game-view";
import { getAvailableQuests } from "../domain/quest";
import type { World } from "../domain/types";

const ITEM_TYPE_LABELS = {
  weapon: "武器",
  armor: "铠甲",
  accessory: "饰品",
  consumable: "消耗品",
  material: "材料",
} as const;

export function npcTypeLabel(type: string): string {
  switch (type) {
    case "captain":
      return "船长";
    case "merchant":
      return "商人";
    case "questGiver":
      return "任务发布人";
    case "blacksmith":
      return "铁匠";
    default:
      return type;
  }
}

export function buildNpcDetailView(
  world: World,
  npcId: string,
): NpcDetailView | null {
  const npc = NPCS.find((n) => n.id === npcId);
  if (!npc) return null;
  const rel = world.npcRelations[npcId] ?? {
    affinity: 0,
    recruited: false,
    dialogPhase: 0,
    completedQuests: [] as readonly string[],
  };

  const availableQuests = getAvailableQuests(world)
    .filter((q) => q.issuerNpcId === npcId)
    .map(
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
  const cond = npc.recruitCondition;
  const canRecruit =
    npc.recruitable &&
    !rel.recruited &&
    npc.portId === world.player.currentPortId &&
    rel.affinity >= (cond?.minAffinity ?? Infinity) &&
    world.fleet.gold >= (cond?.goldCost ?? Infinity) &&
    (cond?.requiredQuestIds ?? []).every((qId) =>
      rel.completedQuests.includes(qId),
    );

  return {
    id: npc.id,
    name: npc.name,
    type: npc.type,
    typeLabel: npcTypeLabel(npc.type),
    dialogText: npc.dialogText,
    dialogPhase: rel.dialogPhase,
    affinity: rel.affinity,
    maxAffinity: 100,
    recruited: rel.recruited,
    canRecruit,
    recruitable: npc.recruitable,
    recruitCondition: npc.recruitCondition
      ? {
          minAffinity: npc.recruitCondition.minAffinity,
          goldCost: npc.recruitCondition.goldCost,
          requiredQuestIds: npc.recruitCondition.requiredQuestIds ?? [],
        }
      : null,
    availableQuests,
    completedQuests: rel.completedQuests,
    giftPreferences: npc.giftPreferences.map((g) => ({
      itemId: g.itemId,
      affinityGain: g.affinityGain,
    })),
    inventory: world.fleet.inventory.map((item) => {
      const config = ITEMS.find((i) => i.id === item.itemId);
      return {
        uid: item.uid,
        itemId: item.itemId,
        type: config?.type ?? "material",
        name: config?.name ?? item.itemId,
        typeLabel: config ? ITEM_TYPE_LABELS[config.type] : "",
        qualityLabel: config ? ITEM_QUALITY_LABELS[config.quality] : "",
        quantity: item.quantity,
        durability: item.durability,
        maxDurability: item.maxDurability,
        upgradeLevel: item.upgradeLevel,
        equippedSlot: item.equippedSlot ?? undefined,
        effectDescription: config?.description ?? "",
        description: config?.description ?? "",
      };
    }),
  };
}
