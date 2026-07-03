---
status: approved
last_verified: 2026-07-03
---

# Phase 4：内容深度（Content Depth）

---

## 目标

在 Phase 3 的 RPG 底层（人物/装备/战斗/NPC/任务）完备后，引入**副本系统、装备合成、成就系统、图鉴系统**等纵向内容。此阶段的主题是"用 Phase 3 搭建的 RPG 框架填充可玩内容"。

**核心命题：** 从「RPG 框架完备」进化到「有内容可刷、有装备可追、有成就可收」。

---

## 通用前提

Phase 4 的所有子系统依赖以下 Phase 3 基础设施：
- 人物属性系统 ✅（Phase 3.1）
- 物品/装备系统 ✅（Phase 3.1）
- 回合制人物战斗 ✅（Phase 3.2）
- NPC 系统 ✅（Phase 3.3）

---

## 子阶段划分

### Phase 4.1：副本系统 ✅

为港口引入专属副本入口，玩家进入副本后经历序列化事件（多场回合制战斗/多个选择）并获得奖励。

#### 前置依赖

- Phase 3.2 回合制人物战斗 ✅（副本内战斗使用人物回合制系统）
- Phase 3.1 物品系统 ✅（副本奖励为物品/装备）

#### 数据配置

新建 `src/data/dungeons.ts`：

| 字段 | 说明 |
|------|------|
| `id` | 唯一标识 |
| `name` | 副本名称 |
| `entryPortId` | 入口港口 |
| `floors` | 层数（3-5 层），每层包含事件/战斗配置 |
| `levelRequirement` | 进入等级要求 |
| `statRecommendation` | 推荐属性值 |
| `completionReward` | 通关奖励 |
| `cooldownDays` | 冷却天数 |

已配置 3 个副本：基德的宝藏（4 层）、威尼斯地下遗迹（5 层）、风暴之眼海域（5 层）。

#### 领域逻辑

新建 `src/game/domain/dungeon.ts`：

| 函数 | 说明 |
|------|------|
| `enterDungeon(world, dungeonId)` | 进入副本，校验等级/冷却/是否重复进入 |
| `advanceDungeonFloor(world, choice?)` | 推进一层，处理该层事件（战斗/宝箱/选择） |
| `completeDungeon(world)` | 通关结算，发放奖励，标记冷却 |
| `escapeDungeon(world)` | 中途退出，保留 50% 金币和全部物品 |
| `failDungeon(world)` | 战败处理，标记 failed |

#### 关联文件 ✅

| 模块 | 文件 | 说明 |
|------|------|------|
| 数据配置 | `src/data/dungeons.ts` | 3 个副本配置 |
| 领域逻辑 | `src/game/domain/dungeon.ts` | 副本纯函数 |
| 类型定义 | `src/game/domain/types.ts` | DungeonState |
| View Builder | `src/game/view-builder/buildGameView.ts` | buildDungeonView |
| 游戏视图 | `src/types/game-view.ts` | DungeonView / DungeonFloorEventView |
| Server Action | `src/app/actions/dungeon.ts` | **待实现** |
| UI 组件 | `src/components/DungeonPanel.tsx` | **待实现** |
| 路由页面 | `src/app/dungeon/page.tsx` | **待实现** |

### Phase 4.2：装备合成系统 ✅

在 Phase 3.1 物品系统基础上，引入铁匠铺合成——多件低阶装备合成高阶装备。

#### 数据配置

在 `src/data/items.ts` 中扩展合成配方（6 条配方，覆盖 normal→legendary）：

```typescript
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
```

#### 领域逻辑

新建 `src/game/domain/crafting.ts`：

| 函数 | 说明 |
|------|------|
| `craftEquipment(world, recipeId)` | 合成装备，校验材料/金币/港口/NPC 好感度 |
| `getAvailableRecipes(world)` | 获取当前港口可用的合成配方列表 |
| `getItemCount(inventory, itemId)` | 检查背包中某物品 ID 的总持有量 |

#### 关联文件

| 模块 | 文件 | 说明 |
|------|------|------|
| 数据配置 | `src/data/items.ts` | 6 条合成配方 |
| 领域逻辑 | `src/game/domain/crafting.ts` | 合成纯函数 |
| UI | `src/components/SmithPanel.tsx` | **待实现** |

### Phase 4.3：成就系统 ✅

轻量成就系统，记录玩家里程碑事件，提供额外的目标感和满足感。

#### 数据配置

新建 `src/data/achievements.ts`（15 个成就，覆盖航行/贸易/战斗/等级/收集五维度）：

