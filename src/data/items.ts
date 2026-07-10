// ============================================================
// 物品与装备配置 - 20 件初始装备（武器 + 铠甲 + 饰品）
// ============================================================

export interface ItemConfig {
  readonly id: string;
  readonly name: string;
  readonly type: "weapon" | "armor" | "accessory" | "consumable" | "material";
  readonly quality: "normal" | "good" | "excellent" | "rare" | "legendary";
  readonly price: number;
  readonly effect: {
    readonly hpBonus?: number;
    readonly atkBonus?: number;
    readonly defBonus?: number;
    readonly magBonus?: number;
    readonly mdfBonus?: number;
    readonly spdBonus?: number;
    readonly lukBonus?: number;
    readonly equipLoadBonus?: number;
  };
  readonly scaling?: {
    readonly str?: "normal" | "good" | "excellent" | "rare" | "legendary";
    readonly dex?: "normal" | "good" | "excellent" | "rare" | "legendary";
    readonly int?: "normal" | "good" | "excellent" | "rare" | "legendary";
    readonly fth?: "normal" | "good" | "excellent" | "rare" | "legendary";
    readonly arc?: "normal" | "good" | "excellent" | "rare" | "legendary";
  };
  readonly description?: string;
  readonly stackable?: boolean;
  readonly skills?: readonly {
    readonly skillId: string;
    readonly levelRequired: number;
  }[];
}

