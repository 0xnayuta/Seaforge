---
status: draft
last_verified: 2026-07-01
---

# Phase 3：RPG 底层（RPG Foundation）

---

## 目标

在 Phase 1（贸易循环）和 Phase 2（舰队/船舶系统）的基础上，引入 RPG 核心基础设施——人物属性系统、物品/装备系统、回合制战斗、NPC 与任务系统。这是 Seaforge 从「贸易经营游戏」转向「航海 RPG」的转型阶段。

**核心命题：** 建立所有 RPG 玩法所需的底层能力（人物数值、物品体系、战斗系统、NPC 框架），使后续 Phase 4/5 的内容层可以建立在稳定的 RPG 根基之上。

---

## 架构总览

### 分层（不变）

Phase 3 不改变 Clean Architecture Lite 的分层结构。所有新增系统遵循 Server Action → Domain 纯函数 → View Builder → UI 的标准数据流。

### 跨子阶段的依赖关系

```
Phase 3.0（Pre）清理
  │
  ▼
Phase 3.1（迭代 A）：人物底层 + 物品底层 ← 基石，所有后续依赖它
  │
  ├──→ Phase 3.2（迭代 B）：回合制人物战斗 ← 依赖 3.1
  │         │
  │         └──→ 接舷战事件链（航海事件扩展）← 依赖 3.2
  │
  ├──→ Phase 3.3（迭代 C）：NPC 系统 + 任务系统 ← 依赖 3.1
  │
  └──→ Phase 3.4：称号系统（独立）
```

---

## 子阶段划分

---

### Phase 3.0：Pre-phase 清理（基础设施准备）

在开始新系统前，清理不再适用的遗留逻辑。

#### 工作内容

| 模块 | 文件 | 变更 |
|------|------|------|
| 项目定位 | `docs/specifications/project-positioning.md` | 更新为双轴循环 RPG 定位 |
| 开发约束 | `AGENTS.md` | 更新项目类型、非目标、附录 |
| README | `README.md` | 更新项目类型、状态、文档索引 |
| 旧存档迁移 | `src/lib/repository.ts` | 移除 Phase 1→2 的旧存档迁移逻辑（不再需要向后兼容） |

---

### Phase 3.1（迭代 A）：人物底层 + 物品底层

#### 人物属性系统

##### 设计原则

采用混合方案：ER 式核心属性（升级自选加点） + BS 式面板数值（计算结果）。

| 层级 | 内容 | 来源 |
|------|------|------|
| 核心属性 | STR / DEX / INT / FTH / ARC | 升级每级 +3 点，玩家自选分配 |
| 面板数值 | HP / ATK / DEF / MAG / MDF / SPD / LUK / EquipLoad | 由核心属性 + 等级 + 装备计算得出 |

##### 面板计算公式

```
HP        = 80 + Level × 8 + STR × 4 + (DEX + INT + FTH + ARC) × 1
ATK       = 8 + STR × 2.0 + DEX × 0.5
DEF       = 5 + STR × 0.8 + DEX × 0.4
MAG       = 5 + INT × 2.0 + FTH × 0.5
MDF       = 5 + INT × 0.6 + FTH × 1.0
SPD       = 8 + DEX × 1.5
LUK       = 5 + ARC × 2.0
EquipLoad = 15 + STR × 2.5
```

所有面板 = 基础值（公式） + 装备加成 + 属性补正。

##### 软上限（Soft Caps）

| 区间 | 实际收益 |
|------|---------|
| 1-20 | 100%（每点全效） |
| 21-40 | 75% |
| 41-60 | 50% |
| 61-80 | 25% |
| 81+ | 10% |

##### 升级收益

每级 HP +8 基础成长，外加 3 点可分配核心属性。

```
等级范围：1-199
每级点数：3
满级可用总点数：594
```

##### 属性 → 游戏功能映射

| 属性 | 主要影响 | 次要影响 |
|------|---------|---------|
| STR | ATK、EquipLoad | 重型武器门槛、接舷战伤害 |
| DEX | SPD、ATK（轻武器） | 暴击率、命中率、闪避率 |
| INT | MAG | 特殊炮弹效果、知识类交互判定 |
| FTH | MDF、buff 强度 | NPC 好感增益幅度、士气恢复 |
| ARC | LUK | 掉落率、交易砍价、稀有事件触发 |

##### 属性补正（装备 Attribute Scaling）

| 品质 | 补正系数 |
|------|---------|
| 普通 (无补正) | 0% |
| 良 | 25% |
| 优秀 | 50% |
| 稀有 | 75% |
| 传说 | 100% |

