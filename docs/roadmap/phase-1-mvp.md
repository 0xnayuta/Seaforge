---
status: draft
last_verified: 2026-06-25
---

# Phase 1: MVP — 核心循环

---

## 目标

实现航海贸易经营的核心循环：**交易 → 航行 → 交易 → 升级**。

最终用户可以完成至少一轮完整的「买 → 航 → 卖 → 升级」闭环。

---

## 架构总览

### 分层

```
Server Action（入口）
  → loadWorld（读存档）
  → UseCase（纯函数计算）
  → saveWorld（写存档，同一事务）
  → View Builder（World → GameView）
  → 返回 GameView（客户端只渲染）
```

### 状态分类

| 层级 | 内容 | 存放位置 |
|---|---|---|
| L1 Domain State | 金币、货物、船只、当前港口、天数 | World（SQLite） |
| L2 Navigation State | 当前页面、分类筛选 | URL 路由 |
| L3 Interaction State | 选中的商品、输入数量、弹窗开关 | `useState` |
| L4 Visual State | Toast、Tooltip、动画 | `useState` |

### 关键设计决策

| 决策 | 文档 |
|---|---|
| Server Action 作为权威入口 | `docs/adr/ADR-0001` |
| Save + JSON 列存档 | `docs/adr/ADR-0002` |
| Domain World / GameView 分离 | `docs/adr/ADR-0003` |
| 事务铁律（读→算→写在同一个事务） | `docs/guides/prisma-usage.md` |
| 禁止 Zustand | `docs/guides/state-management.md` |
| 平行路由 | `docs/architecture/routing-design.md` |

---

## 子阶段划分

### Phase 1.1：骨架搭建（已完成）

建立项目基础设施、游戏引擎、UI 页面骨架，跑通核心数据流。

#### 交付物

| 模块 | 文件 | 状态 |
|---|---|---|
| **基础设施** | `prisma/schema.prisma`、`prisma/migrations/` | ✅ |
| | `src/lib/prisma.ts`（Prisma 7 + libsql adapter） | ✅ |
| | `src/lib/repository.ts`（loadWorld / saveWorld） | ✅ |
| **游戏引擎** | `src/game/domain/types.ts`（World 类型定义） | ✅ |
| | `src/game/domain/player.ts`（创建默认 World） | ✅ |
| | `src/game/domain/market.ts`（价格计算） | ✅ |
| | `src/game/domain/trade.ts`（买入/卖出） | ✅ |
| | `src/game/domain/navigation.ts`（航线/抵达） | ✅ |
| **数据配置** | `src/data/ports.ts`（3 港口 + 航路） | ✅ |
| | `src/data/goods.ts`（5 商品） | ✅ |
| | `src/data/ships.ts`（2 船只） | ✅ |
| | `src/data/formulas.ts`（可调公式常量） | ✅ |
| **View Builder** | `src/game/view-builder/buildGameView.ts`（5 个 view 类型） | ✅ |
| **Server Actions** | `src/app/actions/save.ts`（loadGame） | ✅ |
| | `src/app/actions/trade.ts`（buyGoods / sellGoods） | ✅ |
| | `src/app/actions/travel.ts`（startTravel） | ✅ |
| | 各页面 actions：`market/`、`cargo/`、`navigation/`、`ship/` | ✅ |
| **UI 页面** | `/` — 港口总览 | ✅ |
| | `/market` — 交易所（商品列表 + 购买弹窗） | ✅ |
| | `/cargo` — 船舱（货物列表 + 卖出弹窗） | ✅ |
| | `/navigation` — 航海图（目的地选择 + 出航确认） | ✅ |
| | `/ship` — 造船厂（船只信息 + 升级界面） | ✅ |
| **主题** | `globals.css` — ocean-dark 主题 | ✅ |
| | `layout.tsx` — 导航栏 + 页面布局 | ✅ |
| **架构文档** | `docs/adr/ADR-0001`、`0002`、`0003` | ✅ |
| | `docs/architecture/data-flow.md`（含为什么否掉客户端先算） | ✅ |
| | `docs/architecture/view-builder-design.md`（含预览 vs 确认原则） | ✅ |
| | `docs/guides/state-management.md`（4 层分类 + 三问公式） | ✅ |

#### 验证标准

