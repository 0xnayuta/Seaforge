---
status: archived
last_verified: 2026-07-01
---

# Phase 4：长期留存（Long-term Retention）

---

## 目标

在 Phase 1-3 的贸易/舰队/战斗/任务内容基础之上，引入**探宝、装备合成、成就、图鉴**等系统，为已拥有完整游戏体验的玩家提供中后期的内容纵深和收集驱动力。

**核心命题：** 从「有目标可追」进化到「有内容可探索、有收藏可追求」。

---

## 架构总览

### 分层（不变）

Phase 4 不改变 Clean Architecture Lite 的分层结构。所有新增系统遵循 Server Action → Domain 纯函数 → View Builder → UI 的标准数据流。

### World 类型扩展

```typescript
// Phase 3 World
interface World {
  readonly player: PlayerState;
  readonly fleet: FleetState;
  readonly market: MarketPriceState;
  readonly voyage: VoyageState | null;
  readonly quests: readonly QuestState[];
  readonly title: string | null;
  readonly titleBoard: readonly string[];
}

// Phase 4 World — 新增 dungeons、achievements、collection 等字段
interface World {
  // ... Phase 3 所有字段
  readonly dungeonState: DungeonState | null;       // 4.1 副本地牢状态
  readonly treasureMap: TreasureMapState | null;     // 4.1 藏宝图
  readonly achievements: readonly string[];          // 4.3 已解锁成就
  readonly collection: CollectionState;              // 4.4 图鉴记录
}

interface DungeonState {
  readonly dungeonId: string;
  readonly currentFloor: number;
  readonly maxFloor: number;
  readonly status: "in_progress" | "cleared" | "failed";
  readonly rewards: readonly string[];
}

interface TreasureMapState {
  readonly mapId: string;
  readonly targetRegionId: string;
  readonly clue: string;
  readonly status: "incomplete" | "completed";
}

interface CollectionState {
  readonly visitedPorts: readonly string[];
  readonly tradedGoods: readonly string[];
  readonly ownedShips: readonly string[];
}
```

### 关键设计决策

| 决策 | 说明 |
|------|------|
| 探宝为副本形式 | 非开放世界探索，是港口入口的序列化战斗/事件关卡 |
| 藏宝图为合成消耗品 | 碎片收集 → 合成完整藏宝图 → 导航到坐标海域 → 获得奖励，消耗后消失 |
| 装备合成不引入新 UI 框架 | 在现有铁匠铺/造船厂界面中扩展「合成」标签页 |
| 成就为纯客户端展示 | 从 World 数据现场推导已达成成就，不必须持久化成就日志 |
| 图鉴被动记录 | 玩家正常游戏中自动记录，不需要额外操作 |

---

## 子阶段划分

### Phase 4.1：探宝与副本系统

为港口引入专属副本入口，玩家进入副本后经历序列化事件（多场战斗/多个选择）并获得奖励。同时引入藏宝图系统。

#### 4.1.1 副本系统

##### 数据配置

新建 `src/data/dungeons.ts`：

| 字段 | 说明 |
|------|------|
| `id` | 唯一标识 |
| `name` | 副本名称（如「基德的宝藏」「威尼斯地下遗迹」） |
| `entryPortId` | 入口港口 |
| `floors` | 层数（3-5 层），每层包含事件/战斗配置 |
| `levelRequirement` | 进入等级要求 |
| `rewards` | 通关奖励（金币、装备、材料） |
| `cooldownDays` | 冷却天数（通关后可再次进入） |

##### 领域逻辑

新建 `src/game/domain/dungeon.ts`：

| 函数 | 说明 |
|------|------|
| `enterDungeon(world, dungeonId)` | 进入副本，校验等级/冷却/是否重复进入 |
| `advanceDungeonFloor(world, choice)` | 推进一层，处理该层事件（战斗/宝箱/选择） |
| `completeDungeon(world)` | 通关结算，发放奖励，标记冷却 |
| `escapeDungeon(world)` | 中途退出，部分奖励保留 |

##### World 类型变更

```typescript
interface DungeonState {
  readonly dungeonId: string;
  readonly currentFloor: number;
  readonly totalFloors: number;
  readonly hpLoss: number;              // 已损失耐久
  readonly cargoGained: CargoItem[];    // 已获得货物
  readonly goldGained: number;
  readonly status: "in_progress" | "cleared" | "failed" | "escaped";
}
```

#### 4.1.2 藏宝图系统

##### 数据配置

新建 `src/data/treasure-maps.ts`：

| 字段 | 说明 |
|------|------|
| `id` | 唯一标识 |
| `name` | 藏宝图名称 |
| `fragments` | 所需碎片数量（3-5 片） |
| `targetPortId` | 宝藏所在港口 |
| `reward` | 奖励配置（稀有装备/大量金币） |

##### 领域逻辑

新建 `src/game/domain/treasure.ts`：

| 函数 | 说明 |
|------|------|
| `collectMapFragment(world, fragmentId)` | 收集碎片，碎片可来自事件奖励/副本掉落 |
| `assembleMap(world, mapId)` | 碎片收集齐全后合成完整藏宝图 |
| `digTreasure(world)` | 抵达目标港后使用藏宝图，获得奖励 |

