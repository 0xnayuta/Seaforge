---
status: approved
last_verified: 2026-07-13
---

# 等级与属性系统规格说明

**关联规则：** R1, R6

---

## 概述

人物属性系统采用混合方案：ER 式核心属性（升级自选加点） + BS 式面板数值（由属性/等级/装备计算得出）。是 Seaforge RPG 轴的数值基础。

---

## 等级系统

### 等级范围

1 — 199

### 升级所需经验

```
expToNext(level) = BASE_EXP × (1 + level × LEVEL_EXP_GROWTH)
```

- `BASE_EXP` = 100（1→2 需要 100 exp）
- `LEVEL_EXP_GROWTH` = 0.15（每级增长 15%）

### 经验来源

| 来源 | 转化公式 | 说明 |
|------|----------|------|
| 贸易利润 | `exp = 利润 × LEVEL_EXP_RATIO` | 卖出货物时获得 |
| 航行事件 | 固定 `EVENT_EXP` = 5 | 每日事件结算 |
| 战斗胜利 | 固定 50 | 人物战斗胜利 |
| 任务奖励 | 任务配置的 `reward.exp` | 完成任务 |
| 成就奖励 | 成就配置的 `reward.exp` | 领取成就 |

`LEVEL_EXP_RATIO` = 0.3（30% 利润转化为经验）

### 升级收益

| 收益 | 说明 |
|------|------|
| 属性点 | 每级 +3 点可分配核心属性 |
| HP 成长 | 每级基础 +8 HP（不受属性影响） |
| 速度加成 | 每级 `LEVEL_SPEED_PER_LEVEL` = 2%（航行速度） |
| 舰队容量 | `maxShips = 1 + floor(level / MAX_SHIPS_LEVEL_DIVISOR)`，每 3 级 +1 |

### 升级流程（纯函数）

```
gainExp(world, amount)
  → exp += amount
  → while exp >= expToNext:
      level += 1
      exp -= expToNext
      attributePoints += 3（可分配点数）
      expToNext = 重新计算
  → return newWorld
```

---

## 核心属性系统

### 五核心属性

| 属性 | 缩写 | 主要影响 | 次要影响 |
|------|------|----------|----------|
| 力量 | STR | ATK、EquipLoad | 重型武器门槛、接舷战伤害 |
| 敏捷 | DEX | SPD、ATK（轻武器） | 暴击率、命中率、闪避率 |
| 智力 | INT | MAG | 特殊炮弹效果、知识类交互 |
| 信仰 | FTH | MDF、buff 强度 | NPC 好感增益幅度、士气恢复 |
| 感应 | ARC | LUK | 掉落率、交易砍价、稀有事件触发 |

### 加点规则

- 每升一级获得 3 点可分配点数
- 满级 199 可用总点数：198 × 3 = 594 点
- 通过 `allocateAttributePoint(world, attr)` 分配

### 软上限 (Soft Caps)

属性实际收益按区间衰减：

| 区间 | 实际收益率 |
|------|-----------|
| 1-20 | 100%（每点全效） |
| 21-40 | 75% |
| 41-60 | 50% |
| 61-80 | 25% |
| 81+ | 10% |

面板计算时使用 `getEffectiveAttribute(val)` 应用软上限。

---

## 面板属性公式

所有面板值 = 基础公式值 + 装备加成 + 属性补正，取 `floor()`。

### HP

```
HP = 80 + level × 8 + STR_eff × 4 + (DEX_eff + INT_eff + FTH_eff + ARC_eff) × 1
```

### MP

```
MP = 20 + level × 2 + INT_eff × 2 + FTH_eff × 1
```

### ATK（攻击力）

```
ATK = 8 + STR_eff × 2.0 + DEX_eff × 0.5 + 装备ATK + 补正ATK
```

### DEF（防御力）

```
DEF = 5 + STR_eff × 0.8 + DEX_eff × 0.4 + 装备DEF + 补正DEF
```

### MAG（魔力）

```
MAG = 5 + INT_eff × 2.0 + FTH_eff × 0.5 + 装备MAG + 补正MAG
```

### MDF（魔防）

```
MDF = 5 + INT_eff × 0.6 + FTH_eff × 1.0 + 装备MDF + 补正MDF
```

### SPD（速度）

```
SPD = 8 + DEX_eff × 1.5 + 装备SPD
```

