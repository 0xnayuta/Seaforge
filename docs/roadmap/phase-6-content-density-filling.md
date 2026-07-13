---
status: draft
last_verified: 2026-07-13
---

# Phase 6：内容密度填充（Content Depth Filling）

---

## 目标

在 Phase 1-4 全部 20+ 子系统框架完备的基础上，对**已有系统进行纯数据层的厚度填充**。不引入新系统、不新增基础设施、不改动领域函数签名。

**核心命题：** 从「系统框架完备」进化到「世界密度充足」——让玩家每次航行、每个港口、每次战斗都有新东西。

---

## 当前密度基线

| 内容类型 | 当前 | Phase 6 目标 | 增长 |
|----------|------|-------------|------|
| 航程事件 | 7 | 16 | +9 |
| NPC | 5 | 13 | +8 |
| 任务 | 6 | 20 | +14 |
| 人物装备 | 20 | 35 | +15 |
| 合成配方 | 6 | 15 | +9 |
| 武器技能 | 10 | 18 | +8 |
| 副本 | 3 | 6 | +3 |
| 船只 | 8 | 12 | +4 |
| 称号 | 6 | 10 | +4 |
| 成就 | 15 | 25 | +10 |
| **合计** | **86** | **170** | **+84** |

---

## 子阶段划分

### Phase 6.1：航程事件扩展（7 → 16）

#### 设计原则

- 保持现有事件结构（`EventTemplate`），不新增字段或类型
- 覆盖正面/负面/混合三种类型，分布均衡
- 利用 `regionProbMultiplier` 让不同区域有差异化事件体验
- 部分事件联动货物类型（如鼠患只影响食物类货物）

#### 新增事件清单（9 个）

| # | 事件 | 类型 | chance | 效果 | 区域倾向 | 说明 |
|---|------|------|--------|------|----------|------|
| 1 | 海豚伴航 | 正面 | 0.10 | 士气提升，下次负面事件概率减半（本航程标记） | — | 触发后设置 `world.voyage.buffDolphin = true`，后续负面事件判定时跳过 |
| 2 | 暗礁搁浅 | 负面 | 0.08 | 耐久 -15~-30，cargoLossChance=0 | `danger >= 1.0` 区域概率 ×1.5 | 与风暴互补，danger 高区域更易触发 |
| 3 | 水手哗变 | 负面 | 0.06 | 金币 -50~-200；若拒绝则 cargoLossChance=0.5, maxCargoLoss=5 | — | 需在 voyage 中新增 `mutinyHandled` 标记管理；或简化为纯负面事件 |
| 4 | 官府盘查 | 负面 | 0.07 | 金币 -30~-100 或 cargoLossChance=0.3, maxCargoLoss=2 | `east_asia: 1.5`, `mediterranean: 1.3` | — |
| 5 | 浓雾迷航 | 负面 | 0.08 | 航程 +1~+2 天（影响补给消耗），无金币/货物损失 | `north_sea: 1.5`, `africa: 1.2` | 需在 `VoyageState` 中预留 `extraDays` 字段——**本事件涉及微小领域类型扩展** |
| 6 | 鼠患 | 负面 | 0.07 | 仅当 cargo 中有 food 类商品时触发；cargoLossChance=0.6, maxCargoLoss=4 | — | 事件逻辑在 `applyVoyageEvents` 中需添加货物品类检查——**本事件涉及微小领域逻辑扩展** |
| 7 | 渔民交易 | 正面 | 0.09 | 可用船上 cargo 中的 food 换取该港口特产（随机 1-3 单位） | — | 涉及随机交易选择，可简化为直接获得特产商品 |
| 8 | 漂流瓶 | 中立 | 0.05 | 记录一个隐藏坐标，下次经过该区域时触发宝箱事件（+200~500 金） | — | 可简化为一次性正面事件，避免跨航程状态管理 |
| 9 | 海市蜃楼 | 中立 | 0.04 | 无实际效果，纯叙事 flavor | `desert` 区域倾向（地中海/非洲） | 纯 flavor 事件，最低成本 |

#### 风险控制