| 字段 | 说明 |
|------|------|
| `id` | 唯一标识 |
| `name` | 成就名称 |
| `description` | 解锁条件描述 |
| `condition` | 条件类型与阈值 |
| `reward` | 奖励（金币/经验） |

#### 领域逻辑

计算型设计——成就解锁状态通过 World 数据现场推导：

```typescript
function getAchievementProgress(world: World): AchievementProgress[]
function claimAchievementReward(world: World, achievementId: string): World
```

#### 关联文件

| 模块 | 文件 | 说明 |
|------|------|------|
| 数据配置 | `src/data/achievements.ts` | 15 个成就配置 |
| 领域逻辑 | `src/game/domain/achievement.ts` | 进度计算、奖励发放 |
| View Builder | `src/game/view-builder/buildGameView.ts` | buildAchievementsView |
| 游戏视图 | `src/types/game-view.ts` | AchievementsView / AchievementItemView |
| 路由页面 | `src/app/achievements/page.tsx` | **待实现** |

### Phase 4.4：图鉴系统 ✅

被动记录玩家的港口访问、商品交易、船只拥有、装备收集历史，提供收集驱动力。

#### 设计

图鉴数据不依赖配置文件——直接从已有数据（`src/data/ports.ts`、`src/data/goods.ts`、`src/data/ships.ts`、`src/data/items.ts`）生成图鉴条目。

#### 领域逻辑

```typescript
function updateCollection(world: World): World   // 同步收集记录（待接入 Server Action）
function getCollectionProgress(world: World): CollectionProgress
```

#### 关联文件

| 模块 | 文件 | 说明 |
|------|------|------|
| 类型定义 | `src/game/domain/types.ts` | CollectionState（已接入 World） |
| 领域逻辑 | `src/game/domain/collection.ts` | updateCollection + getCollectionProgress |
| View Builder | `src/game/view-builder/buildGameView.ts` | buildCollectionView |
| 游戏视图 | `src/types/game-view.ts` | CollectionView / CollectionCategoryView |
| Server Action 集成 | — | `updateCollection` **尚未在任何 Server Action 中调用** |
| UI 路由页面 | `src/app/collection/page.tsx` | **待实现** |

---

## 依赖关系

```
Phase 4.1 (副本) ─── 依赖 Phase 3.2（人物战斗）+ Phase 3.1（物品系统）
Phase 4.2 (合成) ─── 依赖 Phase 3.1（物品系统）
Phase 4.3 (成就) ─── 独立
Phase 4.4 (图鉴) ─── 独立
```

---

## 完成标准

### 硬性条件（必须满足）

- [x] 副本系统：至少 3 个副本，覆盖 3-5 层结构，正确接入人物回合制战斗
- [x] 装备合成：至少 5 个配方，覆盖低阶→高阶装备
- [x] 成就系统：至少 10 个成就，覆盖各维度
- [x] 图鉴系统：被动记录港口/商品/船只/装备收集
- [x] `npx next build` 无错误
- [x] `bun run lint` 无 warning/error
- [x] 游戏引擎纯函数测试全部通过

### 质量条件（建议满足）

- [x] 副本有丰富的层内事件（不只有战斗，还有宝箱/选择/剧情）
- [x] 装备合成的产物值得玩家投入（属性显著提升）
- [x] 成就/图鉴给玩家明确的收集驱动力
- [ ] UI 无控制台报错（待 UI 组件实现后验证）

### 待完成项（后续迭代）

#### 副本系统

**Server Action** — `src/app/actions/dungeon.ts`（新建）

参考 `src/app/actions/combat.ts` 或 `src/app/actions/trade.ts` 的事务模式，实现以下操作：

| Action | 领域函数 | 说明 |
|--------|----------|------|
| `enterDungeon(dungeonId)` | `dungeon.enterDungeon(world, id)` | 校验等级/冷却/港口 → 初始化 DungeonState |
| `advanceFloor(choiceId?)` | `dungeon.advanceDungeonFloor(world, choice?)` | 推进一层，处理事件；combat 事件需先接人物战斗流程 |
| `completeDungeon()` | `dungeon.completeDungeon(world)` | 通关结算 → 发奖励 → 设冷却 → 清状态 |
| `escapeDungeon()` | `dungeon.escapeDungeon(world)` | 中途退出 → 保留 50% 金币 → 清状态 |
| `failDungeon()` | `dungeon.failDungeon(world)` | 战败 → 标记 failed → 清 combat |