### LUK（幸运）

```
LUK = 5 + ARC_eff × 2.0 + 装备LUK
```

### EquipLoad（负重）

```
EquipLoad = 15 + STR_eff × 2.5 + 装备EquipLoad
```

---

## 装备属性补正 (Attribute Scaling)

装备品质决定补正系数，补正是 `baseStat × 系数 × 有效属性值 / 100`：

| 品质 | 补正系数 |
|------|---------|
| 普通 (normal) | 0% |
| 良 (good) | 25% |
| 优秀 (excellent) | 50% |
| 稀有 (rare) | 75% |
| 传说 (legendary) | 100% |

**补正计算（以武器为例）：**

```
武器补正 ATK = ∑ (baseATK × qualityFactor × effAttr / 100)   // 参与属性: STR, DEX, ARC
武器补正 MAG = ∑ (baseMAG × qualityFactor × effAttr / 100)   // 参与属性: INT, FTH, ARC
防具补正 DEF = ∑ (baseDEF × qualityFactor × effAttr / 100)   // 参与属性: STR, DEX, ARC
防具补正 MDF = ∑ (baseMDF × qualityFactor × effAttr / 100)   // 参与属性: INT, FTH, ARC
```

---

## 人物装备栏

| 槽位 | 说明 |
|------|------|
| 武器 (weapon) | 主手武器，影响 ATK/MAG + 技能 |
| 铠甲 (armor) | 躯干防具，影响 DEF/MDF |
| 饰品 1 (accessory1) | 戒指/项链 |
| 饰品 2 (accessory2) | 戒指/项链 |

### 物品类型

| 类别 | 堆叠 | 说明 |
|------|------|------|
| 装备 (weapon/armor/accessory) | 否 | 单件实例，可穿戴至装备栏 |
| 消耗品 (consumable) | 是 | 药水/食物/卷轴 |
| 材料 (material) | 是 | 锻造/合成原料 |

船只装备（sail/cannon/armor/figurehead/special）独立于人物装备体系，存放在 `ShipInstance` 中。

---

## 称号系统

称号通过游戏内成就自动解锁，可主动选择一个称号获得属性加成。

### 解锁条件

| 条件类型 | 说明 |
|----------|------|
| `level` | 等级 ≥ N |
| `totalSalesRevenue` | 累计贸易额 ≥ N |
| `bestSingleProfit` | 单次利润 ≥ N |
| `totalMileage` | 航行里程 ≥ N |
| `combatWins` | 战斗胜利次数 ≥ N |
| `voyagesCompleted` | 完成航行次数 ≥ N |

### 称号效果

| 效果类型 | 效果 |
|----------|------|
| `cargoCapacity` | 舰队总舱容 +N |
| `speedPercent` | 航行速度 +N% |
| `defensePercent` | 防御评分 +N% |

### 已配置称号（6 个）

| 称号 | 解锁条件 | 效果 |
|------|----------|------|
| 初出茅庐 | 完成 1 次航行 | 无 |
| 小有积蓄 | 累计贸易额 ≥ 10,000 | 舱容 +3 |
| 一夜暴富 | 单次利润 ≥ 5,000 | 速度 +2% |
| 海盗克星 | 战斗胜利 ≥ 10 | 防御 +5% |
| 太平洋主宰 | 航行里程 ≥ 10,000 | 速度 +5% |
| 航海王 | 等级 ≥ 50 | 舱容 +10, 速度 +3% |

---

## 领域错误码

| 错误码 | 触发条件 |
|--------|----------|
| `INSUFFICIENT_ATTRIBUTE_POINTS` | 可分配点数不足 |
| `ITEM_NOT_FOUND` | 背包中未找到物品 |
| `ITEM_NOT_EQUIPPABLE` | 物品无法装备到该槽位 |
| `EQUIPMENT_SLOT_INVALID` | 装备槽位无效 |
| `TITLE_NOT_FOUND` | 称号 ID 无效 |
| `TITLE_NOT_UNLOCKED` | 称号未解锁 |

---

## 依赖关系

- 依赖：`data/formulas.ts`（经验/属性/补正常量）, `data/items.ts`（物品配置）, `data/titles.ts`（称号配置）
- 被依赖：人物战斗系统、NPC 招募条件、任务等级/属性要求、副本等级门槛