- `npx next build` 无错误通过
- 所有 5 个路由（`/`、`/market`、`/cargo`、`/navigation`、`/ship`）编译成功
- 点击「开始航海」后进入港口总览页，显示当前港口、天数、金币、舱容
- 可进入交易所查看商品列表和价格
- 可在导航页选择目的地并出航

---

### Phase 1.2：核心循环补齐（计划中）

在骨架上填充让核心循环完整运行所需的功能。

#### 1.2.1 价格波动系统

| 功能 | 说明 |
|---|---|
| 价格随机波动 | 每次操作后所有港口价格轻微波动（已有基础实现：`PRICE_VOLATILITY`） |
| 交易冲击 | 大量买入 → 该港口该商品价格上涨；大量卖出 → 价格下跌 |
| 均值回归 | 每天价格向基础价回归（`PRICE_REGRESSION_RATE`） |
| 每日推进 | 航行出发时推进天数，触发全市场价格刷新 |

**关联模块：** `src/game/domain/market.ts` → 新增 `simulateDayPass(world): World` 纯函数

#### 1.2.2 航行体验

| 功能 | 说明 |
|---|---|
| 航行中页面 | `/voyage` 页面，显示起航港→目的港、预计天数、日志 |
| 抵达逻辑 | 航行天数到达后自动处理抵达，更新 currentPort |
| 随机事件 | 航行中按概率触发事件（文字描述 + 简单效果：丢货/得物） |

**关联文件：** `src/app/voyage/page.tsx`（新建）、`src/game/event/event-resolver.ts`（新建）

#### 1.2.3 船只升级

| 功能 | 说明 |
|---|---|
| 升级 Server Action | `upgradeShip` — 扣金币 + 提升等级 + 增加容量 |
| UI 联动 | `/ship` 页调用升级 action，刷新 view |

**关联文件：** `src/app/actions/ship.ts`（新建）、`src/game/domain/ship.ts`（已有 `upgradeLevel` 计算）

#### 1.2.4 存档增强

| 功能 | 说明 |
|---|---|
| 读档界面 | 启动时自动读取存档，不显示空白页 |
| 刷新保持 | 所有页面支持 `loadGame` 恢复状态（当前 harbor 页已实现） |

#### 1.2.5 测试覆盖

| 范围 | 内容 |
|---|---|
| 单元测试 | `src/game/domain/` 所有纯函数 |
| | `executeBuy` 正常路径 + 边界（钱不够、舱容不够） |
| | `executeSell` 正常路径 + 边界（货物不足） |
| | 价格计算、航行天数计算 |
| View Builder | 每个 view builder 函数对已知 World 输出确定 GameView |

---

## 必须实现（完整清单）

### 港口系统
- [x] 港口定义（名称、区域、描述）
- [x] 港口特产和价格系数
- [x] 港口间距离配置

### 商品系统
- [x] 商品定义（名称、分类、基础价格、单位体积）
- [x] 商品和港口的关联（每个港口的买入/卖出价不同）

### 买卖系统
- [x] 在港口查看商品列表和价格
- [x] 买入商品（扣金币、增加货舱、加货物）
- [x] 卖出商品（加金币、减货物）
- [x] 货舱容量管理
- [x] 利润计算

### 航行系统
- [x] 查看可前往港口列表
- [x] 选择目的港
- [x] 航行耗时计算（距离 / 船速）
- [x] 抵达逻辑（更新当前港口）
- [x] 航行中画面（/voyage 页）
- [x] 航行中随机事件触发

### 价格波动系统
- [x] 不同港口同一商品不同价
- [x] 买入/卖出影响该港口该商品价格
- [x] 市场均值回归
- [x] 天数推进触发价格刷新

### SQLite 存档
- [x] Save + JSON 列模式
- [x] 自动存档（每次操作后写入）
- [x] 读档恢复
- [x] 启动时自动读取存档（有存档直接进入，无存档显示开始按钮）

### 船只升级
- [x] 升级 Server Action（扣金币 + 加容量）
- [x] 升级后 UI 刷新
### 测试
- [x] 游戏引擎纯函数单元测试（domain: 50 tests）
- [x] View Builder 单元测试（18 tests）

---

## 暂不实现

以下内容明确不属于 Phase 1 范围：

