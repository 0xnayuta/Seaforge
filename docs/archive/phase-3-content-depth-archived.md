---
status: archived
last_verified: 2026-07-01
---

# Phase 3：内容深度（Content Depth）

---

## 目标

在 Phase 1 核心循环和 Phase 2 舰队/装备/船员系统完备的基础上，引入**任务驱动、战斗深度、称号系统**等纵向内容——让玩家拥有明确的短期目标和长期追求，而不只是无限跑商。

**核心命题：** 从「让玩家愿意跑 10 小时」进化到「让玩家有理由跑 100 小时」。

---

## 架构总览

### 分层（不变）

Phase 3 不改变 Clean Architecture Lite 的分层结构：

```
Server Action（入口）
  → loadWorld（读存档）
  → UseCase（纯函数计算）
  → saveWorld（写存档，同一事务）
  → View Builder（World → GameView）
  → 返回 GameView（客户端只渲染）
```

### World 类型扩展

```typescript
// Phase 2 World
interface World {
  readonly player: PlayerState;
  readonly fleet: FleetState;
  readonly market: MarketPriceState;
  readonly voyage: VoyageState | null;
}

// Phase 3 World — 新增 quests、titles 等字段
interface World {
  readonly player: PlayerState;
  readonly fleet: FleetState;
  readonly market: MarketPriceState;
  readonly voyage: VoyageState | null;
  readonly quests: readonly QuestState[];          // 3.1 新增
  readonly title: string | null;                   // 3.2 新增
  readonly titleBoard: readonly string[];          // 3.2 已解锁称号
}

interface QuestState {
  readonly id: string;
  readonly status: "active" | "completed";
  readonly progress: number;        // 当前进度
  readonly target: number;          // 目标值
}
```

### 关键设计决策

| 决策 | 说明 |
|------|------|
| 任务不依赖专属 NPC 实体 | 任务由「条件触发」或「港口菜单入口」实现，不引入 NPC 行走图 |
| 称号由条件推导 | 称号解锁状态可从 World 数据现场计算，不必须持久化 `unlockedTitles` |
| 战斗深度不重构现有结构 | 在 `combat.ts` 和 `voyage.ts` 基础上扩展，不破坏已稳定的接口 |
| 船员个体化为可选 | 3.5 为 stretch goal，如果复杂度超预期可降级为「命名 + 简单技能」 |

---

## 子阶段划分

### Phase 3.1：任务/剧情系统

在港口引入 NPC 任务，玩家接受任务 → 按条件完成 → 返回港口领取奖励。填补当前「无限跑商无目标」的体验缺口。

#### 数据配置

新建 `src/data/quests.ts`：

| 字段 | 说明 |
|------|------|
| `id` | 唯一标识 |
| `name` | 任务名称（如「泉州港的紧急订单」） |
| `description` | 任务描述文本 |
| `type` | `delivery`（送货）/ `collect`（收集）/ `bounty`（悬赏）/ `explore`（探索） |
| `requirement` | 完成条件（目标港口、商品ID、数量、等级门槛等） |
| `rewards` | 奖励（金币、经验、装备、船只等） |
| `issuerPortId` | 发布港口 |
| `prerequisiteQuestId` | 前置任务（用于任务链） |

#### 领域逻辑

新建 `src/game/domain/quest.ts`：

| 函数 | 说明 |
|------|------|
| `acceptQuest(world, questId)` | 接受任务，校验前置条件和等级，加入 `world.quests` |
| `checkQuestProgress(world)` | 遍历活跃任务，检查进度（抵达某港/持有某货物等） |
| `completeQuest(world, questId)` | 完成任务，发放奖励，标记完成 |
| `getAvailableQuests(world)` | 获取当前港口可接受的任务列表 |

#### World 类型变更

```typescript
interface World {
  // ... 现有字段
  readonly quests: readonly QuestState[];
}

interface QuestState {
  readonly id: string;
  readonly status: "active" | "completed";
  readonly progress: number;
  readonly target: number;
}
```

#### 关联文件