##### Pokemon 战斗公式草案（人物回合制）

```
伤害 = ATK × 技能倍率 × (1 + 随机 ±10%) - DEF × 0.4
暴击率 = 5% + DEX × 0.15%
暴击伤害 = 伤害 × 1.5
命中率 = 85% + DEX × 0.1%
闪避率 = 5% + DEX × 0.08%
行动顺序：SPD 高的先手；SPD 差 > 20 时低速方可能少行动一次
```

#### 物品/装备系统

##### 人物装备栏（初始精简版）

| 栏位 | 说明 |
|------|------|
| 主手武器 | 核心武器位 |
| 铠甲（躯干） | 主要防具 |
| 饰品 ×2 | 戒指/项链类 |

未来扩展：副手武器、头盔、臂甲、腿甲、饰品 ×3。

##### 物品大类

| 类别 | 说明 | 堆叠 |
|------|------|------|
| 装备 | 武器/防具/饰品，可穿戴至装备栏 | 否（单件实例） |
| 消耗品 | 药水/食物/卷轴，使用后消耗 | 是 |
| 材料 | 锻造/合成原料 | 是 |
| 任务物品 | 关键物品，不可丢弃/出售 | 否 |
| 船只装备 | 独立体系，存放于船只装备槽，不入人物背包 | 否 |

##### inventory 重构

```typescript
interface ItemInstance {
  readonly uid: string;                 // 唯一 ID（uuid）
  readonly itemId: string;              // 配置 ID（对应 items.ts）
  readonly quantity: number;            // 数量（消耗品/材料）
  readonly durability?: number;         // 当前耐久（装备专用）
  readonly maxDurability?: number;      // 耐久上限（装备专用）
  readonly upgradeLevel?: number;       // 强化等级（装备专用）
  readonly affixes?: readonly string[]; // 词缀 ID 列表（预留）
  readonly equippedSlot?: string;       // 已装备时标记装备位名称
}
```

##### 船只装备隔离

船只装备（sail/cannon/armor/figurehead/special）完全独立于人物物品体系：
- 存放在 `ShipInstance` 的装备槽中
- 不可放入人物背包
- 可考虑占用船只舱位容量（形成"武装 vs 货舱"的策略选择）

##### 关联文件

| 模块 | 文件 | 变更 |
|------|------|------|
| 类型定义 | `src/game/domain/types.ts` | PlayerState 扩展核心属性 + 面板 + 装备栏；新增 ItemInstance 类型；FleetState.inventory 类型变更 |
| 领域逻辑 | `src/game/domain/player.ts` | levelUp 增加属性点分配；新增 calcPanelStats 纯函数；新增 equipItem / unequipItem |
| 数据公式 | `src/data/formulas.ts` | 新增属性成长曲线常量、软上限表、补正系数表 |
| 数据配置 | `src/data/items.ts`（新增） | 初始 ~20 件物品配置（武器 + 铠甲 + 饰品） |
| 游戏视图 | `src/types/game-view.ts` | 新增 CharacterView、InventoryView、ItemView |
| View Builder | `src/game/view-builder/` | 人物面板、背包转换 |
| Server Action | `src/app/actions/character.ts`（新增） | 加点/装备/卸下操作 |

##### 测试覆盖

| 范围 | 内容 |
|------|------|
| 单元测试 | 属性计算公式验证（各级别、各配点方案） |
| | 升级加点正确应用 |
| | 装备穿戴/卸下影响面板数值 |
| | 装备属性补正计算 |
| | 软上限衰减正确 |
| | 背包物品添加/移除/堆叠 |

---

### Phase 3.2（迭代 B）：回合制人物战斗

#### 功能

| 功能 | 说明 |
|------|------|
| 回合制人物战斗 | 基于 SPD 决定行动顺序，ATK/DEF/MAG/MDF 结算伤害 |
| 技能系统 | 武器绑定技能（类似 BS：每把武器独立技能），升级解锁新技能 |
| 回避 & 弹反 | 消耗 MP 的特殊动作：回避（免疫大部分攻击）、弹反（物理反击） |
| 状态异常 | 中毒/出血/燃烧/冰冻/睡眠/沉默/暗闇七种异常状态 |
| 接舷战 | 舰队战失败后可选择进入人物回合制战斗（海盗登船） |
| 多队友 | NPC 可加入战斗队列（类似 BS 的队友系统） |

#### 领域逻辑

新建 `src/game/domain/combat-person.ts`：

