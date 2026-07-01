---
status: draft
last_verified: 2026-07-01
---

# Phase 4：内容深度（Content Depth）

---

## 目标

在 Phase 3 的 RPG 底层（人物/装备/战斗/NPC/任务）完备后，引入**称号系统、副本系统、装备合成、成就系统、图鉴系统**等纵向内容。此阶段的主题是"用 Phase 3 搭建的 RPG 框架填充可玩内容"。

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

### Phase 4.1：称号系统

轻量级称号系统：玩家满足特定条件后解锁称号，称号提供小额属性加成，兼具成就展示价值。

#### 数据配置

新建 `src/data/titles.ts`：

| 字段 | 说明 |
|------|------|
| `id` | 唯一标识 |
| `name` | 称号名称（如「一夜暴富」「海盗克星」「太平洋主宰」） |
| `description` | 解锁条件描述 |
| `condition` | 条件类型与阈值（贸易总额 ≥ X / 航行里程 ≥ Y / 战斗胜利 ≥ Z / 等级 ≥ N） |
| `effects` | 属性加成（SPD +2、EquipLoad +5 等，加成作用于人物面板或舰队属性） |

#### 领域逻辑

计算型设计——称号解锁状态不必须持久化，在 View Builder 中从 World 数据现场推导：

| 函数 | 说明 |
|------|------|
| `getUnlockedTitles(world)` | 遍历称号配置，返回当前已满足条件的称号列表 |
| `applyTitleEffects(world, titleId)` | 应用选中称号的属性加成 |

#### World 类型变更

```typescript
interface World {
  // ... 现有字段
  readonly selectedTitle: string | null;  // 玩家选中的称号 ID
}
```

#### 参考：称号列表（示意）

| 称号 | 条件（示意） | 加成（示意） |
|------|-------------|-------------|
| 初出茅庐 | 完成第一次航行 | 无 |
| 小有积蓄 | 累计贸易额 ≥ 10,000 | EquipLoad +3 |
| 一夜暴富 | 单次利润 ≥ 5,000 | SPD +2% |
| 海盗克星 | 战斗胜利 ≥ 10 次 | DEF +5% |
| 太平洋主宰 | 航行里程 ≥ 10,000 海里 | SPD +5% |
| 航海王 | 等级 ≥ 50 | EquipLoad +10，SPD +3% |

#### 关联文件

| 模块 | 文件 | 说明 |
|------|------|------|
| 数据配置 | `src/data/titles.ts`（新增） | 称号配置表 |
| 领域逻辑 | `src/game/domain/title.ts`（新增） | 解锁检查、加成应用 |
| 类型定义 | `src/game/domain/types.ts` | World 新增 `selectedTitle` |
| View Builder | `src/game/view-builder/buildGameView.ts` | 称号列表/当前称号输出 |
| 游戏视图 | `src/types/game-view.ts` | 称号相关视图类型 |
| UI | `src/components/TitlePanel.tsx`（新增） | 称号面板（可集成到港口状态栏或独立页面） |

#### 测试覆盖

| 范围 | 内容 |
|------|------|
| 单元测试 | 各称号解锁条件正确触发 |
| | 选中称号后属性正确叠加到人物面板 |
| | 条件未满足时不解锁 |

---

### Phase 4.2：副本系统

为港口引入专属副本入口，玩家进入副本后经历序列化事件（多场回合制战斗/多个选择）并获得奖励。

#### 前置依赖

- Phase 3.2 回合制人物战斗 ✅（副本内战斗使用人物回合制系统）
- Phase 3.1 物品系统 ✅（副本奖励为物品/装备）

#### 数据配置

新建 `src/data/dungeons.ts`：

| 字段 | 说明 |
|------|------|
| `id` | 唯一标识 |
| `name` | 副本名称（如「基德的宝藏」「威尼斯地下遗迹」） |
| `entryPortId` | 入口港口 |
| `floors` | 层数（3-5 层），每层包含事件/战斗配置 |
| `levelRequirement` | 进入等级要求 |
| `statRecommendation` | 推荐属性值（提示玩家属性是否足够） |
| `rewards` | 通关奖励（金币、装备、材料、称号） |
| `cooldownDays` | 冷却天数（通关后可再次进入） |

#### 领域逻辑

新建 `src/game/domain/dungeon.ts`：

| 函数 | 说明 |
|------|------|
| `enterDungeon(world, dungeonId)` | 进入副本，校验等级/冷却/是否重复进入 |
| `advanceDungeonFloor(world, choice)` | 推进一层，处理该层事件（战斗/宝箱/选择） |
| `completeDungeon(world)` | 通关结算，发放奖励，标记冷却 |
| `escapeDungeon(world)` | 中途退出，部分奖励保留 |

#### World 类型

```typescript
interface DungeonState {
  readonly dungeonId: string;
  readonly currentFloor: number;
  readonly totalFloors: number;
  readonly hpLoss: number;              // 已损失生命值（人物）
  readonly goldGained: number;
  readonly itemsGained: readonly string[];  // 已获得物品 UID 列表
  readonly status: "in_progress" | "cleared" | "failed" | "escaped";
}
```

#### 关联文件

| 模块 | 文件 | 说明 |
|------|------|------|
| 数据配置 | `src/data/dungeons.ts`（新增） | 副本模板配置 |
| 领域逻辑 | `src/game/domain/dungeon.ts`（新增） | 副本纯函数 |
| 类型定义 | `src/game/domain/types.ts` | World 扩展 dungeon 字段 |
| View Builder | `src/game/view-builder/buildGameView.ts` | 副本视图 |
| 游戏视图 | `src/types/game-view.ts` | 新增 DungeonView |
| Server Action | `src/app/actions/dungeon.ts`（新增） | 副本操作 |
| UI 组件 | `src/components/DungeonPanel.tsx`（新增） | 副本入口/战斗/结算界面 |
| 路由页面 | `src/app/dungeon/page.tsx`（新增） | 副本页面 |

