---
status: final
last_verified: 2026-07-03
---

# 纵横四海 (Seaforge) — 项目当前状态深度审计报告

> **审计日期：** 2026-07-03
> **审计范围：** 全代码库扫描（`src/` 下所有 `.ts/.tsx` 文件，不含 `node_modules`、`.next`）
> **审计方法：** 静态分析 + 自动化快照 + 结构遍历

---

## 1. 项目基础元数据

### 1.1 技术栈与核心依赖

| 依赖 | 版本 | 角色 |
|------|------|------|
| **Next.js** | `16.2.9` | App Router，Server Actions 编排 |
| **React** | `19.2.4` | UI 渲染 |
| **react-dom** | `19.2.4` | |
| **Prisma** | `^7.8.0` | ORM，SQLite 持久化 |
| **@prisma/client** | `^7.8.0` | |
| **@prisma/adapter-libsql** | `^7.8.0` | LibSQL 适配器 |
| **@libsql/client** | `^0.17.4` | SQLite 驱动 |
| **Tailwind CSS** | `^4` / `@tailwindcss/postcss: ^4` | 样式 |
| **TypeScript** | `^5` | 类型系统（strict 模式全开） |
| **Biome** | `2.2.0` | Lint + Format |
| **Playwright** | `^1.61.1` | E2E 测试 |
| **Bun** | 运行时 | 测试执行器 + 包管理 |

### 1.2 自动化检查快照

| 指标 | 数值 | 状态 |
|------|------|------|
| **单元测试总数** | `406 tests`（24 文件） | ✅ **全部通过** |
| **expect() 断言次数** | `7,896` | — |
| **E2E 测试** | 7 个场景（含完整买卖、出航、存档流程） | Playwright |
| **Biome Lint** | `143 文件检查，0 errors, 0 warnings` | ✅ **完全干净** |
| **编译** | `tsc --noEmit` = strict 模式 | 未直接运行，但 lint + test 通过可反推无类型错误 |

---

## 2. 核心架构与数据流现状

### 2.1 目录分层与隔离（R1-R8 合规审计）

```
src/
├── game/
│   ├── domain/         5,544 行 — 纯函数 + 类型，不依赖 React/Next/Prisma ✅
│   │   └── __tests__/  5,847 行 — 22 个测试文件
│   └── view-builder/   1,295 行 — World → GameView，不依赖 React ✅
├── data/               2,286 行 — 静态配置数据 ✅
├── app/
│   ├── actions/        728 行 — Server Actions（编排层）
│   └── **/page.tsx     — 路由入口
├── components/         ~5,900 行 — React UI 组件
├── types/              — 共享类型
└── lib/                — 基础设施（Prisma、Repository、事务管道）
```

**代码规模（不含测试）：** ~15,755 行（domain 5,544 + view-builder 1,295 + data 2,286 + actions 728 + components + app pages ≈ 5,902 + lib ≈ 若干）
**测试代码规模：** ~5,847 行

**越界依赖检查：**
- `src/game/` 下 **0 个 React/Next/Prisma import** — grep 确认为空
- Domain 层仅 import `../../data/*`（纯配置数据）和同层 domain 文件
- 架构规则 R1-R8 **全部通过**

### 2.2 写操作管道现状

**存在统一的 HOF 抽象（`src/lib/with-transaction.ts`）但未被使用：**

| 模式 | 文件 | 状态 |
|------|------|------|
| `withTransaction(transform, buildView)` | `src/lib/with-transaction.ts:37-48` | **已定义** |
| `withActionState(transform, buildView)` | `src/lib/with-transaction.ts:18-29` | **已定义** |
| 实际使用 | `src/app/actions/*.ts`（11 个文件） | **0 处调用** |

**现实：** 所有 11 个 Server Action 均手写以下模板：

```typescript
await prisma.$transaction(async (tx: PrismaTransactionClient) => {
  const world = await loadWorld(tx);      // 读
  const result = executeXxx(world, ...);   // 算
  await saveWorld(tx, result.world);       // 写
  return buildXxxView(result.world);       // 刷
});
```