- **#5 浓雾迷航**：需要在 `VoyageState` 中添加 `extraDays?: number` 字段。这是 Phase 6 中少数涉及类型扩展的改动之一，影响 `domain/types.ts` 和 `voyage.ts`（`startVoyage` 初始化 + `advanceVoyageDays` 消费）
- **#6 鼠患**：需要在 `applyVoyageEvents` 中增加 cargo 品类检查逻辑（检查 `CargoItem.goodsId` 对应 `GoodConfig.category === "food"`）——~10 行 domain 代码
- **#3 水手哗变**：若简化可去掉 buff 标记，做成纯负面事件（扣金 + 可能丢货），则无需 domain 改动
- 其余 6 个事件纯数据，零代码改动

#### 关联文件

| 操作 | 文件 | 性质 |
|------|------|------|
| 新增 9 个 EventTemplate | `src/data/events.ts` | 纯数据 |
| 可选：VoyageState 新增 extraDays | `src/game/domain/types.ts` | 类型扩展（小） |
| 可选：advanceVoyageDays 消费 extraDays | `src/game/domain/voyage.ts` | 领域逻辑扩展（小） |
| 可选：applyVoyageEvents 货物品类检查 | `src/game/domain/voyage.ts` | 领域逻辑扩展（小） |

---

### Phase 6.2：NPC 填充（5 → 13）

#### 设计原则

- 每个港口至少 1 个 NPC
- 覆盖 4 种类型（captain / merchant / questGiver / blacksmith）
- 新增 NPC 遵循现有 `NpcConfig` 类型，不新增字段
- 可招募船长优先分配至贸易路线枢纽港

#### 当前 NPC 覆盖

| 港口 | 当前 NPC | 新增建议 |
|------|----------|----------|
| 泉州 | li_hua（captain） | — |
| 长崎 | takeda（blacksmith） | — |
| 马六甲 | — | 新增 captain 或 merchant |
| 果阿 | — | 新增 questGiver |
| 卡利卡特 | — | 新增 merchant |
| 亚丁 | — | 新增 merchant（海盗线人） |
| 蒙巴萨 | zuri（merchant） | — |
| 索法拉 | — | 新增 captain 或 questGiver |
| 亚历山大 | fatima（questGiver） | — |
| 威尼斯 | marco（captain） | — |
| 伦敦 | henry（captain） | — |
| 汉堡 | — | 新增 merchant 或 questGiver |

#### 新增 NPC 方案

| # | 港口 | 名称 | 类型 | recruitable | 定位 |
|---|------|------|------|-------------|------|
| 1 | 马六甲 | 陈大福 | captain | ✅ | 南洋华人船主，熟悉东南亚海域 |
| 2 | 果阿 | Priya | questGiver | ❌ | 香料商会联络人，发布印度洋贸易任务 |
| 3 | 卡利卡特 | 阿卜杜勒 | merchant | ❌ | 香料商人，提供特殊商品交易 |
| 4 | 亚丁 | 独眼赛义德 | merchant | ❌ | 黑白两道通吃的线人，提供海盗情报任务 |
| 5 | 索法拉 | Nala | captian | ✅ | 非洲女船长，熟悉好望角航线 |
| 6 | 汉堡 | Klaus | merchant | ❌ | 汉萨商会代表，发布北海贸易任务 |
| 7 | 索法拉 | Makena | questGiver | ❌ | 部落长老，发布非洲内陆探索任务 |

#### 关联文件

| 操作 | 文件 | 性质 |
|------|------|------|
| 新增 7 个 NpcConfig | `src/data/npcs.ts` | 纯数据 |
| NPC 相关任务（见 Phase 6.3） | `src/data/quests.ts` | 纯数据 |

---

### Phase 6.3：任务扩展（6 → 20）

#### 设计原则

- 每个 NPC 至少 2 个任务
- 覆盖全部 4 种任务类型（delivery / collect / bounty / explore）
- 新增任务链（`prerequisiteQuestId`）增加深度
- 部分任务设置 `minAffinity` 和 `minLevel` 门槛

#### 任务分配计划

