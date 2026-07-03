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

### Phase 4.1：副本系统 ⚠️ 领域层完成，缺 Server Action + UI

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
- [ ] Server Action：`src/app/actions/dungeon.ts`
- [ ] UI 组件：`src/components/DungeonPanel.tsx`
- [ ] 路由页面：`src/app/dungeon/page.tsx`

#### 装备合成
- [ ] UI 组件：`src/components/SmithPanel.tsx`

#### 成就系统
- [ ] 路由页面：`src/app/achievements/page.tsx`

#### 图鉴系统
- [ ] `updateCollection` 接入各 Server Action 的写操作流程
- [ ] 路由页面：`src/app/collection/page.tsx`