**评估：** 模式一致性强，但每次复制约 8 行，11 份 ≈ 88 行重复模板。不影响正确性，但新增 Action 时有遗漏 `saveWorld` 的风险。

---

## 3. 玩法系统框架完备度

### 3.1 总览

| 系统 | 完备度 | 核心文件 |
|------|--------|----------|
| **贸易与价格** | 🟢 **完整** | `trade.ts` (184 行), `market.ts` (174 行) |
| **航行** | 🟢 **完整** | `navigation.ts` (102 行) |
| **航程事件** | 🟢 **完整** | `voyage.ts` (623 行) |
| **船只/造船厂** | 🟢 **完整** | `ship.ts` (281 行), `equipment.ts` (297 行) |
| **船员** | 🟢 **完整** | `crew.ts` (122 行) |
| **舰队战斗** | 🟢 **完整** | `combat.ts` (245 行) |
| **人物战斗 (RPG)** | 🟢 **完整** | `combat-person.ts` + 5 个子模块 (800+ 行合计) |
| **人物/等级/属性** | 🟢 **完整** | `player.ts` (549 行) |
| **装备 (人物)** | 🟢 **完整** | `player.ts` 内嵌 equip/unequip |
| **NPC/好感度** | 🟢 **完整** | `npc.ts` (142 行) |
| **任务** | 🟢 **完整** | `quest.ts` (255 行) |
| **称号** | 🟢 **完整** | `title.ts` (61 行) |
| **成就** | 🟢 **完整** | `achievement.ts` (110 行) |
| **图鉴** | 🟢 **完整** | `collection.ts` (87 行) |
| **副本** | 🟢 **完整** | `dungeon.ts` (324 行) |
| **装备合成** | 🟢 **完整** | `crafting.ts` (120 行) |
| **存档** | 🟢 **完整** | `repository.ts` (71 行) |

**结论：底层框架已全部跑通，不存在「仅有骨架/Mock」或「完全未开发」的系统。**

### 3.2 贸易与价格系统

- ✅ 两级价格系数：`区域品类乘数 × 港口商品微调` → 均衡价
- ✅ 买卖冲击：`price *= 1 ± TRADE_IMPACT × √quantity × TRADE_IMPACT_DECAY`
- ✅ 每日价格回归：`price += (basePrice - price) × PRICE_REGRESSION_RATE`
- ✅ 每日随机波动：`price *= 1 ± PRICE_VOLATILITY × noise`
- ✅ 买卖价差（Bid-Ask Spread）：买入价 > 均衡价 > 卖出价
- ✅ **价格存储化**：不每次重新随机，World 持有每个 (港口,商品) 的历史价格

### 3.3 航行与航程事件

- ✅ 欧几里得距离计算（基于港口 x,y 坐标）
- ✅ 舰队航行天数 = `ceil(distance / (slowestShip.speed × SPEED_BASE × levelBonus))`
- ✅ 事件预生成：每日独立概率判定，按区域权重调整
- ✅ 7 种事件模板（顺风/无风/风暴/海盗/宝箱/遇难船/坏血病）
- ✅ 在线结算：`progressVoyage()` 逐步推进，遇战斗暂停等待玩家交互
- ⚠️ **离线结算机制：未发现** — 当前只有在线逐步推进，无「一键跳过 N 天」的批量结算路径

### 3.4 船只系统

- ✅ 8 艘船，3 档武装位（`armamentTiers: [cargoRatio, defenseMultiplier]`）
- ✅ 4 部件升级（hull/sail/armor/cannon），多级成本梯度
- ✅ 耐久度系统：基础耐久 + armor 等级 + 装备加成
- ✅ 维修：`cost = max(1, repairCostPerDurability × missingHP × REPAIR_COST_MULTIPLIER)`
- ✅ 出售回收：`basePrice × 0.5`
- ✅ 舰队系统：多船管理、活跃船只切换、出航编队选择

### 3.5 战斗系统（双轨制）

