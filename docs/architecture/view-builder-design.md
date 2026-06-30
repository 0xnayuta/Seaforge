---
status: current
last_verified: 2026-06-30
---

# View Builder 设计

**关联规则：** R8

---

## 定位

View Builder 是 Domain World 和 React UI 之间的适配层。

```
World（Domain）     ← 只存游戏事实
  │
  ▼
buildGameView(world)  ← View Builder
  │
  ▼
GameView（Render）  ← 渲染所需数据
  │
  ▼
React 渲染
```

## 职责

- 从 World 中提取数据
- 结合游戏数据配置（`src/data/`）计算渲染所需字段
- 组装成 GameView 数据结构
- **不做**任何持久化

## GameView 包含的内容

每次返回的 GameView 内容取决于当前所在页面。

### 港口总览（/）

```typescript
interface HarborView {
  portName: string
  portDescription: string
  region: string
  playerGold: number
  cargoCount: number     // 当前货舱使用量
  cargoCapacity: number  // 最大货舱容量
  currentDay: number
}
```

### 交易所（/market）

```typescript
interface MarketView {
  goods: GoodView[]
  playerGold: number
  cargoCount: number
  cargoCapacity: number
}

interface GoodView {
  id: string
  name: string
  category: string
  buyPrice: number       // 当前港口买入价
  sellPrice: number      // 当前港口卖出价（玩家持有该商品时）
  inCargo: number        // 玩家船舱中已有的数量
  canAfford: boolean     // 是否买得起至少 1 个
}
```

### 航海图（/navigation）

```typescript
interface NavigationView {
  currentPortName: string
  destinations: DestinationView[]
}

interface DestinationView {
  portId: string
  portName: string
  distance: number       // 距离
  travelDays: number     // 航行天数（基于距离 / 船速）
  estimatedProfit: number // 预估利润（当前货物 × 目标港预估卖价）
}
```

### 新字段何时加

当 React 需要渲染一个数据时：

1. 先检查这个数据是不是**游戏事实**（属于 World）
2. 如果是：View Builder 从 World 提取
3. 如果不是但**可以从 World 算出来**：View Builder 计算
4. 如果不是也算不出来：说明这个数据不该在这里

### GameView 不进入 SQLite

GameView 的计算产物（预估利润、航行天数、价格比较）每次从当前 World 重新计算生成，不持久化。原因：

- 数据变了（价格波动），旧的计算结果无意义
- World 结构变了，View Builder 自动适配
- 无需考虑 GameView 的数据迁移

## 预览 vs 确认原则

用户操作前会看到大量「预览数据」：选择目的港时看到的预估利润、航行天数，查看商品时看到的在不同港口的价差。

**这些数据属于 GameView，不属于 World。**

原因：

- 预览数据是当前 World 的计算产物。价格变了、公式改了，预览数据自然跟着变
- 用户尚未确认，这些数据不影响游戏事实
- 把预览数据放进 World = 存档包含临时计算产物 = 存档膨胀 + 失去向前兼容性

### 分界点判断

```
用户看到/操作                    → 分类
─────────────────────────────────
选中长崎（预览中）                → L3 useState（不在 World，不在 GameView）
看到「到长崎预计赚 1200」         → GameView（View Builder 计算）
点击「确认出航」                  → World 更新（currentPort = 长崎）
抵达后看到「本次航行赚了 980」    → GameView（从 World 的 cargo.buyPrice 计算）
```

**分界点在确认动作上。** 确认前的所有展示数据，由 View Builder 从当前 World 计算得出。确认后的结果写入 World。

### 如何判断一个数据该不该进 World

问三个问题（详见 `docs/guides/state-management.md`）：

```
Q1: 存档时要不要保存？
  ├── 是 → L1 World（SQLite）
  └── 否 → Q2

Q2: 刷新页面后要不要恢复？
  ├── 是 → L2 URL
  └── 否 → Q3

Q3: 只是当前操作过程中的临时选择？
  ├── 是 → L3 useState (Interaction)
  └── 否 → L4 useState (Visual)
```