| NPC | 港口 | 现有 | 新增 | 任务链方向 |
|-----|------|------|------|-----------|
| li_hua | 泉州 | 2 | +1 | 第三阶段：泉州→马六甲高级护送 |
| marco | 威尼斯 | 2 | +1 | 第三阶段：地中海霸权（bounty） |
| fatima | 亚历山大 | 1 | +2 | 探索尼罗河源头、搜集古代文献 |
| henry | 伦敦 | 0 | +2 | 北海航线开辟、讨伐北海海盗 |
| zuri | 蒙巴萨 | 1 | +1 | 深入非洲内陆贸易站 |
| takeda | 长崎 | 0 | +2 | 寻找名刀材料、锻造传说武器 |
| **陈大福** | 马六甲 | 0 | +2 | 南洋商路护卫、寻找沉船宝藏 |
| **Priya** | 果阿 | 0 | +2 | 印度洋香料专运、商会秘密货物 |
| **阿卜杜勒** | 卡利卡特 | 0 | +1 | 稀有香料收集 |
| **独眼赛义德** | 亚丁 | 0 | +2 | 海盗赏金、黑市交易 |
| **Nala** | 索法拉 | 0 | +2 | 好望角探险、非洲海岸线测绘 |
| **Klaus** | 汉堡 | 0 | +2 | 汉萨商路护航、北欧货物集运 |
| **Makena** | 索法拉 | 0 | +1 | 部落圣物回收 |

#### 新增任务类型分布

| 类型 | 现有 | 新增 | 合计 |
|------|------|------|------|
| delivery | 3 | 6 | 9 |
| collect | 1 | 3 | 4 |
| bounty | 1 | 3 | 4 |
| explore | 1 | 2 | 3 |
| **合计** | **6** | **14** | **20** |

#### 关联文件

| 操作 | 文件 | 性质 |
|------|------|------|
| 新增 14 个 QuestConfig | `src/data/quests.ts` | 纯数据 |

---

### Phase 6.4：装备扩展（20 → 35）

#### 设计原则

- 填补武器类型空缺（匕首/长枪/火枪/法杖细分）
- 新增防具流派分支（轻甲闪避流 / 重甲防御流 / 法袍魔防流）
- 新增特效饰品（非纯数值，带主动/被动效果）
- 充分利用 `scaling` 属性补正机制
- 充分利用 `skills` 武器技能绑定机制

#### 新增武器（5 件）

| # | ID | 名称 | quality | 核心属性 | 技能 | 定位 |
|---|-----|------|---------|----------|------|------|
| 1 | dagger | 刺客匕首 | good | 高暴击率 | 暗影步 | DEX 流轻武器 |
| 2 | spear | 海魂叉 | excellent | 高命中，无视部分 DEF | 碎甲刺 | STR/DEX 平衡 |
| 3 | flintlock | 燧发火枪 | rare | 先手攻击，远程 | 狙击 | DEX/ARC 远程流 |
| 4 | guardian_staff | 守护法杖 | good | 低 ATK，高 DEF/MDF | 治疗术 + 护盾 | INT/FTH 辅助流 |
| 5 | cursed_blade | 诅咒之刃 | legendary | 高 ATK，吸血效果 | 嗜血斩 | STR 极限输出 |

#### 新增防具（4 件）

| # | ID | 名称 | quality | 特点 |
|---|-----|------|---------|------|
| 1 | scale_armor | 鳞甲 | good | 均衡防护，含 scaling |
| 2 | ninja_garb | 忍者装束 | excellent | 低 DEF，高 SPD+LUK（闪避流） |
| 3 | priest_robe | 祭司法袍 | good | 高 MDF，低 DEF（魔防流） |
| 4 | dragon_scale | 龙鳞甲 | legendary | 最高 DEF+MDF，高 EquipLoad |

#### 新增饰品（6 件）

| # | ID | 名称 | quality | 效果 |
|---|-----|------|---------|------|
| 1 | ring_of_accuracy | 精准戒指 | good | ATK +3, LUK +2 |
| 2 | amulet_of_evasion | 闪避护符 | excellent | SPD +4（闪避流核心） |
| 3 | ring_of_magic | 魔力戒指 | good | MAG +5 |
| 4 | talisman_of_endurance | 忍耐护符 | rare | MaxHP +30, DEF +2 |
| 5 | brooch_of_trade | 商会胸针 | rare | 卖出货物利润 +5%（需在 trade 中新增逻辑） |
| 6 | pirate_eye_patch | 海盗眼罩 | legendary | ATK +8, LUK -3（高风险高回报） |