| 模块 | 文件 | 说明 |
|------|------|------|
| 数据配置 | `src/data/quests.ts` | 任务模板配置（新增） |
| 领域逻辑 | `src/game/domain/quest.ts` | 任务纯函数（新增） |
| 类型定义 | `src/game/domain/types.ts` | World 扩展 quests 字段；QuestState 类型 |
| View Builder | `src/game/view-builder/buildGameView.ts` | 新增任务列表/详情 view builder |
| 游戏视图 | `src/types/game-view.ts` | 新增 QuestView、QuestItemView 等 |
| Server Action | `src/app/actions/quest.ts` | acceptQuestAction / completeQuestAction（新增） |
| UI 组件 | `src/components/QuestPanel.tsx` | 任务列表+详情面板（新增） |
| 路由页面 | `src/app/quest/page.tsx` | 任务页面（新增） |
| 港口入口 | `src/app/HarborDashboard.tsx` | 港口页新增「任务」入口 |

#### UI 变更

| 页面 | 变更 |
|------|------|
| `/` 港口 | 新增「任务公告板」入口按钮（有活跃任务时显示标记） |
| 新增 `/quest` | 任务列表：可接受任务/进行中任务/已完成任务 |
| 任务详情弹窗 | 任务描述 → 进度 → 奖励预览 → 接受/完成按钮 |
| 航行日志 | 抵达目标港口时提示「有任务可提交」 |

#### 测试覆盖

| 范围 | 内容 |
|------|------|
| 单元测试 | 接受任务：校验前置条件/重复接受/等级门槛 |
| | 任务进度：抵达目标港/收集足够货物后进度推进 |
| | 完成任务：正确发放奖励，移除活跃任务 |
| | 任务链：前置未完成时拒绝接受后续任务 |
| View Builder | 给定带有任务状态的 World，输出正确视图 |

---

### Phase 3.2：称号系统

轻量级称号系统：玩家满足特定条件后解锁称号，称号提供小额属性加成，兼具成就展示价值。

#### 数据配置

新建 `src/data/titles.ts`：

| 字段 | 说明 |
|------|------|
| `id` | 唯一标识 |
| `name` | 称号名称（如「一夜暴富」「海盗克星」「太平洋主宰」） |
| `description` | 解锁条件描述 |
| `condition` | 条件类型与阈值（贸易总额 ≥ X / 航行里程 ≥ Y / 战斗胜利 ≥ Z） |
| `effects` | 属性加成（速度+2%、舱容+5 等，可选） |

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

#### 参考：称号列表（来自调研报告）

| 称号 | 条件（示意） | 加成（示意） |
|------|-------------|-------------|
| 初出茅庐 | 完成第一次航行 | 无 |
| 小有积蓄 | 累计贸易额 ≥ 10,000 | 舱容 +3 |
| 一夜暴富 | 单次利润 ≥ 5,000 | 速度 +2% |
| 海盗克星 | 战斗胜利 ≥ 10 次 | 防御 +5% |
| 太平洋主宰 | 航行里程 ≥ 10,000 海里 | 速度 +5% |
| 航海王 | 等级 ≥ 50 | 舱容 +10，速度 +3% |

> 具体数值在实现阶段平衡。

#### 关联文件

| 模块 | 文件 | 说明 |
|------|------|------|
| 数据配置 | `src/data/titles.ts` | 称号配置表（新增） |
| 领域逻辑 | `src/game/domain/title.ts` | 解锁检查、加成应用（新增） |
| 类型定义 | `src/game/domain/types.ts` | World 新增 `selectedTitle` |
| View Builder | `src/game/view-builder/buildGameView.ts` | 称号列表/当前称号输出 |
| 游戏视图 | `src/types/game-view.ts` | 称号相关视图类型 |
| UI | `src/components/` | 称号面板 UI（可集成到 `/` 状态栏或独立页面） |

#### UI 变更

| 页面 | 变更 |
|------|------|
| `/` 状态栏 | 当前称号显示（如「🏴 海盗克星」），点击查看详情 |
| 新增 `/titles` 或集成到 `/profile` | 称号列表：已解锁/未解锁，解锁条件进度 |

#### 测试覆盖

| 范围 | 内容 |
|------|------|
| 单元测试 | 各称号解锁条件正确触发 |
| | 选中称号后属性正确叠加到船只/玩家 |
| | 条件未满足时不解锁 |

---

### Phase 3.3：战斗深度增强

在 Phase 1.4 基础海盗碰撞 + Phase 2.4 船员加成 + Phase 2.5 装备加成基础上，为战斗增加策略选择和多回合战报。

