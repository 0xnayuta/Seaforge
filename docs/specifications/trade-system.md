---
status: approved
last_verified: 2026-07-13
---

# 贸易系统规格说明

**关联规则：** R1, R6

---

## 概述

贸易是 Seaforge 经济轴的核心系统。玩家在港口间低买高卖商品，赚取金币并获取经验。价格由区域系数、港口微调、买卖冲击和每日回归共同决定。

---

## 核心类型

```
World → player.currentPortId, fleet.gold, fleet.ships[].cargo[]
BuyInput  { goodsId, quantity }
BuyResult { world, totalCost }
SellInput { goodsId, quantity }
SellResult { world, revenue, profit, expGained }
```

---

## 买卖流程

### 买入

1. 校验：数量 > 0；金币足够；舱容足够（商品体积 × 数量 ≤ 空闲舱容）
2. 计算买入价：`getBuyPrice()` = 当前价 × (1 + `BID_ASK_SPREAD` / 2)
3. 扣金币，增加货物
   - 已有同种货物：合并数量，加权平均买入价
   - 无同种货物：新增 CargoItem
4. 施加买卖冲击：`applyTradeImpact(isBuy=true)`
5. 返回新 World + totalCost

### 卖出

1. 校验：数量 > 0；货物存在且数量充足
2. 计算卖出价：`getSellPrice()` = 当前价 × (1 - `BID_ASK_SPREAD` / 2)
3. 加金币，扣除货物
4. 计算利润 = 卖出收入 - 加权平均成本
5. 经验转化：`expGained = profit × LEVEL_EXP_RATIO`
6. 施加买卖冲击：`applyTradeImpact(isBuy=false)`
7. 返回新 World + revenue + profit + expGained

---

## 市场价格系统

### 价格模型

```
最终价格 = 均衡价 × (1 + 随机波动) × (1 + 买卖冲击)
```

### 两级价格系数

| 层级 | 作用 | 数据来源 |
|------|------|----------|
| 区域品类系数 | 某品类在该区域的稀缺/丰富程度 | `RegionConfig.basePriceModifiers[category]` |
| 港口商品微调 | 某商品在该港口的额外偏移 | `PortConfig.localPriceModifiers[goodsId]` |

### 均衡价

```
均衡价 = basePrice × 区域品类系数 × 港口商品微调
```

示例：东亚进口原料（系数 1.15）→ 原料均衡价高于基准。

### 买卖价差 (Bid-Ask Spread)

```
买入价 = 当前价 × (1 + BID_ASK_SPREAD / 2)
卖出价 = 当前价 × (1 - BID_ASK_SPREAD / 2)
```

`BID_ASK_SPREAD` = 0.05（5%）

### 买卖冲击

每次买卖对价格施加同向冲击（买入 → 涨，卖出 → 跌）：

```
冲击幅度 = 1 ± TRADE_IMPACT × √quantity × TRADE_IMPACT_DECAY
```

- `TRADE_IMPACT` = 0.05（5%）
- `TRADE_IMPACT_DECAY` = 0.5（衰减系数，批量越大单单位冲击越小）

### 每日推进

每次 `advanceDay()` 对所有港口所有商品执行：

1. **回归：** `price += (basePrice - price) × PRICE_REGRESSION_RATE`（3%/天）
2. **随机波动：** `price ×= 1 ± PRICE_VOLATILITY × uniform()`（±10% 区间）

### 价格存储化

价格不重新随机。`World.market.prices` 持有每个 (portId, goodsId) 的历史价格，买卖冲击和每日回归改变该结构。关闭页面重开价格延续。

---

## 商品配置

| 品类 | 数量 | 商品 | 价格区间 | 体积 |
|------|------|------|----------|------|
| 食品 (food) | 4 | 粮食、茶叶、肉干、干果 | 30-80 | 1-2 |
| 纺织品 (textile) | 4 | 丝绸、棉布、羊毛、亚麻布 | 60-180 | 1-3 |
| 工艺 (craft) | 4 | 瓷器、玻璃器皿、玉石、象牙 | 80-300 | 1-3 |
| 原料 (material) | 7 | 木材、香料、胡椒、黄金、锡、铜、乳香 | 40-500 | 1-4 |

所有商品 tier = 0（无等级门槛）。

---

## 港口配置

12 港口分布在 5 区域，每港口含：
- 坐标 (x, y) → 用于欧几里得距离计算
- 特产 (specialties) → 影响各商品的品类系数
- 危险度 (danger) → 影响航线生存率
- 品类价格微调 (localPriceModifiers)

---

## 区域价格系数

| 区域 | 食品 | 纺织品 | 工艺 | 原料 |
|------|------|--------|------|------|
| 东亚 | 0.9 | 0.8 | 0.85 | 1.15 |
| 印度洋 | 1.0 | 1.05 | 1.1 | 0.8 |
| 非洲 | 0.9 | 1.2 | 1.2 | 0.75 |
| 地中海 | 1.1 | 0.95 | 0.9 | 1.1 |
| 北海 | 0.95 | 1.15 | 1.15 | 1.0 |

< 1 = 产区（便宜），> 1 = 进口（昂贵）。

---

## 领域错误码

| 错误码 | 触发条件 |
|--------|----------|
| `INSUFFICIENT_GOLD` | 金币不足 |
| `INSUFFICIENT_CARGO` | 舱容不足 |
| `INVALID_QUANTITY` | 数量 ≤ 0 |
| `GOOD_NOT_FOUND` | 商品 ID 无效 |
| `CARGO_NOT_FOUND` | 货物不存在或数量不足 |
| `IN_VOYAGE` | 航行中无法交易 |

---

## 依赖关系

- 依赖：`data/goods.ts`, `data/ports.ts`, `data/regions.ts`, `data/formulas.ts`
- 被依赖：等级经验系统（贸易利润 → exp）