#### 测试覆盖

| 范围 | 内容 |
|------|------|
| 单元测试 | 进入副本校验（等级/冷却） |
| | 副本层数推进各事件处理 |
| | 中途退出 vs 通关奖励差异 |
| | 副本战斗接入人物回合制系统 |

---

### Phase 4.3：装备合成系统

在 Phase 3.1 物品系统基础上，引入铁匠铺合成——多件低阶装备合成高阶装备。

#### 前置依赖

- Phase 3.1 物品系统 ✅（背包/装备/材料）

#### 数据配置

在 `src/data/items.ts` 中扩展合成配方：

```typescript
interface EquipmentRecipe {
  readonly resultId: string;       // 合成产物装备 ID
  readonly ingredients: ItemIngredient[];  // 所需材料 [{itemId, quantity}]
  readonly goldCost: number;       // 额外金币消耗
  readonly portId: string;         // 可合成的港口
  readonly minAffinity?: string;   // 可选：需要某 NPC 好感度 ≥ N
}
```

#### 领域逻辑

在 `src/game/domain/equipment.ts` 中扩展（或新建 `src/game/domain/crafting.ts`）：

| 函数 | 说明 |
|------|------|
| `craftEquipment(world, recipeId)` | 合成装备，校验材料/金币/港口/NPC 好感度，产出新装备加入背包 |
| `getAvailableRecipes(world)` | 获取当前港口可用的合成配方列表 |

#### 关联文件

| 模块 | 文件 | 说明 |
|------|------|------|
| 数据配置 | `src/data/items.ts` | 扩展 recipe 字段 |
| 领域逻辑 | `src/game/domain/crafting.ts`（新增） | 合成纯函数 |
| UI | `src/components/SmithPanel.tsx`（新增） | 铁匠铺合成界面 |

#### 测试覆盖

| 范围 | 内容 |
|------|------|
| 单元测试 | 合成成功：材料消耗、金币扣除、产物加入背包 |
| | 材料不足拒绝合成 |
| | 金币不够拒绝合成 |
| | 不在正确港口拒绝合成 |
| | NPC 好感度不满足拒绝合成 |

---

### Phase 4.4：成就系统

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
| 数据配置 | `src/data/achievements.ts`（新增） | 成就配置表 |
| 领域逻辑 | `src/game/domain/achievement.ts`（新增） | 进度计算、奖励发放 |
| View Builder / UI | 成就页面 | 成就列表 + 进度条 |

---

### Phase 4.5：图鉴系统

被动记录玩家的港口访问、商品交易、船只拥有、装备收集历史，提供收集驱动力。

#### 设计

图鉴数据不依赖配置文件——直接从已有数据（`src/data/ports.ts`、`src/data/goods.ts`、`src/data/ships.ts`、`src/data/items.ts`）生成图鉴条目。

#### World 类型

```typescript
interface CollectionState {
  readonly visitedPorts: readonly string[];
  readonly tradedGoods: readonly string[];
  readonly ownedShips: readonly string[];
  readonly collectedItems: readonly string[];    // 已获得的物品 ID（非 uid）
}

// 在 World 中新增
readonly collection: CollectionState;
```

#### 领域逻辑

```typescript
function updateCollection(world: World): World {
  // 在每次 Server Action 后顺便更新收集记录
  // 检查当前世界状态 vs 已有记录，补充新收集项
}
```

#### 关联文件

| 模块 | 文件 | 说明 |
|------|------|------|
| 类型定义 | `src/game/domain/types.ts` | World 新增 `collection` 字段 |
| 领域逻辑 | `src/game/domain/collection.ts`（新增） | 图鉴记录更新 |
| UI | 新增 `/collection` 页面 | 图鉴展示 |

---

## 依赖关系

```
Phase 4.1 (称号) ─── 独立
Phase 4.2 (副本) ─── 依赖 Phase 3.2（人物战斗）+ Phase 3.1（物品系统）
Phase 4.3 (合成) ─── 依赖 Phase 3.1（物品系统）
Phase 4.4 (成就) ─── 独立
Phase 4.5 (图鉴) ─── 独立
```

**推荐执行顺序：** 4.1 + 4.4 + 4.5（并行，数据配置为主）→ 4.2 → 4.3（需要 4.2 的掉落填充材料池）

---

## 完成标准

### 硬性条件（必须满足）

- [ ] 称号系统：至少 8 个可解锁称号，各带属性加成
- [ ] 副本系统：至少 3 个副本，覆盖 3-5 层结构，正确接入人物回合制战斗
- [ ] 装备合成：至少 5 个配方，覆盖低阶→高阶装备
- [ ] 成就系统：至少 10 个成就，覆盖各维度
- [ ] 图鉴系统：被动记录港口/商品/船只/装备收集
- [ ] `npx next build` 无错误
- [ ] `bun run lint` 无 warning/error
- [ ] 游戏引擎纯函数测试全部通过

### 质量条件（建议满足）

- [ ] 副本有丰富的层内事件（不只有战斗，还有宝箱/选择/剧情）
- [ ] 装备合成的产物值得玩家投入（属性显著提升）
- [ ] 成就/图鉴给玩家明确的收集驱动力
- [ ] UI 无控制台报错