#### 功能

| 功能 | 说明 |
|------|------|
| 交战前选择 | 遭遇海盗时可选「迎战」「逃跑」「谈判」（支付买路钱） |
| 逃跑判定 | 逃跑概率 = 基础 70% + 船只速度加成 - 海盗强度系数 |
| 谈判支付 | 支付海盗要求的金币（当前货物价值的 10%-30%）换取安全通过 |
| 战报增强 | 分回合展示战斗过程：炮击 → 接舷 → 胜负判定 |
| 炮击类型差异 | 不同装备产生不同炮击描述（链弹/葡萄弹/实心弹） |

#### 领域逻辑

```typescript
// 在 combat.ts 中扩展
function resolveEncounter(
  world: World,
  choice: "fight" | "flee" | "bribe",
  difficulty: number,
): CombatOutcome {
  // fight → 现有 resolveCombat 逻辑
  // flee → 概率判定，失败则强制战斗
  // bribe → 扣除金币，事件结束
}

// 战报增强
interface CombatRoundLog {
  readonly round: number;
  readonly action: string;    // 描述文本
  readonly damage: number;
  readonly hpRemaining: number;
}
```

#### 关联文件

| 模块 | 文件 | 说明 |
|------|------|------|
| 领域逻辑 | `src/game/domain/combat.ts` | 扩展 `resolveCombat`，新增选择分支 |
| 领域逻辑 | `src/game/domain/voyage.ts` | 事件触发时传递选择结果 |
| 数据配置 | `src/data/events.ts` | 海盗事件增加 `bribeCost`、`escapeDifficulty` |
| View Builder | `src/game/view-builder/buildGameView.ts` | 战报视图扩展多回合结构 |
| 游戏视图 | `src/types/game-view.ts` | `CombatLogEntryView` 扩展 |
| UI | `src/components/VoyageScreen.tsx` | 增加交战选择交互（弹窗三选一） |

#### UI 变更

| 页面 | 变更 |
|------|------|
| `/voyage` 航行中 | 遭遇海盗时弹出选择界面（迎战 / 逃跑 / 谈判），显示各选项成功率 |
| 战报展示 | 多回合展开式战报，每回合独立描述 |

#### 测试覆盖

| 范围 | 内容 |
|------|------|
| 单元测试 | 逃跑概率计算正确性 |
| | 谈判扣金逻辑 |
| | 逃跑失败后进入正常战斗流程 |
| | 各选择分支对 World 的影响符合预期 |

---

### Phase 3.4：船队热切换

允许玩家在航行过程中更换编队船只，而非只能在港口决定编队。

#### 功能

| 功能 | 说明 |
|------|------|
| 航海中编队调整 | 在 `/voyage` 页面新增「编队管理」入口 |
| 切换限制 | 航行中不可将已装载货物的船移出编队 |
| 切换消耗 | 切换编队消耗额外 1 天航行时间和少量金币 |
| 即时影响 | 切换后，航行消耗/生存率/战斗力重新计算 |

#### 关联文件

| 模块 | 文件 | 说明 |
|------|------|------|
| 领域逻辑 | `src/game/domain/navigation.ts` | 新增 `adjustFleetDuringVoyage` |
| 领域逻辑 | `src/game/domain/voyage.ts` | `VoyageState` 扩展或新增切换逻辑 |
| View Builder | `src/game/view-builder/buildGameView.ts` | 编队切换视图 |
| UI | `src/components/VoyageScreen.tsx` | 编队管理弹窗 |

---

### Phase 3.5：船员个体化（Stretch Goal）

当前船员为抽象资源池（只有数量，没有个体）。本子阶段为每条船员赋予身份和成长。

> 如果复杂度超预期或与 Phase 3.1-3.4 冲突，此子阶段可降级或推迟到 Phase 4。

#### 功能

| 功能 | 说明 |
|------|------|
| 船员命名 | 招募时生成随机姓名，船员列表显示每个船员的姓名和状态 |
| 船员技能 | 每个船员拥有 1 个随机技能（如「操帆」「炮术」「医术」），影响对应属性 |
| 船员成长 | 航行/战斗中获得经验，升级提升技能效果 |
| 船员伤亡 | 战斗或风暴中个体船员可能阵亡，阵亡后需补充 |
| 船员忠诚度 | 长期不發薪或频繁战败导致忠诚度下降，下降至 0 船员逃跑 |

