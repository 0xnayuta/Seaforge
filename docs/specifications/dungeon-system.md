---
status: approved
last_verified: 2026-07-13
---

# 副本系统规格说明

**关联规则：** R1, R6

---

## 概述

副本系统为港口提供专属的序列化挑战内容。玩家进入副本后经历多层事件（战斗/宝箱/选择），通关获得奖励。副本使用 Phase 3 的人物回合制战斗系统。

---

## 核心流程

```
进入副本（enterDungeon）
  → 校验等级/冷却/港口
  → 初始化 DungeonState：当前层 = 0
  → 进入楼层循环：
      推进楼层（advanceDungeonFloor）
      → 获取当前层事件
      → 处理事件：
          战斗  → initPersonCombat → 玩家战斗 → 结算
          宝箱  → 发放金币/经验/物品
          选择  → 展示选项 → 玩家选择 → 发放对应奖励
      → 通关判定：
          最后一层完成 → completeDungeon（发放通关奖励，标记冷却）
          未到最后一层 → 推进到下一层
  → 中途退出（escapeDungeon）：保留 50% 金币 + 全部物品
  → 战败退出（failDungeon）：标记失败
```

---

## 副本配置 (DungeonConfig)

| 字段 | 说明 | 示例 |
|------|------|------|
| `id` | 唯一标识 | `kidd_treasure` |
| `name` | 副本名称 | 基德的宝藏 |
| `entryPortId` | 入口港口 | `quanzhou` |
| `levelRequirement` | 最低等级 | 1 |
| `statRecommendation` | 推荐属性 | `minAtk: 10` |
| `floors` | 楼层事件数组 | 4-5 层 |
| `completionReward` | 通关奖励 | 金币/经验/物品 |
| `cooldownDays` | 冷却天数 | 3 |

---

## 楼层事件类型

### 战斗事件 (combat)

使用人物回合制战斗系统。`difficulty` 决定敌人的难度缩放系数。

```
处理流程：
  → createEnemyGroup(difficulty, playerLevel)
  → initPersonCombat(world) → 进入回合制战斗
  → 胜利 → 继续下一层
  → 失败 → failDungeon
```

### 宝箱事件 (treasure)

直接发放固定奖励。

```
处理流程：
  → 增加金币（goldReward）
  → 增加经验（expReward）
  → 增加物品（itemRewards 数组）
  → 推进下一层
```

### 选择事件 (choice)

展示 2-3 个选项，每个选项有独立的效果。

```
选项效果类型：
  → goldReward:  获得金币
  → expReward:   获得经验
  → itemRewards: 获得物品
  → hpDamage:    扣除 HP（负面选项）
```

---

## 已配置副本

### 1. 基德的宝藏 — 入门级

| 属性 | 值 |
|------|-----|
| 入口 | 泉州 |
| 等级要求 | 1 |
| 推荐属性 | ATK ≥ 10 |
| 层数 | 4 |
| 事件序列 | combat → choice → combat → treasure |
| 通关奖励 | 1,000 金 + 200 exp + ring_of_vigor |
| 冷却 | 3 天 |

### 2. 威尼斯地下遗迹 — 中级

| 属性 | 值 |
|------|-----|
| 入口 | 威尼斯 |
| 等级要求 | 15 |
| 推荐属性 | ATK ≥ 30, DEF ≥ 20 |
| 层数 | 5 |
| 事件序列 | choice → combat → treasure → combat → treasure |
| 通关奖励 | 3,000 金 + 500 exp + plate_armor + amulet_of_fortune |
| 冷却 | 5 天 |

### 3. 风暴之眼海域 — 高级

| 属性 | 值 |
|------|-----|
| 入口 | 蒙巴萨 |
| 等级要求 | 30 |
| 推荐属性 | ATK ≥ 50, DEF ≥ 35 |
| 层数 | 5 |
| 事件序列 | combat → combat → choice → combat → treasure |
| 通关奖励 | 8,000 金 + 1,500 exp + legendary_harpoon |
| 冷却 | 7 天 |

---

## 副本状态 (DungeonState)

存储在 `World.dungeon` 中：

| 字段 | 说明 |
|------|------|
| `dungeonId` | 当前副本 ID |
| `currentFloor` | 当前楼层索引（0-based） |
| `status` | `"in_progress"` / `"completed"` / `"failed"` |
| `accumulatedGold` | 已累计获得的金币 |
| `accumulatedExp` | 已累计获得的经验 |
| `accumulatedItems` | 已获得的物品 UID 列表 |

`World.dungeonCooldowns` 记录各副本的冷却天数（通关后设置，`advanceDay` 递减）。

---

## 结算规则

### 通关 (completeDungeon)
- 发放 `completionReward`（金币 + 经验 + 物品）
- 清空 `World.dungeon`
- 设置 `World.dungeonCooldowns[dungeonId] = cooldownDays`
- 记录 `lastDungeonResult`（用于 View Builder 渲染通告）

### 中途退出 (escapeDungeon)
- 保留 100% 已获得的物品
- 保留 50% 已累计的金币
- 不获得通关奖励
- 清空 `World.dungeon`

### 战败 (failDungeon)
- Combat 失败时由战斗系统触发
- 保留 50% 金币 + 全部物品（同中途退出）
- 标记 `failed`
- 不触发冷却

---

## 领域错误码

| 错误码 | 触发条件 |
|--------|----------|
| `DUNGEON_NOT_FOUND` | 副本 ID 无效 |
| `DUNGEON_WRONG_PORT` | 入口港口不匹配 |
| `DUNGEON_LEVEL_TOO_LOW` | 等级不足 |
| `DUNGEON_ON_COOLDOWN` | 冷却中 |
| `DUNGEON_IN_PROGRESS` | 已在其他副本中 |
| `DUNGEON_NOT_IN_PROGRESS` | 当前不在副本中 |

---

## 依赖关系

- 依赖：人物回合制战斗系统（`combat-person.ts`）、物品系统（`items.ts`）
- 数据配置：`data/dungeons.ts`
