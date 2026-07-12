---
status: approved
last_verified: 2026-07-13
---

# 游戏系统索引

本文档是 Seaforge 所有游戏系统与子系统的活目录。每个系统列出领域逻辑、数据配置、视图构建、Server Action、UI 组件、内容填充量和系统间依赖关系。修改代码后应同步更新 `last_verified` 和受影响行。

---

## 总览

```
经济轴：贸易 → 赚钱 → 购买装备/补给 → 继续贸易
成长轴：战斗/任务/副本 → 经验/装备 → 提升人物属性 → 挑战更难内容
交汇点：贸易赚钱支撑装备消费，人物成长解锁高收益贸易路线
```

---

## 系统速查表

| ID | 系统 | 领域逻辑 | 数据配置 | View Builder | Server Action | UI 组件 | 内容量 | 依赖 |
|----|------|----------|----------|-------------|---------------|---------|--------|------|
| **E** | **经济系统** | | | | | | | |
| E1 | 贸易（买卖） | `domain/trade.ts` | `data/goods.ts` | `harborViews.ts` | `actions/trade.ts` | `MarketPanel`, `GoodsTable`, `BuyModal`, `SellModal` | 19 商品, 4 品类 | E2, S1 |
| E2 | 市场价格 | `domain/market.ts` | `data/goods.ts`, `data/ports.ts`, `data/regions.ts` | `harborViews.ts` | — | — | 5 区域, 12 港口 | 数据层 |
| **N** | **航行系统** | | | | | | | |
| N1 | 导航/航线 | `domain/navigation.ts` | `data/ports.ts` | `harborViews.ts` | `actions/travel.ts` | `NavigationPanel`, `DestinationsTable`, `DepartureConfirmModal` | 12 港口, 5 区域 | S1, S2 |
| N2 | 航程事件 | `domain/voyage.ts` | `data/events.ts` | `voyageViews.ts` | — | `VoyageScreen` | 7 事件模板 | N1, C1, C2 |
| **S** | **船只系统** | | | | | | | |
| S1 | 船只属性/升级 | `domain/ship.ts` | `data/ships.ts` | `shipViews.ts` | `actions/travel.ts` | `ShipyardPanel`, `ShipSelector` | 8 艘船, 3 层级 | — |
| S2 | 船只装备 | `domain/equipment.ts` | `data/equipment.ts` | `shipViews.ts` | `actions/equipment.ts` | `ShipEquipment`, `EquipmentShop` | 9 件装备 | S1 |
| S3 | 船员 | `domain/crew.ts` | `data/formulas.ts` | `harborViews.ts` | `actions/crew.ts` | `TavernPanel` | 公式驱动 | S1 |
| S4 | 舰队管理 | 内嵌于 `ship.ts` | — | `shipViews.ts` | `app/fleet/actions.ts` | `FleetPanel` | 多船编组 | S1, S3 |
| **C** | **战斗系统** | | | | | | | |
| C1 | 舰队炮击战 | `domain/combat.ts` | `data/formulas.ts` | `voyageViews.ts` | — | 内嵌于 VoyageScreen | 公式驱动 | S2, S1 |
| C2 | 人物回合制战斗 | `domain/combat-person.ts` + 5 子模块 | `data/skills.ts`, `data/items.ts` | `combatViews.ts` | `actions/combat.ts` | `CombatPanel` | 10 技能, 6 敌人模板 | P2 |
| **P** | **人物/RPG 系统** | | | | | | | |
| P1 | 等级与经验 | `domain/player.ts` | `data/formulas.ts` | `harborViews.ts` | `actions/trade.ts`, `actions/travel.ts` | 状态栏 | 等级 1-199 | — |
| P2 | 属性与面板 | `domain/player.ts` | `data/formulas.ts` | `characterViews.ts` | `actions/character.ts` | `CharacterPanel`, `CharacterAttributes` | 5 核心属性, 8 面板值 | P1 |
| P3 | 人物装备 | `domain/player.ts` | `data/items.ts` | `characterViews.ts` | `actions/character.ts` | `CharacterInventory`, `CharacterEquipment` | 20 件装备, 5 品质 | P2 |
| P4 | 称号 | `domain/title.ts` | `data/titles.ts` | `metaViews.ts` | `actions/titles.ts` | `TitlesPanel` | 6 称号 | P1, E1, C1 |
| **Npc** | **NPC 与任务** | | | | | | | |
| Npc1 | NPC 交互/好感度 | `domain/npc.ts` | `data/npcs.ts` | `npcViews.ts` | `actions/npc.ts` | `NpcInteractionPanel` | 5 NPC | P2 |
| Npc2 | 任务 | `domain/quest.ts` | `data/quests.ts` | `questViews.ts` | `actions/quest.ts` | `QuestBoardClient` | 6 任务, 4 类型 | Npc1, E1, C1 |
| **D** | **内容深度 (Phase 4)** | | | | | | | |
| D1 | 副本 | `domain/dungeon.ts` | `data/dungeons.ts` | `metaViews.ts` | `actions/dungeon.ts` | `DungeonPanel` | 3 副本, 4-5 层 | C2, P3 |
| D2 | 装备合成 | `domain/crafting.ts` | `data/items.ts` (RECIPES) | `metaViews.ts` | `actions/crafting.ts` | `CraftingPanel` | ~8 配方 | P3, Npc1 |
| D3 | 成就 | `domain/achievement.ts` | `data/achievements.ts` | `metaViews.ts` | `actions/achievement.ts` | 内联渲染 | 15 成就 | P1, E1, C1 |
| D4 | 图鉴 | `domain/collection.ts` | 从现有数据推导 | `metaViews.ts` | 集成在 14 个 Action 中 | 内联渲染 | 被动收集 | 全系统 |
| **Sv** | **存档与基础设施** | | | | | | | |
| Sv1 | 存档管理 | `lib/repository.ts` | `prisma/schema.prisma` | `saveSlotViews.ts` | `actions/save.ts` | `SaveSlotList` | 4 槽位 | — |
| Sv2 | 事务管道 | `lib/with-transaction.ts` | — | — | — | — | HOF 抽象 | — |
| Sv3 | 错误映射 | `lib/domain-errors.ts` | — | — | — | — | 62 错误码 | — |