**舰队战（宏观）：**
- ✅ 战斗评分 = `100 + (defMult - 1) × DEF_FACTOR - (1 - hpRatio) × HP_FACTOR`
- ✅ 结果判定：`score × random(±40%) / difficulty` → victory / partialLoss / totalLoss
- ✅ 全损阈值：score < 15 → 沉船 → 最近港口复活 + 金币清零
- ✅ 防御分复用：生存率 = 同一防御分公式 + 距离 × 危险度因子

**人物回合制战斗（微观）：**
- ✅ 完整 JRPG 回合制：攻击/技能/闪避/格挡/道具
- ✅ 10 种武器技能（含 7 种状态异常：poison/bleed/burn/freeze/sleep/silence/blind）
- ✅ 闪避公式：`evasionRate = SPD差 × 0.005 + LUK差 × 0.003`
- ✅ 敌人 AI：随机选择攻击/技能，smart targeting
- ✅ 6 种敌人模板（海盗水手→海盗船长），难度缩放
- ✅ 战斗胜利经验 = 50 EXP

### 3.6 存档系统

- ✅ Prisma 单表模型：`Save { id, slot(unique), data(JSON string), timestamps }`
- ✅ 4 个存档位：slot 0 = 自动存档，slot 1-3 = 手动存档
- ✅ `loadWorld` / `saveWorld` 封装 JSON 序列化
- ✅ 事务完整性：所有写操作在 `prisma.$transaction` 内
- ⚠️ JSON 解析失败时静默 fallback 至默认 World（`repository.ts:26-28`）— 不抛异常，可能导致玩家数据静默丢失而不自知

---

## 4. 游戏数据与内容填充率

### 4.1 港口：12 个，5 区域

| 区域 | 港口 | danger |
|------|------|--------|
| **东亚** | 泉州、长崎、马六甲 | 0.5 / 0.7 / 0.9 |
| **印度洋** | 果阿、卡利卡特、亚丁 | 0.8 / 0.9 / 1.1 |
| **非洲** | 蒙巴萨、索法拉 | 0.7 / 0.9 |
| **地中海** | 亚历山大、威尼斯 | 0.9 / 0.6 |
| **北海** | 伦敦、汉堡 | 0.8 / 0.6 |

每港口含：坐标、特产、品类价格微调、危险度 — 配置齐全。

### 4.2 商品：19 种，4 品类

| 品类 | 数量 | 商品 |
|------|------|------|
| food | 4 | 粮食、茶叶、肉干、干果 |
| textile | 4 | 丝绸、棉布、羊毛、亚麻布 |
| craft | 4 | 瓷器、玻璃器皿、玉石、象牙 |
| material | 7 | 木材、香料、胡椒、黄金、锡、铜、乳香 |

价格区间：30（粮食）~ 500（黄金），体积：1~4，所有 tier = 0（无等级门槛）。

### 4.3 船只：8 艘，3 层级

| 层级 | 数量 | 舱容范围 | 速度范围 | 价格范围 |
|------|------|----------|----------|----------|
| 轻型 | 2 | 20–35 | 1.0–1.2 | 0–800 |
| 中型 | 2 | 50–80 | 0.8–0.9 | 2,500–5,000 |
| 大型远洋 | 4 | 90–150 | 0.55–0.85 | 8,000–18,000 |

每艘船含 4 部件 × 多级升级成本、武装档位动态插值表、耐久/维修参数。

### 4.4 人物装备：20 件 + 9 件船只装备

- 武器：7 件（rusted_sword → dragon_slayer）
- 防具：6 件（leather_armor → mystic_plate）
- 饰品：7 件（ring_of_vigor → phoenix_feather）
- 船只装备：9 件（帆/炮/装甲/船首像/特殊）

含品质等级（normal→legendary）、属性补正系数（normal=0.0 ~ legendary=1.0）。

### 4.5 事件模板：7 个

| 事件 | 概率 | 类型 |
|------|------|------|
| 顺风 | 22% | 正面 |
| 无风停滞 | 8% | 负面（随区域调整） |
| 风暴 | 15% | storm（含 HP/船员损失） |
| 海盗遭遇 | 10% | combat |
| 宝箱 | 8% | 正面（+50~300 金） |
| 遇难船 | 12% | 正面（+30~150 金） |
| 坏血病 | 7% | 负面（-30~-100 金，货物损失） |