> **#5 brooch_of_trade**：涉及 `sellGoods` 中的利润计算逻辑，需在 `trade.ts` 中新增装备效果检查（~15 行 domain 代码）。可延后或简化。

#### 关联文件

| 操作 | 文件 | 性质 |
|------|------|------|
| 新增 15 个 ItemConfig | `src/data/items.ts` | 纯数据 |
| 可选：brooch_of_trade 利润加成 | `src/game/domain/trade.ts` | 领域逻辑扩展（小） |

---

### Phase 6.5：配方扩展（6 → 15）

#### 设计原则

- 破坏当前线性链（rusty→iron→silver→legendary），加入分支配方
- 增加跨港口收集需求（配方材料分属不同港口）
- 增加 NPC 好感度门槛（驱动玩家经营关系）
- 引入消耗品/材料类配方

#### 新增配方（9 个）

| # | ID | 产物 | 材料 | 港口 | goldCost | minAffinity | 说明 |
|---|-----|------|------|------|----------|-------------|------|
| 1 | scale_from_leather | 鳞甲 | leather_armor ×2 | 泉州 | 600 | — | 防具分支路线 |
| 2 | ninja_from_scale | 忍者装束 | scale_armor + mage_staff | 长崎 | 1200 | takeda:30 | 轻甲路线终点 |
| 3 | guardian_rod | 守护法杖 | mage_staff + ring_of_vigor | 亚历山大 | 800 | fatima:25 | 法系装备分支 |
| 4 | dagger_from_rusty | 刺客匕首 | rusted_sword ×3 | 马六甲 | 500 | — | 新武器分支起点 |
| 5 | flintlock_craft | 燧发火枪 | silver_rapier + jade | 威尼斯 | 2000 | — | 远程武器线 |
| 6 | cursed_blade | 诅咒之刃 | legendary_harpoon + assassin_dagger | 亚丁 | 4000 | 赛义德:50 | 终极武器之一 |
| 7 | dragon_scale | 龙鳞甲 | plate_armor + amulet_of_fortune | 马六甲 | 5000 | — | 终极防具 |
| 8 | healing_potion | 治疗药水 | 无（金币直购） | 全港口 | 200 | — | 消耗品首次引入 |
| 9 | stamina_potion | 耐力药水 | 无（金币直购） | 全港口 | 300 | — | 消耗品 |

> **#8/#9 消耗品**：当前 `CraftingPanel` 和 `craftEquipment` 为装备合成专用。引入消耗品需评估 UI 适配——可延后。前 7 个配方完全兼容现有系统。

#### 关联文件

| 操作 | 文件 | 性质 |
|------|------|------|
| 新增 7-9 个 EquipmentRecipe | `src/data/items.ts` | 纯数据 |

---

### Phase 6.6：技能扩展（10 → 18）

#### 设计原则

- 每把武器至少 2 个技能
- 新增技能类型覆盖：回复、减益、控制、特殊
- 充分利用现有 `StatusEffect` 系统

#### 新增技能（8 个）

| # | ID | 名称 | mpCost | type | power | statusEffect | 绑定武器 |
|---|-----|------|--------|------|-------|-------------|----------|
| 1 | backstab | 背刺 | 8 | physical | 1.8 | — | 匕首 |
| 2 | shadow_step | 暗影步 | 12 | physical | 2.0 | — | 匕首（必定暴击） |
| 3 | pierce_armor | 碎甲刺 | 10 | physical | 1.3 | — | 海魂叉（无视 30% DEF） |
| 4 | snipe | 狙击 | 15 | physical | 2.5 | — | 燧发火枪（必定先手） |
| 5 | heal | 治疗术 | 10 | heal | 1.5 | — | 守护法杖（回复 HP） |
| 6 | shield_bash | 盾击 | 6 | physical | 1.0 | stun, 30%, 1回合 | 守护法杖 |
| 7 | life_steal | 嗜血斩 | 14 | physical | 1.6 | — | 诅咒之刃（吸血 25%） |
| 8 | curse_weaken | 诅咒削弱 | 10 | status | — | weaken, 100%, 2回合 | 诅咒之刃 |