| 函数 | 说明 |
|------|------|
| `resolvePersonCombat(world, party, enemies, choices)` | 执行完整回合制战斗，返回战斗结果和新 World |
| `calcPersonDamage(attacker, defender, skill)` | 计算单次伤害（含属性补正、暴击、闪避） |
| `calcInitiative(party, enemies)` | 计算行动顺序 |

#### 接舷战事件扩展

在 `src/game/domain/voyage.ts` 的 `applyVoyageEvents` 中，海盗事件扩展为：

```
舰队炮击战
  ├── 胜利 → 获得战利品，继续航行
  ├── 失败 → 可选择投降（损失货物）或接舷战（进入人物战斗）
  │         ├── 接舷战胜利 → 击退海盗，保留货物
  │         └── 接舷战失败 → 损失货物+金币，遣返最近港口
  └── 低概率直接触发海盗登船事件 → 进入人物战斗
```

#### 关联文件

| 模块 | 文件 | 变更 |
|------|------|------|
| 领域逻辑 | `src/game/domain/combat-person.ts`（新增） | 人物回合制战斗纯函数 |
| 领域逻辑 | `src/game/domain/voyage.ts` | 海盗事件分支接入接舷战 |
| 领域逻辑 | `src/game/domain/combat.ts` | 保留（仅用于舰队炮击战） |
| 数据配置 | `src/data/skills.ts`（新增） | 武器技能配置表 |
| 数据配置 | `src/data/items.ts` | 扩展武器技能绑定字段 |
| 游戏视图 | `src/types/game-view.ts` | 新增 PersonCombatView、SkillView |
| View Builder | `src/game/view-builder/` | 人物战斗视图 |
| Server Action | `src/app/actions/combat.ts`（新增） | 战斗操作 |
| UI 组件 | `src/components/CombatPanel.tsx`（新增） | 回合制战斗 UI |

#### 测试覆盖

| 范围 | 内容 |
|------|------|
| 单元测试 | 伤害计算公式各分支（属性差、等级差、暴击、闪避） |
| | 行动顺序计算（多种 SPD 配置） |
| | 回避/弹反效果 |
| | 接舷战完整流程（舰队战→人物战→结果） |
| | 武器技能效果 |

---

### Phase 3.3（迭代 C）：NPC 系统 + 任务系统

#### NPC 系统

#### 设计

NPC 是有名有姓的独立角色，分布在港口，可以与玩家交互（对话、交易、招募、送礼）。

首批 NPC = 可招募为船长的角色（船长数量决定 `maxShips`）。

#### 数据配置

新建 `src/data/npcs.ts`：

| 字段 | 说明 |
|------|------|
| `id` | 唯一标识 |
| `name` | NPC 名称 |
| `portId` | 所在港口 |
| `type` | 类型（captain/merchant/questGiver/blacksmith） |
| `dialogText` | 初始对话文本 |
| `questIds` | 可提供的任务 ID 列表 |
| `giftPreferences` | 喜好物品 ID 列表（用于好感度） |
| `recruitable` | 是否可招募为船长 |
| `recruitCondition` | 招募条件（好感度等级/任务完成/金币等） |
| `stats` | NPC 自身属性（用于加入战斗队列时） |

#### World 类型

```typescript
interface NpcRelationState {
  readonly affinity: number;           // 好感度 0-100
  readonly recruited: boolean;         // 是否已招募为船长
  readonly dialogPhase: number;        // 对话阶段
  readonly completedQuests: string[];  // 已完成的任务 ID
}

// 在 World 中新增
readonly npcRelations: Record<string, NpcRelationState>;
```

#### 领域逻辑

新建 `src/game/domain/npc.ts`：

| 函数 | 说明 |
|------|------|
| `talkToNpc(world, npcId)` | 对话，推进对话阶段 |
| `giveGift(world, npcId, itemUid)` | 送礼，增加好感度 |
| `recruitNpc(world, npcId)` | 招募 NPC 为船长，增加 maxShips |
| `getAvailableNpcQuests(world, npcId)` | 按好感度筛选可用任务 |
| `calcMaxShips(world)` | 从已招募船长数计算 maxShips |

#### 任务系统

#### 设计

在 Phase 3.1 文档基础上调整——任务系统现在接入 NPC 好感度门槛和人物装备/物品奖励。

#### 数据配置

`src/data/quests.ts`：