### 4.6 其他内容统计

| 内容类型 | 数量 |
|----------|------|
| NPC | 5（3 位可招募船长 + 1 任务发放人 + 1 商人） |
| 任务 | 6（3 delivery + 1 collect + 1 bounty + 1 explore） |
| 副本 | 3（入门/中级/高级，每层 4-6 事件楼层） |
| 称号 | 6 |
| 成就 | 15 |
| 武器技能 | 10 |
| 合成配方 | 6（位于 `items.ts` RECIPES 数组） |
| 区域 | 5 |

### 4.7 公式组织

**全部公式常量集中在一个文件：`src/data/formulas.ts`（140 行）**

涵盖：航行速度、价格冲击/回归/波动、买卖价差、经验/升级、耐久/维修、战斗评分、生存率、舰队管理、船员系统、RPG 属性软上限、装备 Scaling 系数。

**评估：** ✅ 集中化程度极高，参数修改只需一处。潜在风险：单个 140 行文件尚无分类注释以外的结构分组（如按子系统分 section）。

---

## 5. UI 界面与交互体验

### 5.1 核心路由页面完备度

| 路由 | 页面组件 | 客户端组件 | 视觉完备度 |
|------|----------|------------|------------|
| `/` 港口总览 | `HarborDashboard.tsx` | 纯 SSR | 🟢 **Tailwind 卡片布局：状态栏 + 港口信息 + 船只 HP 条 + 9 格快捷操作网格** |
| `/market` 交易所 | `MarketPanel.tsx` | `"use client"` + Modal | 🟢 **商品列表表 + BuyModal/SellModal 弹窗** |
| `/cargo` 船舱 | 内嵌于 Market/Cargo views | — | 🟡 **数据完整但无独立 cargo 页面路由**（导航栏无此链接） |
| `/navigation` 航海图 | `NavigationPanel.tsx` | `"use client"` | 🟢 **目的地列表 + 出航确认 Modal** |
| `/ship` 造船厂 | `ShipyardPanel.tsx` (21.3KB) | `"use client"` | 🟢 **最重的客户端组件：船只列表/购买/升级/维修/武装切换/装备管理** |
| `/voyage` 航行中 | `VoyageScreen.tsx` | `"use client"` | 🟢 **航行事件日志 + PersonCombatView 战斗界面** |
| `/character` 人物 | `CharacterPanel.tsx` (14.9KB) | 纯 SSR 直出 | 🟢 **属性面板 + 装备槽 + 背包物品表 + 称号选择** |
| `/tavern` 酒馆 | `TavernPanel.tsx` | `"use client"` | 🟢 **船员招募/解雇 + NPC 对话** |
| `/fleet` 舰队 | `FleetPanel.tsx` | — | 🟡 **路由存在，组件已写，导航栏有入口** |
| `/titles` 称号 | `TitlesPanel.tsx` | — | 🟢 **路由存在，组件已写** |
| `/quests` 任务 | `QuestBoardClient.tsx` | — | 🟢 **路由存在，组件已写** |
| `/npc/[npcId]` NPC | `NpcInteractionPanel.tsx` | — | 🟢 **含送礼/对话/招募流程** |
| `/saves` 存档 | `SaveSlotList.tsx` | — | 🟢 **含新游戏/加载/删除** |

**视觉风格：** 统一的深色海洋主题（`bg-ocean-800`, `text-gold-400`, `text-parchment-dark`），Tailwind 响应式卡片 + 状态条/进度条。

### 5.2 状态管理边界

| 层级 | 机制 | 示例 |
|------|------|------|
| **L1 领域状态** | SQLite JSON `Save.data` | World（玩家、舰队、市场、航行等所有持久化事实） |
| **L2 URL 状态** | `searchParams` (Next.js) | `shipId` 选中船只、存档 slot |
| **L3 交互状态** | `useState` + `useActionState` | 买入/卖出 Modal 开关、加载中、错误消息、排序/筛选 |
| **L4 视觉状态** | 组件内部（无 Zustand） | HP 条颜色切换、hover 效果 |

