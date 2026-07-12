---
status: approved
last_verified: 2026-07-13
---

# 人物回合制战斗系统规格说明

**关联规则：** R1, R6

---

## 概述

人物回合制战斗（Person Combat）是 Seaforge RPG 轴的微观战斗系统，类似 JRPG 回合制。当舰队战失败或副本/事件中触发时，玩家与敌人进入回合制对战。

战斗在 `PersonCombatState` 中推进，存储在 `World.combat` 字段。

---

## 核心流程

```
初始化（initPersonCombat）
  → 生成参与者列表（玩家 + N 个敌人）
  → 按 SPD 计算行动顺序
  → 进入回合循环：
      回合开始 → 状态阶段（dot/buff 结算）
      → 每个参与者按序行动（攻击/技能/回避/弹反）
      → 判断胜负
      → 回合结束
  → 战斗结果应用到 World
```

---

## 参与者 (CombatParticipant)

每个参与者包含：

| 字段 | 说明 |
|------|------|
| `id` | 唯一标识（"player" 或 uuid） |
| `name` | 显示名称 |
| `type` | "ally" / "enemy" |
| `hp`, `maxHp` | 生命值 |
| `mp`, `maxMp` | 魔法值 |
| `atk`, `def`, `mag`, `mdf`, `spd`, `luk` | 面板属性 |
| `level` | 等级（影响技能可用性） |
| `weaponId` | 当前武器 ID（决定可用技能） |
| `statuses` | 异常状态列表 |
| `isDodging`, `isParrying` | 防御姿态标记 |

---

## 行动顺序 (Initiative)

按 `spd` 降序排列。SPD 差 > 20 时低速方可能少行动一次（由 `calcInitiative` 实现）。

---

## 可用动作

### 攻击 (Attack)
普通攻击，基于 ATK 和 DEF 结算伤害。

### 技能 (Skill)
武器绑定的技能，消耗 MP。每把武器独立配置技能列表，升级解锁更高技能。

### 回避 (Dodge)
消耗 5 MP，本回合免疫大部分攻击。

### 弹反 (Parry)
消耗 5 MP，本回合对物理攻击进行反击（仅对物理攻击有效）。

---

## 伤害计算

### 基础伤害

```
baseDamage = attacker.atk - defender.def × 0.4
```

### 技能伤害

```
baseDamage = attacker.atk × skill.power - defender.def × 0.4
```

技能 `power` 为威力系数（例：1.0 = 普通攻击，1.5 = 强力技能）。

### 暴击

```
critRate = 5% + attacker.luk × 0.15%
critDamage = baseDamage × 1.5
```

### 命中率

```
命中率 = 85% + attacker.luk × 0.1%
致盲状态下命中率减半
```

### 闪避率

```
evasionRate = (attacker.spd - defender.spd) × 0.005 + (attacker.luk - defender.luk) × 0.003
min 5%, max 50%
回避状态：必定闪避
```

### 最终伤害公式

```
if (miss)          → 0
if (defender 回避) → 0（并消耗回避状态）
if (弹反 & 物理)   → 反伤 = attacker.atk × 0.5（并消耗弹反状态）
damage = baseDamage
if (暴击)          → damage ×= 1.5
随机波动 ±10%
damage = max(1, floor(damage))
```

---

## 状态异常 (Status Effects)

| 异常 | 效果 | 持续回合 |
|------|------|----------|
| 中毒 (poison) | 每回合结束损失 maxHp × 5% | 3 |
| 出血 (bleed) | 每回合结束损失 maxHp × 8% | 3 |
| 燃烧 (burn) | 每回合结束损失 maxHp × 10% | 2 |
| 冰冻 (freeze) | 无法行动，受物理攻击伤害 +25% | 2 |
| 睡眠 (sleep) | 无法行动，受攻击后解除 | 1-2 |
| 沉默 (silence) | 无法使用技能 | 2 |
| 暗闇 (blind) | 命中率减半 | 2 |

状态异常由武器技能的概率触发（`SkillConfig.statusEffect.chance`）。

---

## 战斗结果

| 结果 | 触发条件 | 效果 |
|------|----------|------|
| 胜利 | 所有敌人 hp ≤ 0 | 获得经验，继续航行或副本 |
| 失败 | 所有友方 hp ≤ 0 | 根据场景不同：航行中 → 损失货物+金币遣返；副本中 → 半额金币退出 |
| 逃跑 | 玩家选择逃跑 | 按场景规则处理 |

---

## 敌人 AI

敌人行动逻辑 (`decideEnemyAction`)：
1. 有治疗技能且 HP < 50% → 优先治疗
2. 随机选择：普通攻击或可用技能（按 MP 余量）
3. 目标选择：优先攻击 HP 最低的友方单位

---

## 敌人模板

| ID | 名称 | 难度层 |
|----|------|--------|
| pirate_grunt | 海盗水手 | 低 |
| pirate_archer | 海盗弓手 | 低-中 |
| pirate_swordsman | 海盗剑士 | 中 |
| pirate_mage | 海盗巫师 | 中-高 |
| pirate_berserker | 海盗狂战士 | 高 |
| pirate_captain | 海盗船长 | 最高 |

6 种模板，通过 `ENEMY_SCALING` 按 `easy / medium / hard` 三档缩放数值。

---

## 接舷战流程（航行事件）

```
舰队炮击战
  ├── 胜利 → 获得战利品，继续航行
  ├── 失败 → 可选择投降（损失货物）或接舷战
  │         ├── 接舷战胜利 → 击退海盗，保留货物
  │         └── 接舷战失败 → 损失货物+金币，遣返最近港口
  └── 低概率直接触发海盗登船 → 直接进入人物战斗
```

---

## 领域错误码

| 错误码 | 触发条件 |
|--------|----------|
| `NOT_IN_COMBAT` | 当前不在战斗中 |
| `NOT_YOUR_TURN` | 当前不是该玩家的回合 |
| `INVALID_COMBAT_TARGET` | 无效的目标 |
| `INVALID_COMBAT_ACTION` | 无效的动作 |
| `INSUFFICIENT_MP` | MP 不足 |
| `SILENCED` | 沉默状态下使用技能 |

---

## 依赖关系

- 依赖：`data/skills.ts`（技能配置）, `data/items.ts`（武器技能绑定）, `data/formulas.ts`（战斗常量）
- 被依赖：航程事件接舷战、副本战斗层