##### 关联文件

| 模块 | 文件 | 说明 |
|------|------|------|
| 副本配置 | `src/data/dungeons.ts` | 副本模板（新增） |
| 藏宝图配置 | `src/data/treasure-maps.ts` | 藏宝图模板（新增） |
| 领域逻辑 | `src/game/domain/dungeon.ts` | 副本纯函数（新增） |
| 领域逻辑 | `src/game/domain/treasure.ts` | 藏宝图纯函数（新增） |
| 类型定义 | `src/game/domain/types.ts` | World 扩展 dungeon/treasureMap 字段 |
| View Builder | `src/game/view-builder/buildGameView.ts` | 副本/藏宝图视图 |
| 游戏视图 | `src/types/game-view.ts` | 新增相关视图类型 |
| Server Action | `src/app/actions/dungeon.ts` | 副本操作 Action（新增） |
| UI 组件 | `src/components/DungeonPanel.tsx` | 副本入口/战斗/结算界面（新增） |
| 路由页面 | `src/app/dungeon/page.tsx` | 副本页面（新增） |

#### UI 变更

| 页面 | 变更 |
|------|------|
| `/` 港口 | 有副本入口的港口显示「副本」按钮 |
| 新增 `/dungeon` | 副本主界面：层数推进、事件选择、战斗结算、奖励展示 |
| `/navigation` | 持有藏宝图时，目标港口显示「宝」标记 |
| 抵达特殊港口 | 有藏宝图且正确时触发挖掘事件 |

#### 测试覆盖

| 范围 | 内容 |
|------|------|
| 单元测试 | 进入副本校验（等级/冷却） |
| | 副本层数推进各事件处理 |
| | 中途退出 vs 通关奖励差异 |
| | 藏宝图碎片收集与合成 |
| | 抵达目标港后挖掘奖励发放 |

---

### Phase 4.2：装备合成系统

在现有装备系统（Phase 2.5）基础上，引入铁匠铺合成——多件低阶装备合成高阶装备。

#### 数据配置

在 `src/data/equipment.ts` 中扩展：

| 新增字段 | 说明 |
|---------|------|
| `recipe` | 合成配方（所需装备 ID 列表 + 可选金币） |
| `tier` | 品质等级（1-3，影响装备效果上限） |

新增合成配方表：

```typescript
interface EquipmentRecipe {
  readonly resultId: string;       // 合成产物装备 ID
  readonly ingredients: string[];  // 所需装备 ID 列表
  readonly goldCost: number;       // 额外金币消耗
  readonly portId: string;         // 可合成的港口
}
```

#### 领域逻辑

在 `src/game/domain/equipment.ts` 中扩展：

| 函数 | 说明 |
|------|------|
| `craftEquipment(world, recipeId)` | 合成装备，校验材料/金币/港口，产出新装备加入背包 |

当前 `fleet.inventory` 已存储装备 ID 列表，可直接复用。

#### 关联文件

| 模块 | 文件 | 说明 |
|------|------|------|
| 数据配置 | `src/data/equipment.ts` | 扩展 recipe/tier 字段 |
| 领域逻辑 | `src/game/domain/equipment.ts` | 新增 `craftEquipment` |
| UI | `src/components/ShipyardPanel.tsx` | 铁匠铺新增「合成」标签页 |

#### UI 变更

| 页面 | 变更 |
|------|------|
| `/ship` 造船厂 | 新增「装备合成」标签页：配方列表、材料栏、合成按钮、预览结果 |

#### 测试覆盖

| 范围 | 内容 |
|------|------|
| 单元测试 | 合成成功：材料消耗、金币扣除、产物加入背包 |
| | 材料不足拒绝合成 |
| | 金币不够拒绝合成 |
| | 不在正确港口拒绝合成 |

---

### Phase 4.3：成就系统

轻量成就系统，记录玩家里程碑事件，提供额外的目标感和满足感。

#### 数据配置

新建 `src/data/achievements.ts`：

| 字段 | 说明 |
|------|------|
| `id` | 唯一标识 |
| `name` | 成就名称 |
| `description` | 解锁条件描述 |
| `condition` | 条件类型与阈值（累计贸易额、航行里程、战斗胜利、任务完成数等） |
| `reward` | 奖励（少量金币/经验/称号，可选） |

#### 领域逻辑

计算型设计——成就解锁状态通过 World 数据现场推导：

```typescript
function getAchievementProgress(world: World): AchievementProgress[] {
  // 遍历所有成就配置，逐项检查条件并返回进度
}
```

#### 关联文件

| 模块 | 文件 | 说明 |
|------|------|------|
| 数据配置 | `src/data/achievements.ts` | 成就配置表（新增） |
| 领域逻辑 | `src/game/domain/achievement.ts` | 进度计算、奖励发放（新增） |
| View Builder / UI | 成就页面 | 成就列表 + 进度条 |

#### UI 变更

| 页面 | 变更 |
|------|------|
| 新增 `/achievements` | 成就列表：已达成、进行中、未解锁，进度百分比展示 |
| `/` 港口 | 入口按钮（有未领取成就奖励时显示标记） |

