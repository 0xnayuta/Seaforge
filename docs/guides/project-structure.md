---
status: current
last_verified: 2026-06-30
---

# 项目结构

---

## 目录树

```
src/
│
├── app/                              # Next.js App Router + Server Actions
│   ├── layout.tsx                    # 根布局
│   ├── page.tsx                      # 港口总览 (/)
│   ├── market/page.tsx               # 交易所 (/market) — 仅货物交易
│   ├── ship/page.tsx                 # 造船厂 (/ship) — 船只管理 + 装备购买/装卸
│   ├── cargo/page.tsx                # 船舱 (/cargo)
│   ├── navigation/page.tsx           # 航海图 (/navigation)
│   ├── voyage/page.tsx               # 航行中 (/voyage)
│   └── actions/
│       ├── trade.ts                  # 买卖 Server Actions (buyGoods / sellGoods)
│       ├── equipment.ts              # 装备 Server Actions (buy/sell/equip/unequip)
│       ├── travel.ts                 # 航行 Server Action (startTravel)
│       └── new-game.ts               # 新游戏 Server Action (createNewGame)
│   (每个客户端页面有独立 actions.ts — loadXxxView)
│
├── components/                       # React 组件（纯渲染）
│   ├── ui/
│   │   ├── GameCard.tsx
│   │   ├── Modal.tsx
│   │   └── QuantityInput.tsx
│   ├── CargoHold.tsx
│   ├── MarketPanel.tsx
│   ├── NavigationPanel.tsx
│   ├── ShipyardPanel.tsx
│   └── VoyageScreen.tsx
│
├── game/                             # 游戏引擎（纯函数领域逻辑）
│   ├── domain/
│   │   ├── types.ts                  # World、领域类型、DomainError
│   │   ├── player.ts                 # 玩家初始化 + 天数推进
│   │   ├── market.ts                 # 价格系统
│   │   ├── trade.ts                  # 买卖逻辑
│   │   ├── navigation.ts             # 航行/距离/抵达
│   │   ├── ship.ts                   # 船只升级/修理/武装/受损
│   │   ├── voyage.ts                 # 出航/航行事件
│   │   ├── combat.ts                 # 战斗结算
│   │   ├── equipment.ts              # 装备购买/出售/装卸/属性计算
│   │   └── __tests__/
│   │
│   └── view-builder/
│       └── buildGameView.ts          # World → GameView 入口
│
├── data/                             # 游戏内容配置（数据化）
│   ├── ports.ts                      # 12 港口 × 5 区域
│   ├── goods.ts                      # 16 商品，四大品类
│   ├── ships.ts                      # 2 船只
│   ├── events.ts                     # 随机事件配置
│   ├── equipment.ts                  # 9 装备配置（5 类型，售卖港口绑定）
│   ├── formulas.ts                   # 公式常量
│   ├── regions.ts                    # 5 区域配置
│   └── __tests__/
│
├── lib/                              # 基础设施
│   ├── prisma.ts                     # Prisma 单例
│   ├── repository.ts                 # loadWorld / saveWorld
│   ├── domain-errors.ts              # DomainError → 中文消息
│   └── with-transaction.ts           # HOF 事务管道
│
├── types/                            # 共享类型
│   ├── game-view.ts                  # GameView 类型
│   └── prisma.ts                     # PrismaTransactionClient 类型
│
└── e2e/                              # Playwright E2E 测试
```

## 目录职责

| 目录 | 职责 | 能否包含游戏规则 |
|---|---|---|
| `app/` | 路由 + Server Actions（含编排） | 否 |
| `components/` | React UI 组件 | 否 |
| `game/` | 所有游戏逻辑（纯函数） | 是 |
| `data/` | 配置数据（港口、商品、船只、装备、公式） | 否（数据不是规则） |
| `lib/` | 基础设施（Prisma、repository、HOF） | 否 |
| `types/` | TypeScript 类型定义 | 否 |

## 文件命名规范

| 目录 | 命名 | 示例 |
|---|---|---|
| `app/actions/` | kebab-case | `trade.ts` |
| `components/` | PascalCase | `MarketPanel.tsx` |
| `game/domain/` | kebab-case | `market.ts` |
| `game/view-builder/` | PascalCase + `View` | `buildMarketView.ts` |
| `data/` | kebab-case + plural | `ports.ts`、`goods.ts` |
| `lib/` | kebab-case | `prisma.ts` |
| `types/` | kebab-case | `game-view.ts` |
