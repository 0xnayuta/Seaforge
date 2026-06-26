---
status: current
last_verified: 2026-06-25
---

# 项目结构

---

## 目录树

```
src/
│
├── app/                              # Next.js App Router
│   ├── layout.tsx                    # 根布局
│   ├── page.tsx                      # 港口总览 (/)
│   ├── market/page.tsx               # 交易所 (/market)
│   ├── ship/page.tsx                 # 造船厂 (/ship)
│   ├── cargo/page.tsx                # 船舱 (/cargo)
│   ├── navigation/page.tsx           # 航海图 (/navigation)
│   ├── voyage/page.tsx               # 航行中 (/voyage)
│   ├── fleet/page.tsx                # 舰队管理 (/fleet, Phase 2)
│   ├── tavern/page.tsx               # 酒馆/船员招募 (/tavern, Phase 2)
│   └── actions/
│       ├── save.ts                   # 读档/存档 Server Actions
│       ├── trade.ts                  # 买卖 Server Actions
│       ├── travel.ts                 # 航行 Server Actions
│       ├── ship.ts                   # 船只购买/出售/升级 (Phase 2)
│       ├── crew.ts                   # 船员招募 (Phase 2)
│       └── equipment.ts              # 装备 (Phase 2)
│
├── components/                       # React 组件（纯渲染）
│   ├── StatusBar.tsx
│   ├── MarketPanel.tsx
│   ├── CargoHold.tsx
│   ├── NavigationMap.tsx
│   ├── VoyageScreen.tsx
│   ├── FleetPanel.tsx                # 舰队管理面板 (Phase 2)
│   ├── EquipmentPanel.tsx            # 装备面板 (Phase 2)
│   ├── CrewPanel.tsx                 # 船员面板 (Phase 2)
│   └── ui/                           # 通用 UI 组件
│       ├── Button.tsx
│       ├── Modal.tsx
│       ├── QuantityInput.tsx
│       └── Toast.tsx
│
├── game/                             # 游戏引擎（纯函数领域逻辑）
│   ├── domain/
│   │   ├── types.ts                  # World、领域类型定义
│   │   ├── player.ts                 # 玩家逻辑（等级经验）
│   │   ├── market.ts                 # 价格计算
│   │   ├── trade.ts                  # 买卖逻辑
│   │   ├── navigation.ts             # 航行/舰队编队出航逻辑
│   │   ├── ship.ts                   # 船只升级/购买/出售
│   │   ├── crew.ts                   # 船员招募/消耗 (Phase 2)
│   │   └── equipment.ts              # 装备系统 (Phase 2)
│   ├── application/
│   │   ├── buy.usecase.ts            # 购买 UseCase
│   │   ├── sell.usecase.ts           # 卖出 UseCase
│   │   └── travel.usecase.ts         # 航行 UseCase
│   ├── view-builder/
│   │   ├── buildGameView.ts          # World → GameView 入口
│   │   ├── buildMarketView.ts        # 交易所 GameView
│   │   └── buildNavigationView.ts    # 航海图 GameView
│   └── event/
│       └── event-resolver.ts         # 随机事件逻辑
│
├── data/                             # 游戏内容配置（数据化）
│   ├── ports.ts                      # 港口配置
│   ├── goods.ts                      # 商品配置
│   ├── ships.ts                      # 船只配置（含部件升级费用）
│   ├── crew.ts                       # 船员配置 (Phase 2)
│   ├── equipment.ts                  # 装备配置 (Phase 2)
│   ├── events.ts                     # 随机事件配置
│   └── formulas.ts                   # 公式常量
│
├── lib/                              # 基础设施
│   ├── prisma.ts                     # Prisma 单例
│   └── repository.ts                 # loadWorld / saveWorld（含存档迁移）
│
└── types/                            # 共享类型
    ├── world.ts                      # World 类型
    ├── game-view.ts                  # GameView 类型
    ├── actions.ts                    # Server Action 入参/出参类型
    └── fleet.ts                      # 舰队相关类型 (Phase 2)
```

## 目录职责

| 目录 | 职责 | 能否包含游戏规则 |
|---|---|---|
| `app/` | 路由 + Server Actions | 否（Server Action 只编排） |
| `components/` | React UI 组件 | 否 |
| `game/` | 所有游戏逻辑（纯函数） | 是 |
| `data/` | 配置数据（港口、商品、船只、公式） | 否（数据不是规则） |
| `lib/` | 基础设施（Prisma 等） | 否 |
| `types/` | TypeScript 类型定义 | 否 |

## 文件命名规范

| 目录 | 命名 | 示例 |
|---|---|---|
| `app/actions/` | kebab-case | `trade.ts` |
| `components/` | PascalCase | `MarketPanel.tsx` |
| `game/domain/` | kebab-case | `market.ts` |
| `game/application/` | kebab-case + `.usecase.ts` | `buy.usecase.ts` |
| `game/view-builder/` | PascalCase + `View` | `buildMarketView.ts` |
| `data/` | kebab-case + plural | `ports.ts`、`goods.ts` |
| `lib/` | kebab-case | `prisma.ts` |
| `types/` | kebab-case | `world.ts` |