---

### Phase 4.4：图鉴系统

被动记录玩家的港口访问、商品交易、船只拥有历史，提供收集驱动力。

#### 数据配置

图鉴数据不依赖配置文件——直接从已有数据（`src/data/ports.ts`、`src/data/goods.ts`、`src/data/ships.ts`）生成图鉴条目。

#### 领域逻辑

```typescript
function buildCollectionView(world: World): CollectionView {
  const visitedPorts = PORTS.map(p => ({
    port: p,
    visited: world.collection.visitedPorts.includes(p.id),
  }));
  const tradedGoods = GOODS.map(g => ({
    good: g,
    traded: world.collection.tradedGoods.includes(g.id),
  }));
  // ... 类似逻辑
}
```

#### World 类型

```typescript
interface CollectionState {
  readonly visitedPorts: readonly string[];
  readonly tradedGoods: readonly string[];
  readonly ownedShips: readonly string[];
  readonly discoveredEvents: readonly string[];   // 遭遇过的事件类型
}
```

记录逻辑插入现有操作中——`arriveAtPort` 记录港口、`executeBuy`/`executeSell` 记录商品、`buyShip` 记录船只。

#### 关联文件

| 模块 | 文件 | 说明 |
|------|------|------|
| 类型定义 | `src/game/domain/types.ts` | World 新增 `collection` 字段 |
| 领域逻辑 | `src/game/domain/collection.ts` | 更新记录、构建图鉴视图（新增） |
| 钩子插入 | `src/game/domain/navigation.ts` | `arriveAtPort` 中记录访问 |
| 钩子插入 | `src/game/domain/trade.ts` | 交易中记录商品 |
| 钩子插入 | `src/game/domain/ship.ts` | 购买船只时记录 |
| UI | 新增 `/collection` 页面 | 图鉴展示 |

#### UI 变更

| 页面 | 变更 |
|------|------|
| 新增 `/collection` | 分类图鉴：港口（已访问/未访问）/商品（已交易/未交易）/船只（已拥有/未拥有） |

---

## 依赖关系

```
Phase 4.1 (探宝/副本) ─── 独立，依赖 Phase 1/2 稳定
Phase 4.2 (装备合成) ─── 依赖 Phase 2.5 (装备系统)
Phase 4.3 (成就系统) ─── 独立，可从现有 World 数据推导
Phase 4.4 (图鉴系统) ─── 独立，在现有操作中插入记录点
```

**推荐执行顺序：** 4.3 + 4.4（并行，轻量）→ 4.1（重量级）→ 4.2（中等）

---

## 暂不实现（Phase 4 范围外）

| 功能 | 备注 | 预计 Phase |
|------|------|-----------|
| 房屋系统 | 玩家住宅，装修 | Phase 5 |
| 宠物系统 | 辅助战斗 | Phase 5 |
| MOD 支持 | 外部扩展 | Phase 5 |
| 图形化世界地图 | 当前文字列表，符合定位 | 低优先级 |
| 社交系统 | 单机版不计划 | 不计划 |
| PK/玩家劫掠 | 单机版不计划 | 不计划 |

---

## 完成标准

### 硬性条件（必须满足）

- [ ] 副本系统：至少 2 个港口专属副本，含多层事件/战斗序列
- [ ] 藏宝图系统：至少 3 种藏宝图，碎片收集 → 合成 → 挖掘完整链路
- [ ] 装备合成：至少 5 种合成配方，从低阶合成高阶装备
- [ ] 成就系统：至少 15 个成就，覆盖贸易/航行/战斗/任务四个维度
- [ ] 图鉴系统：港口/商品/船只三类图鉴自动记录与展示
- [ ] `npx next build` 无错误
- [ ] `bun run lint` 无 warning/error
- [ ] 游戏引擎纯函数测试全部通过

### 质量条件（建议满足）

- [ ] 副本难度曲线合理：低等级副本可 solo，高等级副本需装备准备
- [ ] 合成配方不破坏装备平衡：合成装备略强于同级商店装备，但不碾压
- [ ] 成就进度可视化，玩家清晰知道下一步做什么
- [ ] 图鉴收集进度有全局完成度展示（如「港口 8/12」）
- [ ] UI 无控制台报错

---

## 参考文档

| 主题 | 文档 |
|------|------|
| 原版游戏调研 | `docs/reference/deep-research-report.md` |
| Phase 1 路线图 | `docs/roadmap/phase-1-mvp.md` |
| Phase 2 路线图 | `docs/roadmap/phase-2-system-depth.md` |
| Phase 3 路线图 | `docs/archive/phase-3-content-depth-archived.md` |
| 原版探宝/副本描述 | `docs/reference/deep-research-report.md` §12.2（探宝/遗迹） |
| World 定义 | `docs/specifications/world-definition.md` |
| Clean Architecture 分层 | `docs/architecture/clean-architecture-lite.md` |
| 数据流 | `docs/architecture/data-flow.md` |
| 状态管理 | `docs/guides/state-management.md` |
| 架构宪法 | `AGENTS.md` |
