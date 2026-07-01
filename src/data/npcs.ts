// ============================================================
// NPC 配置 — 5 位港口角色
// ============================================================

import type { CombatParticipant } from "../game/domain/types";

export interface GiftEntry {
  readonly itemId: string;
  readonly affinityGain: number;
}

export interface RecruitCondition {
  readonly minAffinity: number;
  readonly goldCost: number;
  readonly requiredQuestIds?: readonly string[];
}

export interface NpcConfig {
  readonly id: string;
  readonly name: string;
  readonly portId: string;
  readonly type: "captain" | "merchant" | "questGiver" | "blacksmith";
  readonly dialogText: string;
  readonly questIds: readonly string[];
  readonly giftPreferences: readonly GiftEntry[];
  readonly recruitable: boolean;
  readonly recruitCondition: RecruitCondition | null;
  readonly stats: Omit<
    CombatParticipant,
    "id" | "name" | "type" | "statuses" | "isDodging" | "isParrying"
  > | null;
}

export const NPCS: readonly NpcConfig[] = [
  // ── 泉州：李华（可招募船长） ──
  {
    id: "li_hua",
    name: "李华",
    portId: "quanzhou",
    type: "captain",
    dialogText:
      "兄弟，海上风浪大，多个帮手总没坏处。我李华在泉州港跑了十年船，哪片海有暗礁、哪片海有海盗，闭着眼都能数出来。",
    questIds: ["safe_passage", "family_heirloom"],
    giftPreferences: [
      { itemId: "ring_of_vigor", affinityGain: 15 },
      { itemId: "ring_of_strength", affinityGain: 10 },
    ],
    recruitable: true,
    recruitCondition: { minAffinity: 40, goldCost: 2000 },
    stats: {
      hp: 80,
      maxHp: 80,
      mp: 15,
      maxMp: 15,
      atk: 12,
      def: 8,
      mag: 2,
      mdf: 5,
      spd: 10,
      luk: 6,
      level: 3,
      weaponId: "rusted_sword",
    },
  },

  // ── 威尼斯：Marco Bianchi（可招募船长） ──
  {
    id: "marco",
    name: "Marco Bianchi",
    portId: "venice",
    type: "captain",
    dialogText:
      "Buongiorno! 我是马可·比安奇，威尼斯商会的航海长。地中海的风浪我见过太多，但东方的财富才是真正的诱惑。",
    questIds: ["venetian_trade", "lost_cargo"],
    giftPreferences: [
      { itemId: "silver_rapier", affinityGain: 15 },
      { itemId: "brass_ring", affinityGain: 12 },
    ],
    recruitable: true,
    recruitCondition: {
      minAffinity: 50,
      goldCost: 3000,
      requiredQuestIds: ["venetian_trade"],
    },
    stats: {
      hp: 70,
      maxHp: 70,
      mp: 25,
      maxMp: 25,
      atk: 8,
      def: 6,
      mag: 10,
      mdf: 8,
      spd: 9,
      luk: 7,
      level: 4,
      weaponId: "silver_rapier",
    },
  },

  // ── 亚历山大：Fatima Al-Mansur（任务发放人） ──
  {
    id: "fatima",
    name: "Fatima Al-Mansur",
    portId: "alexandria",
    type: "questGiver",
    dialogText:
      "年轻的船长，亚历山大港的风带来远方的消息。若你愿意为这座城市效力，我这里有几桩差事正合你手。",
    questIds: ["alexandria_supplies"],
    giftPreferences: [
      { itemId: "robe_of_wisdom", affinityGain: 10 },
      { itemId: "ring_of_vigor", affinityGain: 8 },
    ],
    recruitable: false,
    recruitCondition: null,
    stats: null,
  },

  // ── 伦敦：Captain Henry（可招募船长） ──
  {
    id: "henry",
    name: "Captain Henry",
    portId: "london",
    type: "captain",
    dialogText:
      "Ahoy! 我是亨利船长，皇家海军退役。北海的每一片浪花我都熟悉。跟着我，你的船队绝不会迷航。",
    questIds: [],
    giftPreferences: [
      { itemId: "brass_ring", affinityGain: 12 },
      { itemId: "amulet_of_fortune", affinityGain: 10 },
    ],
    recruitable: true,
    recruitCondition: { minAffinity: 30, goldCost: 2500 },
    stats: {
      hp: 100,
      maxHp: 100,
      mp: 10,
      maxMp: 10,
      atk: 14,
      def: 12,
      mag: 1,
      mdf: 6,
      spd: 7,
      luk: 5,
      level: 5,
      weaponId: "iron_sword",
    },
  },

  // ── 蒙巴萨：Zuri（商人） ──
  {
    id: "zuri",
    name: "Zuri",
    portId: "mombasa",
    type: "merchant",
    dialogText:
      "欢迎来到蒙巴萨，旅行者。我的货物来自非洲大陆的每一个角落——象牙、黄金，还有……一些不那么合法的东西。",
    questIds: ["ivory_trade"],
    giftPreferences: [
      { itemId: "robe_of_wisdom", affinityGain: 12 },
      { itemId: "leather_armor", affinityGain: 10 },
    ],
    recruitable: false,
    recruitCondition: null,
    stats: null,
  },
] as const;