**关键约束：**
- 每个操作必须在一个 `prisma.$transaction` 内完成（读 → 算 → 写）
- `advanceFloor` 遇到 `type: "combat"` 的事件时，需调用 `combat.initPersonCombat()` 进入人物战斗，
  玩家完成战斗后再次调用 `advanceFloor`（携带 combat 结果）继续推进
- 通关奖励中的物品通过 `player.gainItem()` 加入背包，金币加入 fleet.gold

**UI 组件** — `src/components/DungeonPanel.tsx`（新建）

| 视图 | 内容 |
|------|------|
| 入口列表 | 显示当前港口可进入的副本（等级/冷却校验提示） |
| 事件展示 | 根据 `currentEvent.type` 渲染：combat → 战斗界面接入 / treasure → 奖励展示 / choice → 选项按钮 |
| 进度条 | `currentFloor / totalFloors` |
| HP 损失累计 | `hpLoss` 显示 |
| 结算 | 通关/失败/退出结果展示 |

**路由页面** — `src/app/dungeon/page.tsx`（新建）

- 读取 `buildGameView.buildDungeonView()` 渲染
- 未进入副本时显示入口列表，副本中显示事件

---

#### 装备合成

**UI 组件** — `src/components/SmithPanel.tsx`（新建）

| 功能 | 说明 |
|------|------|
| 配方列表 | 调用 `crafting.getAvailableRecipes(world)` 获取当前港口可合成配方 |
| 材料检查 | 遍历 `recipe.ingredients`，与背包对比显示持有量/需要量（不足时标红） |
| 合成按钮 | 调用 `crafting.craftEquipment(world, recipeId)` 的 Server Action |
| 结果反馈 | 成功后产物加入背包提示；失败时显示对应错误消息 |

**Server Action** — 可在 `src/app/actions/equipment.ts` 中扩展或新建 `src/app/actions/crafting.ts`：

```typescript
export async function craftEquipment(recipeId: string) {
  return withTransaction(async (tx) => {
    const world = await loadWorld(tx);
    const newWorld = domainCraftEquipment(world, recipeId);
    await saveWorld(tx, newWorld);
    return { gameView: buildGameView(newWorld) };
  });
}
```

---

#### 成就系统

**路由页面** — `src/app/achievements/page.tsx`（新建）

- 调用 `buildGameView.buildAchievementsView(world)` 获取成就数据
- 渲染 15 个成就卡片，每项显示：
  - 名称/描述
  - 进度条（`progress / target`）
  - 解锁/已领取状态
  - 奖励（金币/经验）
  - 已解锁未领取的成就显示"领取奖励"按钮
- 顶部汇总：`已领取 N / 总数 15`

**Server Action** — `claimAchievement(achievementId)`：

```typescript
export async function claimAchievement(achievementId: string) {
  return withTransaction(async (tx) => {
    const world = await loadWorld(tx);
    const newWorld = domainClaimAchievementReward(world, achievementId);
    await saveWorld(tx, newWorld);
    return { gameView: buildGameView(newWorld) };
  });
}
```

---

#### 图鉴系统

**`updateCollection` 集成**

在所有写路径 Server Action 中，在 `saveWorld` 之前插入 `updateCollection`：

```typescript
// 在 trade.ts、travel.ts、combat.ts、quest.ts、equipment.ts 等每个
// 会改变港口/商品/船只/物品集合的 Action 中：
let world = computeNewWorld(...);
world = updateCollection(world);  // 同步收集记录
await saveWorld(tx, world);
```

涉及的 Server Action 清单：

| 文件 | 触发时机 | 同步的收集项 |
|------|----------|-------------|
| `trade.ts` | 买卖完成后 | tradedGoods |
| `travel.ts` | 到达新港口后 | visitedPorts |
| `equipment.ts` | 购买/出售装备后 | collectedItems |
| `ship/actions.ts` | 购买新船后 | ownedShips |
| `combat.ts` | 战利品获取后 | collectedItems |
| `quest.ts` | 任务奖励物品后 | collectedItems |
| `dungeon.ts`（待实现） | 副本通关奖励后 | collectedItems |

**路由页面** — `src/app/collection/page.tsx`（新建）

- 调用 `buildGameView.buildCollectionView(world)` 获取图鉴数据
- 渲染 4 个分类卡片（港口/商品/船只/物品），每个显示：
  - 分类名称 + 进度（`已收集 N / 总数 M`）
  - 条目列表（已收集高亮，未收集灰色/锁定样式）
