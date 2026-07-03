import { ITEM_QUALITY_LABELS, ITEMS, type ItemConfig } from "../../data/items";
import type { CharacterView } from "../../types/game-view";
import { calcPanelStats } from "../domain/player";
import type { World } from "../domain/types";

const ITEM_TYPE_LABELS = {
  weapon: "武器",
  armor: "铠甲",
  accessory: "饰品",
  consumable: "消耗品",
  material: "材料",
} as const;

const BONUS_FIELDS: [keyof ItemConfig["effect"], string][] = [
  ["hpBonus", "生命值 +"],
  ["atkBonus", "攻击力 +"],
  ["defBonus", "防御力 +"],
  ["magBonus", "魔力 +"],
  ["mdfBonus", "魔防 +"],
  ["spdBonus", "速度 +"],
  ["lukBonus", "幸运 +"],
  ["equipLoadBonus", "负重 +"],
];

const SCALING_FIELDS: [keyof NonNullable<ItemConfig["scaling"]>, string][] = [
  ["str", "力"],
  ["dex", "敏"],
  ["int", "智"],
  ["fth", "信"],
  ["arc", "感"],
];

function getItemEffectDescription(config: ItemConfig): string {
  const parts: string[] = [];
  for (const [key, label] of BONUS_FIELDS) {
    const val = config.effect[key];
    if (val) parts.push(`${label}${val}`);
  }
  const scaling = config.scaling;
  if (scaling) {
    const labels = SCALING_FIELDS.filter(([k]) => scaling[k]).map(
      ([k, label]) => `${label}[${ITEM_QUALITY_LABELS[scaling[k]!]}]`,
    );
    if (labels.length > 0) parts.push(`补正: ${labels.join(" ")}`);
  }
  return parts.join(", ") || "无额外效果";
}

export function buildCharacterView(world: World): CharacterView {
  const player = world.player;
  const panel = calcPanelStats(player, world.fleet.inventory);

  const getEquippedView = (uid: string | null) => {
    if (!uid) return null;
    const instance = world.fleet.inventory.find((item) => item.uid === uid);
    if (!instance) return null;
    const config = ITEMS.find((cfg) => cfg.id === instance.itemId);
    if (!config) return null;
    return {
      uid: instance.uid,
      itemId: instance.itemId,
      name: config.name,
      typeLabel: ITEM_TYPE_LABELS[config.type] ?? "未知",
      qualityLabel: ITEM_QUALITY_LABELS[config.quality] ?? "普通",
      effectDescription: getItemEffectDescription(config),
      description: config.description ?? "",
    };
  };

  const inventory = (world.fleet.inventory || []).map((item) => {
    const config = ITEMS.find((cfg) => cfg.id === item.itemId);
    return {
      uid: item.uid,
      itemId: item.itemId,
      type: config?.type ?? "material",
      name: config?.name ?? "未知物品",
      typeLabel: config ? ITEM_TYPE_LABELS[config.type] : "未知",
      qualityLabel: config ? ITEM_QUALITY_LABELS[config.quality] : "普通",
      quantity: item.quantity,
      durability: item.durability,
      maxDurability: item.maxDurability,
      upgradeLevel: item.upgradeLevel,
      equippedSlot: item.equippedSlot,
      effectDescription: config ? getItemEffectDescription(config) : "",
      description: config?.description ?? "",
    };
  });

  return {
    name: player.name,
    level: player.level,
    exp: player.exp,
    expToNext: player.expToNext,
    gold: world.fleet.gold,
    attributePoints: player.attributePoints,
    attributes: {
      str: player.str,
      dex: player.dex,
      int: player.int,
      fth: player.fth,
      arc: player.arc,
    },
    panelStats: {
      hp: panel.hp,
      atk: panel.atk,
      def: panel.def,
      mag: panel.mag,
      mdf: panel.mdf,
      spd: panel.spd,
      luk: panel.luk,
      equipLoad: panel.equipLoad,
    },
    equipment: {
      weapon: getEquippedView(player.equipment.weapon),
      armor: getEquippedView(player.equipment.armor),
      accessory1: getEquippedView(player.equipment.accessory1),
      accessory2: getEquippedView(player.equipment.accessory2),
    },
    inventory,
    blockedByVoyage: !!world.voyage,
  };
}