> **`stun` 和 `weaken`** 是新的状态效果类型。`stun` = 跳过下一回合（类似 freeze），`weaken` = ATK × 0.7 持续 2 回合。这涉及 `StatusEffectType` 的扩展——**Phase 6 中少数触及类型定义的改动**。

#### 关联文件

| 操作 | 文件 | 性质 |
|------|------|------|
| 新增 8 个 SkillConfig | `src/data/skills.ts` | 纯数据 |
| 新增 stun/weaken 状态类型 | `src/data/skills.ts`（类型） | 类型扩展（小） |
| 新增 stun/weaken 状态效果处理 | `src/game/domain/combat-person-status.ts` | 领域逻辑扩展（小） |
| 新增 STATUS_LABELS | `src/game/domain/combat-person-damage.ts` | 纯数据 |
| 更新武器 skills 绑定 | `src/data/items.ts` | 数据 |

---

### Phase 6.7：称号扩展（6 → 10）

#### 新增称号（4 个）

| # | ID | 名称 | 条件 | 效果 |
|---|-----|------|------|------|
| 1 | seasoned_sailor | 老水手 | voyagesCompleted ≥ 20 | 防御 +3% |
| 2 | merchant_king | 商业巨子 | totalSalesRevenue ≥ 100,000 | 舱容 +5 |
| 3 | dungeon_explorer | 深渊探索者 | 通关任意副本 | 速度 +3% |
| 4 | collector | 收藏家 | itemsCollected ≥ 15 | 舱容 +2 |

#### 关联文件

| 操作 | 文件 | 性质 |
|------|------|------|
| 新增 4 个 TitleConfig | `src/data/titles.ts` | 纯数据 |

---

### Phase 6.8：成就扩展（15 → 25）

#### 新增成就（10 个）

| # | 维度 | ID | 名称 | 条件 | reward |
|---|------|-----|------|------|--------|
| 1 | 航行 | milestone_5000 | 航迹 5000 海里 | totalMileage ≥ 5000 | 500 金, 200 exp |
| 2 | 航行 | milestone_25000 | 航迹 25000 海里 | totalMileage ≥ 25000 | 2000 金, 800 exp |
| 3 | 贸易 | profit_50000 | 累计利润 50000 | totalSalesRevenue ≥ 50000 | 1500 金 |
| 4 | 战斗 | combat_50 | 身经百战 | combatWins ≥ 50 | 1000 金, 500 exp |
| 5 | 等级 | reach_50 | 航海精英 | level ≥ 50 | 3000 金 |
| 6 | 收集 | collector_10 | 收集 10 件装备 | itemsCollected ≥ 10 | 500 金 |
| 7 | 副本 | dungeon_clear_1 | 初入秘境 | 通关任意副本 | 1000 金 |
| 8 | 副本 | dungeon_clear_all | 秘境征服者 | 通关所有副本 | 5000 金, 1000 exp |
| 9 | 任务 | quest_10 | 任务达人 | 完成 10 个任务 | 800 金, 300 exp |
| 10 | 综合 | millionaire | 百万富翁 | 总资产 ≥ 1,000,000 | 称号「百万富翁」 |

> **#10 millionaire** 需新增成就条件类型或依赖 World 中持久化的资产记录。当前 World 不保存"总资产"——可简化为 `totalSalesRevenue ≥ 1,000,000`。

#### 关联文件

| 操作 | 文件 | 性质 |
|------|------|------|
| 新增 10 个 AchievementConfig | `src/data/achievements.ts` | 纯数据 |

---

### Phase 6.9：副本扩展（3 → 6）

#### 新增副本（3 个）

| # | ID | 名称 | 入口 | 层数 | 等级要求 | 冷却 | 风格 |
|---|-----|------|------|------|----------|------|------|
| 1 | pirate_king | 海盗王巢穴 | 索法拉 | 5 | 20 | 5天 | 纯战斗高难，4 combat + 1 treasure |
| 2 | lighthouse | 古代灯塔遗迹 | 汉堡 | 4 | 10 | 4天 | 谜题+战斗混合，2 choice + 2 combat |
| 3 | dragon_triangle | 龙三角海域 | 长崎 | 6 | 40 | 7天 | 最高难度，3 combat + 2 choice + 1 treasure |

#### 关联文件

| 操作 | 文件 | 性质 |
|------|------|------|
| 新增 3 个 DungeonConfig | `src/data/dungeons.ts` | 纯数据 |