export const ITEMS: readonly ItemConfig[] = [
  // ---- 主手武器 (7 件) ----
  {
    id: "rusted_sword",
    name: "生锈的铁剑",
    type: "weapon",
    quality: "normal",
    price: 100,
    effect: { atkBonus: 5 },
    scaling: { str: "good" },
    description: "一把布满铁锈的旧长剑，聊胜于无。",
    stackable: false,
    skills: [{ skillId: "heavy_strike", levelRequired: 1 }],
  },
  {
    id: "iron_sword",
    name: "精钢长剑",
    type: "weapon",
    quality: "good",
    price: 500,
    effect: { atkBonus: 12 },
    scaling: { str: "excellent", dex: "good" },
    description: "精铁锻造的长剑，坚固锋利，是合格的水手武器。",
    stackable: false,
    skills: [
      { skillId: "heavy_strike", levelRequired: 1 },
      { skillId: "pierce", levelRequired: 3 },
    ],
  },
  {
    id: "silver_rapier",
    name: "白银细剑",
    type: "weapon",
    quality: "excellent",
    price: 1500,
    effect: { atkBonus: 22 },
    scaling: { dex: "excellent" },
    description: "优雅的刺剑，白银打造，适合灵巧的剑客。",
    stackable: false,
    skills: [
      { skillId: "pierce", levelRequired: 1 },
      { skillId: "bloody_thrust", levelRequired: 5 },
    ],
  },
  {
    id: "mage_staff",
    name: "法师法杖",
    type: "weapon",
    quality: "good",
    price: 600,
    effect: { atkBonus: 3, magBonus: 15 },
    scaling: { int: "excellent" },
    description: "顶端镶嵌微光晶石的木质法杖，能引导微弱的魔力。",
    stackable: false,
    skills: [
      { skillId: "fireball", levelRequired: 1 },
      { skillId: "freeze_lance", levelRequired: 4 },
    ],
  },
  {
    id: "holy_mace",
    name: "圣职晨星锤",
    type: "weapon",
    quality: "excellent",
    price: 1800,
    effect: { atkBonus: 15, mdfBonus: 10 },
    scaling: { str: "good", fth: "excellent" },
    description: "教会修士常用的战锤，其上镌刻有圣洁的祷文。",
    stackable: false,
    skills: [
      { skillId: "holy_strike", levelRequired: 1 },
      { skillId: "heal_light", levelRequired: 3 },
    ],
  },
  {
    id: "pirate_cutlass",
    name: "海盗弯刀",
    type: "weapon",
    quality: "excellent",
    price: 1200,
    effect: { atkBonus: 20, spdBonus: 3 },
    scaling: { dex: "good", arc: "excellent" },
    description: "弧度夸张的弯刀，适合在狭窄的甲板上挥砍。",
    stackable: false,
    skills: [
      { skillId: "flurry", levelRequired: 1 },
      { skillId: "poison_blade", levelRequired: 4 },
    ],
  },
  {
    id: "legendary_harpoon",
    name: "风暴鱼叉",
    type: "weapon",
    quality: "legendary",
    price: 8000,
    effect: { atkBonus: 60, spdBonus: 10 },
    scaling: { str: "legendary", dex: "excellent" },
    description: "曾用来捕获深海巨兽的古老鱼叉，蕴含着海洋的雷霆之力。",
    stackable: false,
    skills: [
      { skillId: "flurry", levelRequired: 1 },
      { skillId: "thunder_spear", levelRequired: 5 },
    ],
  },

  // ---- 铠甲/防具 (6 件) ----
  {
    id: "ragged_clothes",
    name: "破烂的衣物",
    type: "armor",
    quality: "normal",
    price: 50,
    effect: { defBonus: 2, hpBonus: 10 },
    description: "破旧且满是补丁的粗布麻衣。",
    stackable: false,
  },
  {
    id: "leather_armor",
    name: "皮甲",
    type: "armor",
    quality: "good",
    price: 300,
    effect: { defBonus: 8, hpBonus: 30, equipLoadBonus: 5 },
    description: "经过熟化处理的坚韧皮革护甲，轻便且有一定防护力。",
    stackable: false,
  },
  {
    id: "chain_mail",
    name: "锁子甲",
    type: "armor",
    quality: "excellent",
    price: 1200,
    effect: { defBonus: 20, hpBonus: 70 },
    scaling: { str: "good" },
    description: "细密金属环扣锁成的全身护甲，对斩击防御力优秀。",
    stackable: false,
  },
  {
    id: "plate_armor",
    name: "骑士板甲",
    type: "armor",
    quality: "rare",
    price: 3500,
    effect: { defBonus: 45, hpBonus: 150, equipLoadBonus: -5 },
    scaling: { str: "excellent" },
    description: "厚重的整体锻造钢板甲，防御无懈可击，但会降低装备承重。",
    stackable: false,
  },
  {
    id: "robe_of_wisdom",
    name: "贤者长袍",
    type: "armor",
    quality: "excellent",
    price: 1500,
    effect: { defBonus: 10, mdfBonus: 25, hpBonus: 50 },
    scaling: { int: "excellent" },
    description: "隐士或学者穿着的长袍，编织时注入了隔绝法术的丝线。",
    stackable: false,
  },
  {
    id: "legendary_captain_coat",
    name: "传奇船长风衣",
    type: "armor",
    quality: "legendary",
    price: 10000,
    effect: { defBonus: 55, mdfBonus: 35, hpBonus: 250 },
    scaling: { arc: "legendary", dex: "good" },
    description: "七海传奇霸主曾穿戴的风衣，具有避水防寒与偏折子弹的神奇功效。",
    stackable: false,
  },

  // ---- 饰品 (7 件) ----
  {
    id: "brass_ring",
    name: "黄铜戒指",
    type: "accessory",
    quality: "normal",
    price: 80,
    effect: { hpBonus: 10 },
    description: "一枚普通的铜制饰品，或许能带来一丝心理安慰。",
    stackable: false,
  },
  {
    id: "ring_of_vigor",
    name: "生命戒指",
    type: "accessory",
    quality: "good",
    price: 400,
    effect: { hpBonus: 30 },
    description: "镶嵌着温润微红玛瑙的戒指，能增进佩戴者的气血。",
    stackable: false,
  },
  {
    id: "ring_of_strength",
    name: "力量戒指",
    type: "accessory",
    quality: "good",
    price: 500,
    effect: { atkBonus: 5 },
    description: "雕刻有狂暴熊爪印记的粗犷指环，激发肌肉爆发力。",
    stackable: false,
  },
  {
    id: "crest_of_speed",
    name: "行动徽章",
    type: "accessory",
    quality: "excellent",
    price: 1200,
    effect: { spdBonus: 8 },
    description: "雕刻成飞鸟羽翼形状的银质徽章，令动作更加轻盈敏捷。",
    stackable: false,
  },
  {
    id: "amulet_of_fortune",
    name: "幸运护身符",
    type: "accessory",
    quality: "excellent",
    price: 1500,
    effect: { lukBonus: 10 },
    description: "装有神秘海域贝壳的护身符，据说常能使人逢凶化吉。",
    stackable: false,
  },
  {
    id: "ring_of_power",
    name: "魔力戒指",
    type: "accessory",
    quality: "good",
    price: 500,
    effect: { magBonus: 5 },
    description: "幽蓝澄澈的水晶指环，对周边奥术元素感应更为敏锐。",
    stackable: false,
  },
  {
    id: "legendary_sea_stone",
    name: "海洋之星",
    type: "accessory",
    quality: "legendary",
    price: 12000,
    effect: {
      hpBonus: 100,
      atkBonus: 10,
      defBonus: 10,
      magBonus: 10,
      mdfBonus: 10,
      spdBonus: 5,
      lukBonus: 5,
    },
    description: "相传自远古海神王冠跌落的水晶碎屑，佩戴者得大海全方位的庇护。",
    stackable: false,
  },
] as const;