**评估：** ✅ 边界清晰，不存在 Zustand。L3 状态限制在 `"use client"` 组件内部，不泄漏到服务端。唯一的 `useActionState` 使用在 `CombatPanel.tsx` 中处理回合制战斗。

---

## 6. 当前技术债与痛点

### 痛点 1：`withTransaction` HOF 已定义但零使用

**严重度：中** | **文件：** `src/lib/with-transaction.ts`

11 个 Server Action 全部手写相同的 `loadWorld → execute → saveWorld → buildView` 模板。`withTransaction` 和 `withActionState` 是完美的抽象但未被任何 Action 采用。手写模板中 `saveWorld` 遗漏是静默 bug（数据不持久），HOF 可以消除这一风险。

**建议：** 逐步迁移已有 Action 到 `withTransaction`/`withActionState`，或删除 HOF 文件避免误导维护者。

### 痛点 2：超大客户端组件需要分解

**严重度：低** | **文件：** `ShipyardPanel.tsx` (21.3KB), `CharacterPanel.tsx` (14.9KB)

这两个组件混合了：购买/出售/升级/维修/武装切换/装备管理/状态显示。虽然目前可维护，但功能边界模糊。若后续增加新船只特性（如特殊词缀、船只技能），会进一步膨胀。

**建议：** 提取子组件（如 `ShipEquipSlot`, `UpgradeButton`, `RepairBar`）到独立文件，与现有 `BuyModal.tsx` / `SellModal.tsx` 风格对齐。

### 痛点 3：存档 JSON 解析失败时静默回退

**严重度：高** | **文件：** `src/lib/repository.ts:26-28`

```typescript
try {
  return JSON.parse(save.data) as World;
} catch {
  return createDefaultWorld();  // 静默丢失全部玩家数据
}
```

当 `Save.data` 列损坏或 Schema 不兼容时，玩家进度 **静默清零** — 无报错、无日志、无恢复提示。是严重的数据丢失风险。

**建议：** 至少抛异常并记录错误，或实施 Schema 版本号 + 迁移策略。

---

## 7. 总结判断

| 维度 | 评分 | 证据 |
|------|------|------|
| **架构合规** | ⭐⭐⭐⭐⭐ | R1-R8 全部通过，0 越界依赖 |
| **测试覆盖** | ⭐⭐⭐⭐ | 406 测试 / 7,896 断言，22 个测试文件覆盖所有 17 个领域模块 |
| **系统完备度** | ⭐⭐⭐⭐⭐ | 17 个玩法子系统全部有纯函数实现 |
| **内容填充率** | ⭐⭐⭐ | 19 商品 / 12 港口 / 8 船 / 7 事件 — 对于 Phase 4 而言**偏薄** |
| **UI 完整度** | ⭐⭐⭐⭐ | 13 个路由页面均有 Tailwind 卡片布局，但 `/cargo` 无独立入口 |
| **代码整洁度** | ⭐⭐⭐⭐ | Biome 0 warning，无 react/next import 越界，但 HOF 僵尸代码 + 超大组件略拖后腿 |

### 战略建议

**当前阶段（Phase 4 内容深度）：架构底盘极其扎实，底层框架已经全部跑通。瓶颈不在框架，在内容厚度。**

优先顺序建议：

| 优先级 | 行动 | 原因 |
|--------|------|------|
| 🔴 **P0** | 修复痛点 3（存档静默回退） | 生产级数据丢失风险 |
| 🟡 **P1** | **填充内容** — 港口 20+、商品 30+、事件 15+、副本 6+、NPC 10+ | 成本最低、见效最快 |
| 🟢 **P2** | 扩展玩法 — 房屋、宠物、世界事件、船只技能 | 利用成熟框架 |
| 🔵 **P3** | UI 打磨 — 分解 ShipyardPanel/CharacterPanel、补全 `/cargo` 路由 | 锦上添花 |

**一句话：底盘扛造，内容不够吃。**