---

## 各系统规格文档索引

| 规格文档 | 覆盖系统 | 状态 |
|----------|----------|------|
| `docs/specifications/world-definition.md` | World 定义（全系统） | ✅ 已存在 |
| `docs/specifications/save-system.md` | 存档设计（Sv1） | ✅ 已存在 |
| `docs/specifications/project-positioning.md` | 项目定位 | ✅ 已存在 |
| `docs/specifications/trade-system.md` | 贸易与市场价格（E1, E2） | ✅ 本文 |
| `docs/specifications/person-combat-system.md` | 人物回合制战斗（C2） | ✅ 本文 |
| `docs/specifications/level-attribute-system.md` | 等级/属性/面板（P1, P2） | ✅ 本文 |
| `docs/specifications/dungeon-system.md` | 副本系统（D1） | ✅ 本文 |

---

## 系统间依赖图

```
数据层 (goods, ports, ships, items, ...)
 ├──→ E2 市场价格 ──→ E1 贸易
 │                     └──→ P1 经验（利润转化）
 │
 ├──→ S1 船只属性 ──→ S2 船只装备
 │    ├──→ S3 船员
 │    ├──→ S4 舰队管理
 │    └──→ N1 导航 ──→ N2 航程事件
 │                      ├──→ C1 舰队炮击战
 │                      └──→ C2 人物战斗 ←── P2 属性面板
 │                                         ├── P3 装备
 │                                         ├── P4 称号
 │                                         ├── Npc1 NPC
 │                                         ├── Npc2 任务
 │                                         ├── D1 副本
 │                                         ├── D2 合成
 │                                         ├── D3 成就
 │                                         └── D4 图鉴 ←── 全系统
 │
 └──→ P1 等级经验 ──→ P2 属性面板
```

---

## 内容填充总量

| 内容类型 | 数量 | 数据文件 |
|----------|------|----------|
| 区域 | 5 | `data/regions.ts` |
| 港口 | 12 | `data/ports.ts` |
| 商品 | 19（4 品类） | `data/goods.ts` |
| 船只 | 8（3 层级） | `data/ships.ts` |
| 人物装备 | 20（5 品质） | `data/items.ts` |
| 船只装备 | 9（5 类型） | `data/equipment.ts` |
| NPC | 5 | `data/npcs.ts` |
| 任务 | 6（4 类型） | `data/quests.ts` |
| 副本 | 3（3-5 层） | `data/dungeons.ts` |
| 称号 | 6 | `data/titles.ts` |
| 成就 | 15（5 维度） | `data/achievements.ts` |
| 武器技能 | 10 | `data/skills.ts` |
| 事件模板 | 7 | `data/events.ts` |
  | 合成配方 | 6 | `data/items.ts` (RECIPES) |
| 公式常量 | 全部 140 行 | `data/formulas.ts` |
| 领域错误码 | 62 | `domain/types.ts` |

---

## 测试覆盖

| 范围 | 统计 |
|------|------|
| 单元测试总数 | 406 tests（24 文件） |
| Domain 测试 | 22 文件覆盖: trade, market, voyage, navigation, ship, combat, combat-person, crew, player, npc, quest, title, achievement, collection, crafting, dungeon, equipment |
| View Builder 测试 | `buildGameView.test.ts` |
| 数据完整性测试 | `data-integrity.test.ts` |
| Repository 测试 | `repository.test.ts` |
| E2E 测试 | 7 场景（Playwright） |
| Biome Lint | 0 errors, 0 warnings |