export const ITEM_QUALITY_LABELS = {
  normal: "普通",
  good: "良",
  excellent: "优秀",
  rare: "稀有",
  legendary: "传说",
} as const;

// ---- 装备合成配方 ----

export interface RecipeIngredient {
  readonly itemId: string;
  readonly quantity: number;
}

export interface EquipmentRecipe {
  readonly id: string;
  readonly resultId: string;
  readonly name: string;
  readonly ingredients: readonly RecipeIngredient[];
  readonly goldCost: number;
  readonly portId: string;
  readonly minAffinity?: { readonly npcId: string; readonly value: number };
}

export const RECIPES: readonly EquipmentRecipe[] = [
  {
    id: "rusty_to_iron",
    resultId: "iron_sword",
    name: "精钢长剑",
    ingredients: [{ itemId: "rusted_sword", quantity: 2 }],
    goldCost: 300,
    portId: "quanzhou",
  },
  {
    id: "leather_to_chain",
    resultId: "chain_mail",
    name: "锁子甲",
    ingredients: [{ itemId: "leather_armor", quantity: 2 }],
    goldCost: 500,
    portId: "london",
  },
  {
    id: "brass_to_vigor",
    resultId: "ring_of_vigor",
    name: "生命戒指",
    ingredients: [
      { itemId: "brass_ring", quantity: 1 },
      { itemId: "ring_of_strength", quantity: 1 },
    ],
    goldCost: 400,
    portId: "alexandria",
  },
  {
    id: "iron_to_silver",
    resultId: "silver_rapier",
    name: "白银细剑",
    ingredients: [
      { itemId: "iron_sword", quantity: 1 },
      { itemId: "mage_staff", quantity: 1 },
    ],
    goldCost: 800,
    portId: "venice",
  },
  {
    id: "chain_to_plate",
    resultId: "plate_armor",
    name: "骑士板甲",
    ingredients: [
      { itemId: "chain_mail", quantity: 1 },
      { itemId: "robe_of_wisdom", quantity: 1 },
    ],
    goldCost: 1500,
    portId: "malacca",
  },
  {
    id: "silver_to_harpoon",
    resultId: "legendary_harpoon",
    name: "风暴鱼叉",
    ingredients: [
      { itemId: "silver_rapier", quantity: 1 },
      { itemId: "pirate_cutlass", quantity: 1 },
    ],
    goldCost: 3000,
    portId: "goa",
    minAffinity: { npcId: "marco", value: 40 },
  },
];