---

### Phase 6.10：船只扩展（8 → 12）

#### 新增船只（4 艘）

| # | ID | 名称 | 层级 | 舱容 | 速度 | 价格 | 出售港口 | 定位 |
|---|-----|------|------|------|------|------|----------|------|
| 1 | cog | 柯克船 | 轻-中过渡 | 45 | 0.95 | 1,500 | 汉堡 | 北海实用船，填补单桅(35)→中型(50) |
| 2 | caravel | 卡拉维尔帆船 | 中-大过渡 | 105 | 0.75 | 6,000 | 果阿、卡利卡特 | 印度洋远洋船，填补中型(80)→大型(120) |
| 3 | galleon | 西班牙大帆船 | 大型 | 135 | 0.6 | 15,000 | 威尼斯、亚历山大 | 武装商船，高耐久 |
| 4 | junk | 宝船 | 超大型 | 200 | 0.45 | 30,000 | 泉州 | 终极商船，最大舱容、最慢速度 |

#### 关联文件

| 操作 | 文件 | 性质 |
|------|------|------|
| 新增 4 个 ShipConfig | `src/data/ships.ts` | 纯数据 |

---

## 依赖关系

```
Phase 6.1 (事件) ─── 依赖 voyage 系统已有基础设施
  │                     └── 浓雾迷航涉及 VoyageState 微扩（领域类型）
  │                     └── 鼠患涉及 ApplyVoyageEvents 微扩（领域逻辑）
  │
Phase 6.2 (NPC) ───── 依赖 NPC 系统已有基础设施（纯数据）
  │
Phase 6.3 (任务) ──── 依赖 Phase 6.2（新 NPC），纯数据
  │
Phase 6.4 (装备) ──── 依赖 item 系统已有基础设施
  │                     └── brooch_of_trade 涉及 sellGoods 微扩（领域逻辑）
  │
Phase 6.5 (配方) ──── 依赖 Phase 6.4（新装备作为材料/产物），纯数据
  │
Phase 6.6 (技能) ──── 依赖 Phase 6.4（新武器绑定技能）
  │                     └── 涉及 StatusEffectType 微扩（领域类型）
  │                     └── 涉及状态处理逻辑微扩（领域逻辑）
  │
Phase 6.7 (称号) ──── 独立（纯数据）
  │
Phase 6.8 (成就) ──── 独立（纯数据，条件基于已有 World 字段）
  │
Phase 6.9 (副本) ──── 依赖 Phase 6.6（战斗系统稳定），纯数据
  │
Phase 6.10 (船只) ─── 独立（纯数据）
```

### 建议执行顺序

```
Phase 6.2  NPC ──────┐
                      ├──→ Phase 6.3 任务 ──┐
Phase 6.7  称号 ─────┤                     │
Phase 6.8  成就 ─────┤                     │
Phase 6.10 船只 ─────┤                     │
                      │                     │
Phase 6.1  事件 ──────┘                     │
                      │                     │
Phase 6.4  装备 ──────┼──→ Phase 6.5 配方 ──┤
                      │                     │
Phase 6.6  技能 ──────┘                     │
                                            ▼
                                     Phase 6.9 副本
```

**并行批次拆解：**

| 批次 | 子阶段 | 理由 |
|------|--------|------|
| **批次 1**（纯数据，无代码风险） | 6.2 NPC + 6.7 称号 + 6.8 成就 + 6.10 船只 | 全部纯数据，互不依赖，可并行 |
| **批次 2**（纯数据 + 微量逻辑） | 6.1 事件 + 6.3 任务 | 事件依赖批次 1 的 NPC（任务依赖 NPC），可接续 |
| **批次 3**（数据 + 少量类型扩展） | 6.4 装备 + 6.6 技能 | 装备和技能有交互，建议同批次 |
| **批次 4**（依赖批次 3） | 6.5 配方 | 依赖新装备作为材料/产物 |
| **批次 5**（最后，依赖战斗稳定） | 6.9 副本 | 依赖全部战斗相关数据（装备/技能）稳定 |

---

## 数据改动预估

