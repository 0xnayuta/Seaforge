// ============================================================
// 任务配置 — 6 个任务
// ============================================================

export type QuestType = "delivery" | "collect" | "bounty" | "explore";

export interface DeliveryRequirement {
  readonly type: "delivery";
  readonly fromPortId: string;
  readonly toPortId: string;
  readonly goodsId: string;
  readonly quantity: number;
}

export interface CollectRequirement {
  readonly type: "collect";
  readonly itemId: string;
  readonly quantity: number;
}

export interface BountyRequirement {
  readonly type: "bounty";
  readonly count: number; // 击败海盗次数
}

export interface ExploreRequirement {
  readonly type: "explore";
  readonly targetPortId: string;
}

export type QuestRequirement =
  | DeliveryRequirement
  | CollectRequirement
  | BountyRequirement
  | ExploreRequirement;

export interface QuestReward {
  readonly gold: number;
  readonly exp: number;
  readonly itemIds?: readonly string[]; // 奖励物品 ID
}

export interface QuestConfig {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly type: QuestType;
  readonly requirement: QuestRequirement;
  readonly rewards: QuestReward;
  readonly issuerPortId: string;
  readonly issuerNpcId: string;
  readonly prerequisiteQuestId?: string;
  readonly minLevel?: number;
  readonly minAffinity?: number;
}

export const QUESTS: readonly QuestConfig[] = [
  // ── 1. 安全通航（delivery）— 李华 ──
  {
    id: "safe_passage",
    name: "安全通航",
    description:
      "泉州有一批急需的丝绸要运往长崎。沿途海盗猖獗，但李华相信你能胜任。",
    type: "delivery",
    requirement: {
      type: "delivery",
      fromPortId: "quanzhou",
      toPortId: "nagasaki",
      goodsId: "silk",
      quantity: 10,
    },
    rewards: { gold: 800, exp: 60, itemIds: ["ring_of_vigor"] },
    issuerPortId: "quanzhou",
    issuerNpcId: "li_hua",
    minLevel: 2,
  },

  // ── 2. 家族遗物（collect）— 李华 ──
  {
    id: "family_heirloom",
    name: "家族遗物",
    description:
      "李华家传的一枚古玉戒指被海盗劫走。海盗船据说常在果阿附近出没，找回戒指必有重谢。",
    type: "collect",
    prerequisiteQuestId: "safe_passage",
    requirement: {
      type: "collect",
      itemId: "ring_of_strength", // 代表"古玉戒指"
      quantity: 1,
    },
    rewards: { gold: 1200, exp: 80, itemIds: ["iron_sword"] },
    issuerPortId: "quanzhou",
    issuerNpcId: "li_hua",
    minLevel: 3,
  },

  // ── 3. 威尼斯贸易线（delivery）— Marco ──
  {
    id: "venetian_trade",
    name: "威尼斯贸易线",
    description:
      "威尼斯商会希望在亚历山大建立稳定的香料贸易路线。将这批货物安全送达，商会会记住你的贡献。",
    type: "delivery",
    requirement: {
      type: "delivery",
      fromPortId: "venice",
      toPortId: "alexandria",
      goodsId: "glassware",
      quantity: 8,
    },
    rewards: { gold: 1500, exp: 100, itemIds: ["silver_rapier"] },
    issuerPortId: "venice",
    issuerNpcId: "marco",
    minLevel: 4,
    minAffinity: 20,
  },

  // ── 4. 失落的货物（bounty）— Marco ──
  {
    id: "lost_cargo",
    name: "失落的货物",
    description:
      "威尼斯商船在亚丁湾附近遭劫，货物被海盗瓜分。清剿沿途海盗，找回丢失的货物。",
    type: "bounty",
    requirement: {
      type: "bounty",
      count: 2, // 击败 2 次海盗遭遇
    },
    rewards: { gold: 2000, exp: 120, itemIds: ["chain_mail"] },
    issuerPortId: "venice",
    issuerNpcId: "marco",
    minLevel: 5,
    minAffinity: 30,
  },

  // ── 5. 亚历山大补给（delivery）— Fatima ──
  {
    id: "alexandria_supplies",
    name: "亚历山大补给",
    description: "亚历山大港的食物储备不足，需要从卡利卡特运一批香料回来。",
    type: "delivery",
    requirement: {
      type: "delivery",
      fromPortId: "calicut",
      toPortId: "alexandria",
      goodsId: "pepper",
      quantity: 15,
    },
    rewards: { gold: 1800, exp: 90, itemIds: ["robe_of_wisdom"] },
    issuerPortId: "alexandria",
    issuerNpcId: "fatima",
    minLevel: 4,
    minAffinity: 15,
  },

  // ── 6. 远征象牙海岸（explore）— Zuri ──
  {
    id: "ivory_trade",
    name: "远征象牙海岸",
    description:
      "Zuri 听说索法拉港来了一批上等象牙，但她走不开。替她跑一趟，把象牙带回来。",
    type: "explore",
    requirement: {
      type: "explore",
      targetPortId: "sofala",
    },
    rewards: { gold: 1000, exp: 70, itemIds: ["leather_armor"] },
    issuerPortId: "mombasa",
    issuerNpcId: "zuri",
    minLevel: 2,
  },
] as const;