| 字段 | 说明 |
|------|------|
| `id` | 唯一标识 |
| `name` | 任务名称 |
| `description` | 任务描述 |
| `type` | delivery / collect / bounty / explore |
| `requirement` | 完成条件（目标港口、物品 ID、数量、属性门槛、好感度门槛） |
| `rewards` | 奖励（金币、经验、装备（物品 ID）、船只、称号） |
| `issuerPortId` | 发布港口 |
| `issuerNpcId` | 发布 NPC（对应 npcs.ts） |
| `prerequisiteQuestId` | 前置任务 ID |
| `minAffinity` | 所需 NPC 好感度 |

#### 领域逻辑

`src/game/domain/quest.ts`（同上，但奖励和需求接入新物品系统和 NPC 系统）：

| 函数 | 说明 |
|------|------|
| `acceptQuest(world, questId)` | 接受任务，校验前置条件/等级/好感度 |
| `checkQuestProgress(world)` | 遍历活跃任务检查进度 |
| `completeQuest(world, questId)` | 完成任务，发放奖励（支持物品） |
| `getAvailableQuests(world)` | 获取当前港口可接受的任务列表 |

#### 关联文件

| 模块 | 文件 | 变更 |
|------|------|------|
| 数据配置 | `src/data/npcs.ts`（新增） | NPC 配置 |
| 数据配置 | `src/data/quests.ts`（新增） | 任务配置 |
| 领域逻辑 | `src/game/domain/npc.ts`（新增） | NPC 纯函数 |
| 领域逻辑 | `src/game/domain/quest.ts`（新增） | 任务纯函数 |
| 类型定义 | `src/game/domain/types.ts` | World 扩展 npcRelations、quests 字段 |
| 领域逻辑 | `src/game/domain/ship.ts` | calcMaxShips 改为从 NPC 系统读取 |
| View Builder / UI / Server Action | 对应新增 | NPC 交互 + 任务系统完整链路 |

#### 测试覆盖

| 范围 | 内容 |
|------|------|
| 单元测试 | NPC 对话阶段推进 |
| | 送礼/好感度增减 |
| | 招募条件校验（好感度/任务/金币） |
| | maxShips 与已招募船长数同步 |
| | 任务接受/进度/完成完整流程 |
| | 好感度门槛拒绝接受任务 |
| | 物品奖励正确发放到背包 |

---

### Phase 3.4：称号系统

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

## 暂不实现（Phase 3 范围外）

| 功能 | 备注 | 预计 Phase |
|------|------|-----------|
| 副手武器/头盔/臂甲/腿甲扩展装备栏 | 当前精简版 4 栏位 | Phase 4 |
| 随机词缀（affixes）装备生成 | 字段预留，逻辑后续 | Phase 4 |
| 装备合成 | 需要物品系统就绪 | Phase 4 |
| 副本系统 | 需要人物战斗就绪 | Phase 4 |
| 房屋系统 | — | Phase 5 |
| 宠物系统 | — | Phase 5 |
| MOD 支持 | 需要数据配置稳定 | Phase 5 |

---

## 完成标准

### 硬性条件（必须满足）

- [ ] 人物属性系统：5 核心属性 + 8 面板数值计算正确，软上限生效
- [ ] 升级加点：每级 3 点分配正确影响面板
- [ ] 物品系统：inventory 重构完成，ItemInstance 支持耐久/强化/词缀预留
- [ ] 装备栏：主手武器 + 铠甲 + 饰品 ×2 可穿戴/卸下，属性正确叠加
- [ ] 初始装备池 ≥ 15 件
- [ ] 回合制战斗：伤害/暴击/闪避/行动顺序计算正确
- [ ] 接舷战：舰队战败后可选人物战斗，结果正确反馈
- [ ] NPC 系统：对话/送礼/好感度/招募流程完整
- [ ] 船长招募直接影响 maxShips
- [ ] 任务系统：好感度门槛 + 物品奖励完整
- [ ] 至少 5 个可接受任务
- [ ] 至少 2 个可招募 NPC 船长
- [ ] `npx next build` 无错误
- [ ] `bun run lint` 无 warning/error
- [ ] 游戏引擎纯函数测试全部通过

### 质量条件（建议满足）

- [ ] 人物属性 Build 存在多样性：同一等级不同配点产生可感知的战斗差异
- [ ] 装备存在显著品质梯度（普通→良→优秀→稀有→传说）
- [ ] 回合制战斗有策略深度（不单纯是数值对撞）
- [ ] NPC 好感度有实质影响（解锁专属任务/折扣/战斗加成）
- [ ] UI 展示人物面板、背包、装备栏、战斗界面