| 子阶段 | 文件 | 新增行数 | 代码改动 | 风险 |
|--------|------|----------|----------|------|
| 6.1 事件 | `events.ts`, `voyage.ts`, `types.ts` | ~150 | 3 个文件微扩 | 低 |
| 6.2 NPC | `npcs.ts` | ~210 | 无 | 无 |
| 6.3 任务 | `quests.ts` | ~280 | 无 | 无 |
| 6.4 装备 | `items.ts`, `trade.ts`（可选） | ~225 | 1 个文件微扩 | 低 |
| 6.5 配方 | `items.ts` | ~90 | 无 | 无 |
| 6.6 技能 | `skills.ts`, `items.ts`, `combat-person-status.ts` | ~180 | 2 个文件微扩 | 低 |
| 6.7 称号 | `titles.ts` | ~60 | 无 | 无 |
| 6.8 成就 | `achievements.ts` | ~150 | 无 | 无 |
| 6.9 副本 | `dungeons.ts` | ~200 | 无 | 无 |
| 6.10 船只 | `ships.ts` | ~120 | 无 | 无 |
| **合计** | **10 个文件** | **~1,665** | **最多 6 个文件微扩** | **整体低** |

---

## 完成标准

### 硬性条件

- [ ] 航程事件 ≥ 16 个，覆盖 3 种类型（正面/负面/混合），区域概率差异生效
- [ ] 每个港口至少 1 个 NPC，NPC 类型覆盖 captain / merchant / questGiver / blacksmith
- [ ] 任务 ≥ 18 个，覆盖全部 4 种任务类型，至少 3 条任务链（`prerequisiteQuestId`）
- [ ] 人物装备 ≥ 33 件，至少有 3 种 Build 流派可组
- [ ] 合成配方 ≥ 12 个，含分支配方和好感度门槛配方
- [ ] 武器技能 ≥ 16 个，每把武器至少 2 个技能
- [ ] 称号 ≥ 9 个，成就 ≥ 22 个
- [ ] 副本 ≥ 5 个，含不同楼层事件组合
- [ ] 船只 ≥ 10 艘，覆盖轻→超全层级
- [ ] `bun run build` 无错误
- [ ] `bun run lint` 无 warning/error
- [ ] `bun run test` 全部通过（含 data-integrity test）

### 质量条件

- [ ] 每个 NPC 有独特对话文本，与港口文化一致
- [ ] 任务奖励曲线平滑（低等级任务 vs 高等级任务的回报递增合理）
- [ ] 副本有差异化楼层事件组合（不只有"三层都是战斗"）
- [ ] 装备和配方形成可感知的 Build 选择（非纯数值堆叠）
- [ ] 称号/成就在游戏中提供切实驱动力（非注水计数）

---

## Phase 6 的边界（不做什么）

| 不做 | 理由 |
|------|------|
| 不引入新系统 | 已有 20+ 子系统，广度足够 |
| 不新增 Prisma 模型或字段 | SQLite schema 冻结 |
| 不新增领域函数签名 | 所有操作在已有纯函数边界内 |
| 不新增 UI 组件或路由 | 现有 UI 通吃所有新增数据 |
| 不重构现有代码 | 专注内容填充，不分散精力 |
| 不改动 GameView 类型 | View Builder 通用渲染，数据驱动 |
| 房屋/宠物/MOD 等扩展系统 | 评估在 Phase 7 或更高版本 |

---

## 风险登记

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| 浓雾迷航的 VoyageState 扩展影响现有多处代码 | 低 | 中 | 使用可选字段 `extraDays?: number`，默认 undefined 兼容现有存档 |
| 新增状态效果 stun/weaken 遗漏某处处理分支 | 中 | 中 | 在 `combat-person-status.ts` 的 `processStatusPhase` 中统一处理，跑战斗测试覆盖 |
| 新物品引用完整性（data-integrity test）失败 | 低 | 低 | 所有 items 在新增后立即跑 `bun test`，在提交前发现断裂引用 |
| 配方材料/产物引用了不存在的 itemId | 低 | 低 | 同上，data-integrity test 会检测 |
| 任务奖励引用了不存在的物品 | 低 | 低 | 同上 |
| 新增船只未在 ports 的 sellPortIds 中配置 | 低 | 低 | 关联 ports.ts 和 ships.ts 配置，提交前交叉检查 |