#### 关联文件

| 模块 | 文件 | 说明 |
|------|------|------|
| 类型定义 | `src/game/domain/types.ts` | 新增 `CrewMember` 类型 |
| 领域逻辑 | `src/game/domain/crew.ts` | `hireCrew` 改为生成个体船员 |
| 数据配置 | `src/data/formulas.ts` | 技能权重、成长曲线 |
| View Builder / UI | 船员列表页面 | 查看/管理个体船员 |

---

## 依赖关系

```
Phase 3.1 (任务系统) ─── 独立，可直接开始
Phase 3.2 (称号系统) ─── 独立，可直接开始
Phase 3.3 (战斗深度) ─── 依赖 Phase 1.4 + Phase 2.4/2.5（已就绪）
                            │
                   ┌────────┘
Phase 3.4 (热切换) ─── 依赖 Phase 3.3（可选）
                       
Phase 3.5 (船员个体化) ─── 独立，可先于 3.3/3.4 开始；Stretch Goal
```

**推荐执行顺序：** 3.1 + 3.2（并行，两队可同时开工）→ 3.3 → 3.4（可选）→ 3.5（Stretch）

---

## 暂不实现（Phase 3 范围外）

| 功能 | 备注 | 预计 Phase |
|------|------|-----------|
| 探宝/副本系统 | 港口专属副本、藏宝图 | Phase 4 |
| 装备合成 | 铁匠铺多件合成高阶装备 | Phase 4 |
| 成就系统 | 里程碑成就 | Phase 4 |
| 图鉴系统 | 港口/商品/船只收集 | Phase 4 |
| 音效/音乐 | 背景音乐 + 交互音效 | Phase 4 |
| 房屋系统 | 玩家住宅 | Phase 5 |
| 宠物系统 | 辅助战斗 | Phase 5 |
| MOD 支持 | 外部扩展 | Phase 5 |
| 图形化世界地图 | 当前文字列表，符合定位 | 低优先级 |
| 社交系统（帮会/师徒/结婚） | 单机版不计划 | 不计划 |
| PK/玩家劫掠 | 单机版不计划 | 不计划 |
| Zustand | 当前架构不需要 | 见 Phase 1 条件 |

---

## 完成标准

### 硬性条件（必须满足）

- [ ] 任务系统：至少 10 个可接受任务，覆盖送货/收集/悬赏/探索四类型
- [ ] 任务链：至少一条 3 任务以上的连续任务链
- [ ] 称号系统：至少 8 个可解锁称号，各带属性加成
- [ ] 战斗深度：交战前可选择迎战/逃跑/谈判，各有实际效果
- [ ] 战报增强：分多回合展示，含炮击类型差异描述
- [ ] 船队热切换（如实现）：航海中可调整编队，切换后重新计算消耗和战斗力
- [ ] 船员个体化（如实现）：个体船员姓名/技能/成长/伤亡
- [ ] `npx next build` 无错误
- [ ] `bun run lint` 无 warning/error
- [ ] 游戏引擎纯函数测试全部通过

### 质量条件（建议满足）

- [ ] 任务奖励曲线合理：不出现低等级任务奖励远超跑商收益
- [ ] 称号条件多样：覆盖贸易/航行/战斗/等级四个维度
- [ ] 战斗选择有意义：三种选择在不同场景下各有优劣势，不存在永远最优解
- [ ] UI 无控制台报错
- [ ] 存档向前兼容：Phase 2 存档可在 Phase 3 加载运行

---

## 参考文档

| 主题 | 文档 |
|------|------|
| 原版游戏调研 | `docs/reference/deep-research-report.md` |
| Phase 1 完整路线图 | `docs/roadmap/phase-1-mvp.md` |
| Phase 2 完整路线图 | `docs/roadmap/phase-2-system-depth.md` |
| 原版游戏称号/任务描述 | `docs/reference/deep-research-report.md` §7.4（称号）、§1.7（港口任务） |
| World 定义 | `docs/specifications/world-definition.md` |
| Clean Architecture 分层 | `docs/architecture/clean-architecture-lite.md` |
| 数据流 | `docs/architecture/data-flow.md` |
| 状态管理 | `docs/guides/state-management.md` |
| 架构宪法 | `AGENTS.md` |