| 功能 | 备注 | 预计 Phase |
|---|---|---|
| 战斗系统 | 航行中遇敌战斗 | Phase 3 |
| 公会系统 | 多人社交功能 | 不计划（单机版） |
| 排行榜 | 需要多人数据 | 不计划 |
| 聊天系统 | — | 不计划 |
| 联机功能 | — | 不计划 |
| 成就系统 | 长线留存 | Phase 4 |
| 图鉴系统 | 收集要素 | Phase 4 |
| 剧情系统 | 主线故事 | Phase 3 |
| MOD 支持 | 外部扩展 | Phase 5 |
| 多个手动存档位 | 当前只有 slot 0 自动存档 | Phase 2 |
| 图形地图 | 当前使用文字列表 | Phase 3 |
| 音效和音乐 | — | Phase 4 |
| 动画 | — | Phase 5 |
| Zustand | 当前架构不需要 | 见下方 |

### Zustand 引入条件

以下条件全部满足时才考虑：
- 出现实时地图（需要每秒更新位置）
- 出现大量跨组件状态共享
- 出现复杂动画系统
- 出现需要频繁更新的客户端独有状态（非 Server Action 返回）

当前架构下，L1-L4 状态分类已覆盖所有场景，Zustand 的成本大于收益。

---

## 开发原则

1. **先完成核心循环（买 → 卖 → 航 → 升级），再加入更多内容**
   - Phase 1 只做这个循环，不做横向扩展

2. **所有数值配置化（`src/data/`），方便调整平衡性**
   - 港口、商品、船只、公式常量均在 `src/data/` 中
   - 调参数不需要改逻辑代码

3. **避免过度设计——只做当前必要的，不为「以后可能需要」提前做**
   - Version 乐观锁：Phase 1 不做（`disabled={isPending}` 已够用），Phase 2 引入自动航行时再加
   - 存档拆表：Phase 1 用 JSON 列，World 结构稳定后再拆

4. **World 只保存游戏事实，绝不保存 UI 状态**
   - 不把「选中了什么」「输入了什么」写入存档
   - L3/L4 状态仅存活在 `useState` 中，刷新即丢失

5. **每完成一个子系统，写测试覆盖关键路径**
   - Domain 纯函数必须测试（不涉及数据库）
   - View Builder 必须测试（给定 World → 确定 GameView）

6. **事务铁律**
   - 所有写操作：读 → 算 → 写 在同一个 `prisma.$transaction` 内
   - 不存在 `savePlayer()` `saveCargo()` 这样的独立写入

---

## 完成标准

### 硬性条件（必须满足）

- [x] 可以完成至少一轮完整的「买 → 航 → 卖」循环
- [x] 可以退出游戏后重新加载，从存档恢复
- [x] 至少 3 个港口、5 种商品、2 种船只
- [ ] 价格随供需波动，跑过多次后利润变化
- [ ] 航行过程有文字反馈和可选的随机事件体验
- [ ] 船只可升级
- [ ] `npx next build` 无错误
- [ ] 游戏引擎纯函数测试全部通过
- [ ] 无 Zustand 依赖

### 质量条件（建议满足）

- [ ] UI 无控制台报错
- [ ] 价格公式给出了合理的利润空间（单次跑商利润在 20%-200% 之间）
- [ ] 数据配置中的数值经过一轮基础平衡
- [ ] 存档恢复后状态完全一致（金币、货物、位置）

---

## 参考文档

| 主题 | 文档 |
|---|---|
| 项目定位与核心循环 | `docs/specifications/project-positioning.md` |
| World 定义（什么进存档，什么不进） | `docs/specifications/world-definition.md` |
| 存档系统设计 | `docs/specifications/save-system.md` |
| Clean Architecture 分层 | `docs/architecture/clean-architecture-lite.md` |
| 数据流（操作→存档→视图） | `docs/architecture/data-flow.md` |
| View Builder（World → GameView） | `docs/architecture/view-builder-design.md` |
| 路由设计 | `docs/architecture/routing-design.md` |
| 状态管理（4 层分类 + 三问公式） | `docs/guides/state-management.md` |
| Prisma 使用规范（事务铁律） | `docs/guides/prisma-usage.md` |
| 项目结构 | `docs/guides/project-structure.md` |
| ADR-0001: Server Action 权威入口 | `docs/adr/ADR-0001-server-action-as-entry-point.md` |
| ADR-0002: Save + JSON 列 | `docs/adr/ADR-0002-save-and-json-column.md` |
| ADR-0003: World 与 GameView 分离 | `docs/adr/ADR-0003-world-and-gameview-separation.md` |
| 架构宪法 | `AGENTS.md` |
