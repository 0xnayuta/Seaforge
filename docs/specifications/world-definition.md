---
status: current
last_verified: 2026-06-25
---

# World 定义

**关联规则：** R2

---

## World 是什么

World 是游戏事实（Game Facts）的集合。

World 是存档的全部内容。每次存档时，整个 World 序列化为 JSON 写入 SQLite。

## World 包含的内容

```typescript
// Phase 1（当前）
interface World {
  player: {
    name: string
    gold: number
    currentPortId: string
    day: number
    // level, exp, expToNext — Phase 2.1 新增
  }
  ship: {
    typeId: string
    upgradeLevel: number
    cargo: CargoItem[]
  }
  // 后续 Phase 增加：
  // quests: QuestState[]
  // worldEvents: WorldEventState[]
}

// Phase 2（舰队重构后）
interface World {
  player: {
    name: string
    currentPortId: string
    day: number
    level: number
    exp: number
    expToNext: number
    // 注意：gold 已移至 fleet.gold
  }
  fleet: {
    ships: ShipInstance[]         // 多船，替换 ship
    maxShips: number
    crew: number
    maxCrew: number
    gold: number                  // 舰队共有资金
  }
}

interface ShipInstance {
  id: string                       // uuid
  typeId: string
  name: string                     // 玩家可命名
  equipment: ShipEquipment
  durability: number
  maxDurability: number
  cargo: CargoItem[]
  equippedItems: string[]          // 装备 ID
}

interface ShipEquipment {
  hullLevel: number                // 舱容等级
  sailLevel: number                // 速度等级
  armorLevel: number               // 装甲等级（耐久上限）
  cannonLevel: number              // 炮击等级（攻击力）
}

interface CargoItem {
  goodId: string
  quantity: number
  buyPrice: number                 // 每单位买入价
}
```

## World 不包含的内容

- UI 状态（当前打开的面板、弹窗）
- 交互状态（当前选中的商品、输入框值）
- 视觉状态（Toast、Tooltip、动画）
- 临时选择（预览中的目标港口、选中的分类筛选）
- 渲染所需的计算产物（预估利润、预计航行天数）

详见状态分类：`docs/guides/state-management.md`

## 原则

World = 存档内容 = 游戏事实。

如果一个数据在「关闭页面重新加载」后不需要恢复，它不属于 World。

如果一个数据是「用户正在看什么、正在选什么、正在输入什么」，它不属于 World。
