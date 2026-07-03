// ============================================================
// 副本配置 — 3 个副本
// ============================================================

export type DungeonFloorEventType = "combat" | "treasure" | "choice";

export interface DungeonFloorEvent {
  readonly type: DungeonFloorEventType;
  readonly difficulty?: number; // combat: 敌人数值倍率
  readonly goldReward?: number; // treasure/choice: 金币奖励
  readonly itemRewards?: readonly string[]; // treasure/choice: 物品 ID 列表
  readonly expReward?: number; // treasure/choice: 经验奖励
  readonly hpDamage?: number; // 陷阱/负面选择扣血
  readonly options?: readonly {
    readonly id: string;
    readonly text: string;
    readonly goldReward?: number;
    readonly itemRewards?: readonly string[];
    readonly expReward?: number;
    readonly hpDamage?: number;
  }[];
  readonly flavorText?: string; // 事件描述文本
}

export interface DungeonConfig {
  readonly id: string;
  readonly name: string;
  readonly entryPortId: string;
  readonly floors: readonly DungeonFloorEvent[];
  readonly levelRequirement: number;
  readonly statRecommendation: {
    readonly label: string;
    readonly minAtk?: number;
    readonly minDef?: number;
  };
  readonly completionReward: {
    readonly gold: number;
    readonly exp: number;
    readonly itemIds?: readonly string[];
  };
  readonly cooldownDays: number;
}

export const DUNGEONS: readonly DungeonConfig[] = [
  // ============================================================
  // 副本 1：基德的宝藏 — 入门级，入口泉州
  // ============================================================
  {
    id: "kidd_treasure",
    name: "基德的宝藏",
    entryPortId: "quanzhou",
    levelRequirement: 1,
    statRecommendation: {
      label: "推荐攻击 ≥ 10",
      minAtk: 10,
    },
    floors: [
      {
        type: "combat",
        difficulty: 1.2,
        flavorText:
          "你在一座无人岛上发现了基德藏宝图指示的洞穴入口，几名落魄海盗守在洞口。",
      },
      {
        type: "choice",
        flavorText:
          "洞穴深处出现两条岔路。左边隐约有金光闪烁，右边传来阵阵腥风。",
        options: [
          {
            id: "left",
            text: "走向金光闪闪的左边",
            goldReward: 300,
            hpDamage: 5,
          },
          { id: "right", text: "谨慎地走右边", goldReward: 100, expReward: 50 },
        ],
      },
      {
        type: "combat",
        difficulty: 1.5,
        flavorText:
          "穿过岔路，你来到了基德的藏宝室。宝箱旁游荡着基德的亡灵水手。",
      },
      {
        type: "treasure",
        goldReward: 500,
        expReward: 100,
        itemRewards: ["silver_rapier"],
        flavorText: "你打开了基德的宝箱！里面装满了金币和一把银光闪闪的细剑。",
      },
    ],
    completionReward: {
      gold: 1000,
      exp: 200,
      itemIds: ["ring_of_vigor"],
    },
    cooldownDays: 3,
  },

  // ============================================================
  // 副本 2：威尼斯地下遗迹 — 中级，入口威尼斯
  // ============================================================
  {
    id: "venice_ruins",
    name: "威尼斯地下遗迹",
    entryPortId: "venice",
    levelRequirement: 15,
    statRecommendation: {
      label: "推荐攻击 ≥ 30，防御 ≥ 20",
      minAtk: 30,
      minDef: 20,
    },
    floors: [
      {
        type: "choice",
        flavorText:
          "威尼斯总督府地下的古老水道入口，你需要在潮汐上涨前探索。水面泛着诡异的磷光。",
        options: [
          { id: "swim", text: "直接涉水前进", hpDamage: 10 },
          { id: "edge", text: "沿着墙边窄道小心前行", expReward: 30 },
        ],
      },
      {
        type: "combat",
        difficulty: 2.5,
        flavorText:
          "水道尽头是一间巨大的地下礼拜堂，一群狂热教团信徒正在进行血腥仪式。",
      },
      {
        type: "treasure",
        goldReward: 800,
        expReward: 200,
        itemRewards: ["holy_mace"],
        flavorText: "你在祭坛下发现了一个暗格，里面珍藏着教团的圣物。",
      },
      {
        type: "combat",
        difficulty: 3.0,
        flavorText:
          "圣物被取走的震动惊醒了礼拜堂地下深处的守卫——一具古老的威尼斯装甲骑士。",
      },
      {
        type: "treasure",
        goldReward: 1500,
        expReward: 300,
        flavorText:
          "击败守卫后，你找到了通往遗迹核心的秘道。数不尽的贡品堆积如山。",
      },
    ],
    completionReward: {
      gold: 3000,
      exp: 500,
      itemIds: ["plate_armor", "amulet_of_fortune"],
    },
    cooldownDays: 5,
  },

  // ============================================================
  // 副本 3：风暴之眼海域 — 高级，入口蒙巴萨
  // ============================================================
  {
    id: "storm_eye",
    name: "风暴之眼海域",
    entryPortId: "mombasa",
    levelRequirement: 30,
    statRecommendation: {
      label: "推荐攻击 ≥ 50，防御 ≥ 35",
      minAtk: 50,
      minDef: 35,
    },
    floors: [
      {
        type: "combat",
        difficulty: 4.0,
        flavorText:
          "传说中风暴之神沉眠的海域，终年笼罩在雷暴之中。你的小船被卷入了一道巨大的漩涡。",
      },
      {
        type: "combat",
        difficulty: 4.5,
        flavorText:
          "漩涡之下竟是别有洞天——一座沉没的古老城市。城市的广场上徘徊着深海眷族。",
      },
      {
        type: "choice",
        flavorText:
          "你发现了两座神殿：左侧神殿供奉着风暴之神，右侧神殿供奉着海洋女神。",
        options: [
          { id: "storm", text: "进入风暴神殿", hpDamage: 30, expReward: 500 },
          {
            id: "ocean",
            text: "进入海洋神殿",
            goldReward: 2000,
            expReward: 200,
          },
        ],
      },
      {
        type: "combat",
        difficulty: 5.0,
        flavorText:
          "你的选择唤醒了这座城市的真正主人——一名堕落的半神海怪。整个城市都在颤抖。",
      },
      {
        type: "treasure",
        goldReward: 5000,
        expReward: 800,
        itemRewards: ["legendary_sea_stone"],
        flavorText:
          "随着海怪的消散，城市中央升起了一座由珊瑚和珍珠构成的神坛。神坛上供奉着传说中的海洋之星。",
      },
    ],
    completionReward: {
      gold: 8000,
      exp: 1500,
      itemIds: ["legendary_harpoon"],
    },
    cooldownDays: 7,
  },
];
