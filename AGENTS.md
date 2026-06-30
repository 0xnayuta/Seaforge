# AGENTS.md — 开发与协同约束规范

## 1. 项目边界与目录职责

### 1.1 项目概述

| 属性 | 内容 |
|---|---|
| 项目名称 | 纵横四海 (Seaforge) |
| 项目类型 | 单人离线航海贸易经营游戏 |
| 灵感来源 | QQ家园《纵横四海》— 仅借鉴核心玩法，不复制原内容 |
| 项目目标 | 现代化重构航海贸易经营体验，将原版 WAP 文字游戏的核心循环用现代 Web 技术呈现 |
| 目标平台 | PC |
| 状态 | Phase 1 MVP（原型开发阶段） |

**核心循环：**

```
查看港口价格 → 购买商品 → 选择目的港
  → 航行（触发随机事件）→ 抵达港口
  → 出售商品 → 获得利润 → 升级船只 → 继续贸易
```

**非目标：** 非复刻版、非即时反应、非社交、非剧情驱动、非 MMORPG。

详见：`docs/specifications/project-positioning.md`

### 1.2 主源码目录（src/）

```
src/
├── app/                          # Next.js App Router（路由 + Server Actions）
│   ├── page.tsx                  # 港口总览 (/) — 有存档时显示港口，无存档时显示存档选择器
│   ├── layout.tsx                # 根布局（导航栏 + 主内容区）
│   ├── HarborDashboard.tsx       # 港口总览 UI 组件
│   ├── NewGameForm.tsx           # 无存档时的"开始航海"按钮
│   ├── SaveSlotList.tsx          # 存档槽位选择/管理 UI 组件（启动页 + /saves 共用）
│   ├── market/
│   │   ├── page.tsx              # 交易所 (/market) — 仅货物交易
│   │   └── actions.ts            # loadMarketView
│   ├── ship/
│   │   ├── page.tsx              # 造船厂 (/ship) — 船只管理 + 装备购买/装卸
│   │   └── actions.ts            # loadShipyardView / buyShipAction / sellShipAction / upgradeComponentAction / repairShipAction
│   ├── cargo/
│   │   ├── page.tsx              # 船舱 (/cargo)
│   │   └── actions.ts            # loadCargoView
│   ├── navigation/
│   │   ├── page.tsx              # 航海图 (/navigation)
│   │   └── actions.ts            # loadNavigationView / updateArmamentLevel
│   ├── voyage/
│   │   ├── page.tsx              # 航行中 (/voyage)
│   │   └── actions.ts            # loadVoyageView / completeVoyage
│   ├── saves/
│   │   └── page.tsx              # 存档管理 (/saves)
│   └── actions/
│       ├── trade.ts              # 买卖 Server Actions (buyGoods / sellGoods)
│       ├── equipment.ts          # 装备 Server Actions (buyEquipmentAction / sellEquipmentAction / equipItemAction / unequipItemAction)
│       ├── travel.ts             # 航行 Server Action (startTravel)
│       ├── new-game.ts           # 新游戏 Server Action (createNewGame)
│       └── save.ts               # 存档管理 Server Actions (manualSave / loadSaveSlot / deleteSaveSlot)
├── components/                   # React 组件（纯渲染，不含游戏规则）
│   ├── ui/                       # 通用 UI 组件
│   │   ├── GameCard.tsx
│   │   ├── Modal.tsx
│   │   └── QuantityInput.tsx
│   ├── CargoHold.tsx
│   ├── MarketPanel.tsx
│   ├── NavigationPanel.tsx
│   ├── ShipyardPanel.tsx
│   └── VoyageScreen.tsx
├── game/                         # 游戏引擎（纯函数领域逻辑，不依赖 React/Next.js/Prisma）
│   ├── domain/                   # 领域层：纯函数 + 类型定义
│   │   ├── types.ts              # World、领域类型、DomainError
│   │   ├── player.ts             # 玩家逻辑（createDefaultWorld / advanceDay）
│   │   ├── market.ts             # 价格计算（初始化、读取、买卖冲击、每日回归）
│   │   ├── trade.ts              # 买卖逻辑（executeBuy / executeSell）
│   │   ├── navigation.ts         # 航行逻辑（getReachablePorts / calcTravelDays / arriveAtPort）
│   │   ├── ship.ts               # 船只逻辑（upgradeShip / repairShip / takeDamage / setArmamentLevel）
│   │   ├── voyage.ts             # 航行中逻辑（startVoyage / generateVoyageEvents / applyVoyageEvents）
│   │   ├── combat.ts             # 战斗逻辑（resolveCombat / applyCombatOutcome）
│   │   └── __tests__/
│   └── view-builder/             # World → GameView 转换器
│       ├── buildGameView.ts      # 入口
│       └── __tests__/
├── data/                         # 游戏内容配置（数据化，可调参数）
│   ├── ports.ts                  # 港口配置（12 港口 × 5 区域）
│   ├── goods.ts                  # 商品配置（16 商品，四大品类）
│   ├── ships.ts                  # 船只配置（2 船只）
│   ├── events.ts                 # 随机事件配置
│   ├── equipment.ts              # 装备配置（9 装备，5 类型，售卖港口绑定）
│   ├── formulas.ts               # 公式常量（航速系数、价格波动系数、回归率）
│   ├── regions.ts                # 区域配置（5 区域：东亚、印度洋、非洲、地中海、北海）
│   └── __tests__/
├── lib/                          # 基础设施
│   ├── prisma.ts                 # Prisma 单例
│   ├── repository.ts             # loadWorld / saveWorld / loadWorldFromSlot / saveWorldToSlot / listSaves / deleteSave
│   ├── domain-errors.ts          # DomainError → 中文消息映射
│   ├── with-transaction.ts       # HOF 事务管道（withActionState / withTransaction）
│   └── __tests__/
├── types/                        # 共享类型
│   ├── game-view.ts              # GameView 类型
│   └── prisma.ts                 # PrismaTransactionClient 类型
└── e2e/                          # Playwright E2E 测试
prisma/
├── schema.prisma                 # 存档表（Save + JSON 列模式，slot 0=自动 / 1-3=手动）
└── migrations/
```

**src/ 边界规则：**

| 目录 | 职责 | 能否包含游戏规则 | 能否引用 React/Next.js/Prisma |
|---|---|---|---|
| `app/` | 路由 + Server Actions（只编排，不实现业务规则） | 否 | 是 |
| `components/` | React UI 组件（纯渲染） | 否 | 是 |
| `game/domain/` | 纯函数 + 类型定义 | **是** | **否**（不依赖任何框架） |
| `game/view-builder/` | World → GameView 转换 | 否 | 否 |
| `data/` | 配置数据 | 否（数据不是规则） | 否 |
| `lib/` | 基础设施（Prisma、repository） | 否 | 是 |
| `types/` | TypeScript 共享类型 | 否 | 否（纯类型） |

详见：`docs/guides/project-structure.md`

### 1.3 文档目录结构（docs/）

```
docs/
├── adr/                          # 架构决策记录（Architecture Decision Records）
│   ├── ADR-0001-server-action-as-entry-point.md
│   ├── ADR-0002-save-and-json-column.md
│   └── ADR-0003-world-and-gameview-separation.md
├── architecture/                 # 系统架构设计（Clean Architecture Lite、数据流、路由、View Builder）
├── specifications/               # 功能规格说明（World 定义、存档系统、项目定位）
├── guides/                       # 开发规范与工作流（Prisma、状态管理、项目结构）
├── roadmap/                      # 路线图（Phase 1 MVP）
├── audits/                       # 审计记录
├── archive/                      # 归档的旧文档
├── assets/                       # 图片等资源文件
└── README.md                     # 文档索引中心
```

**docs/ 各子目录用途：**

| 目录 | 内容类型 | 约束 |
|---|---|---|
| `adr/` | 不可变的已决策记录 | 写后不改，新决策追加新文件 |
| `architecture/` | 系统「如何组织」 | 随架构演进更新，与代码保持同步 |
| `specifications/` | 功能「输入、输出、规则」 | 描述行为而非实现 |
| `guides/` | 怎么做（工作流、规范） | 与 AGENTS.md 互补：这里定义「怎么做」，AGENTS.md 定义「不能做什么、必须做什么」 |
| `roadmap/` | 未来规划 | 每个 Phase 一个文件 |
| `audits/` | 审计日志 | 记录已发现的问题和修复追踪 |

**src/ 与 docs/ 的关系：**

- `src/` — 可执行代码。唯一真相源，文档与代码不一致时以 `src/` 为准
- `docs/` — 解释性文档。必须反映 `src/` 的当前状态，`docs:check` 校验内部链接一致性和元数据合规性
- `AGENTS.md`（本文件）— 宪法总纲。跨规则、跨目录的顶层约束和 AI Agent 行动规范

---

## 2. 核心架构要求

### 2.1 架构宪法（R1-R10）

| ID | 规则 | 详情 |
|---|---|---|
| R1 | 游戏规则必须位于 `src/game/`，禁止出现在 Component / Server Action / Repository 中 | `docs/architecture/clean-architecture-lite.md` |
| R2 | World 只保存游戏事实，不保存 UI 状态 | `docs/specifications/world-definition.md` |
| R3 | 所有写操作必须在 `prisma.$transaction` 内原子执行 | `docs/guides/prisma-usage.md` |
| R4 | Server Action 只编排，不实现业务规则 | `docs/architecture/clean-architecture-lite.md` |
| R5 | SQLite 是持久化层，不参与业务逻辑 | `docs/architecture/data-flow.md` |
| R6 | React 组件只渲染 GameView，不包含游戏规则 | `docs/architecture/clean-architecture-lite.md` |
| R7 | MVP 阶段禁止引入 Zustand | `docs/guides/state-management.md` |
| R8 | 严格区分 Domain World 与 Game View | `docs/architecture/view-builder-design.md` |
| R9 | 存档采用 Save + JSON 列模式 | `docs/specifications/save-system.md` |
| R10 | 状态按 L1 Domain / L2 Navigation / L3 Interaction / L4 Visual 四层分类管理 | `docs/guides/state-management.md` |

> 违反 R1-R10 的提交将在 Code Review 中被驳回。

例外处理：本文件任何规则都可以因合理理由被打破，但必须同时满足：
1. **在代码提交前**与团队达成共识
2. **在代码中注释标注**该行代码违反了哪条规则及理由
3. **更新本文件**记录例外

例外不是漏洞，是经过深思熟虑的设计决策。

### 2.2 Clean Architecture Lite（单向依赖流）

```
Electron Shell → Next.js (App Router)
  │
  ├── React Components (UI Layer)
  │     └── 纯渲染层，只渲染 GameView，不包含任何游戏规则
  │
  ├── Server Actions + UseCase Orchestration
  │     └── 应用入口 + 用例编排。接收请求，调用一个或多个 Domain 函数
  │         完成操作（纯函数），保存存档，返回 GameView。
  │         职责是编排，不是计算。位于 app/actions/ 中。
  │
  ├── Domain / Game Engine (src/game/)
  │     └── 纯函数集合：World → Action → new World
  │         所有游戏规则（价格计算、买卖校验、航行逻辑）都在这里
  │         不依赖 React、Next.js、Prisma、HTTP
  │
  ├── View Builder
  │     └── World → GameView 的转换器，组装渲染所需数据
  │         没有副作用，不修改 World，产物不进入 SQLite
  │
  └── Repository (Prisma)
        └── 数据读写层，只有 SQLite 的读写操作
            不包含业务逻辑，只提供 loadWorld / saveWorld
```

**依赖方向：** 外层依赖内层，内层不感知外层。
`UI → Server Actions (含编排) → Domain（核心）`
`Domain → View Builder（只读 World）→ Repository（Prisma）`

### 2.3 架构一致性决策偏好

项目坚决采用以下演进偏好：

```text
Consistent + Clean + Slightly Breaking（一致、整洁、允许轻微破坏性变更）
优先于
Backward Compatible + Inconsistent + Special-cased（向后兼容、不一致、特殊分支处理）
```

在添加或修改功能前，必须按以下基线自检：

- 是否已有平行模块或类似实现？应镜像哪一个现有结构？
- 是否需要先规范或重构对应的旧结构？
- 相关的测试和文档是否已规划同步更新？
- 是否引入了新的依赖、外部命令，或导致安全边界发生变化？

### 2.4 关键设计决策速查

| 决策 | 文档 |
|---|---|
| Server Action 作为权威入口（非客户端先算） | `docs/adr/ADR-0001-server-action-as-entry-point.md` |
| Save + JSON 列模式存档 | `docs/adr/ADR-0002-save-and-json-column.md` |
| Domain World / GameView 严格分离 | `docs/adr/ADR-0003-world-and-gameview-separation.md` |
| 事务铁律（读→算→写在同一事务内） | `docs/guides/prisma-usage.md` |
| 状态四层分类 | `docs/guides/state-management.md` |
| 平行路由 | `docs/architecture/routing-design.md` |
| 预览 vs 确认原则 | `docs/architecture/view-builder-design.md` |

---

## 3. 高优先级行动规则

以下规则在所有其他规则之上优先遵守。任何提交若违反其中一条，无论其他方面是否合规，都将直接驳回。

### 3.1 领域层纯度守则

```
src/game/ 是禁区：
├── 不允许 import 任何 React / Next.js / Prisma 代码
├── 不允许产生副作用（I/O、网络、日志）
├── 不允许抛出 DomainError 以外的异常类型
├── 不允许包含中文文本——错误只抛 code，展示由 lib/domain-errors.ts 映射
└── 所有函数必须是纯函数：给定相同 World + input → 相同 newWorld
```

**禁止跨越：** Server Action 不能直接调用 Prisma 做复杂查询；React Component 不能直接调用 Domain 函数；Repository（`lib/repository.ts`）不能包含 `if/else` 业务判断。

### 3.2 事务完整性铁律

所有写操作必须严格遵循以下模式：

```
prisma.$transaction(tx => {
  loadWorld(tx)       // 1. 读 → 从 SQLite 取得权威状态
  execute(world)      // 2. 算 → 纯函数计算新 World
  saveWorld(tx, new)  // 3. 写 → 序列化 JSON 写入 SQLite（同一事务）
})
```

- 一个用户操作 = 一个事务。禁止拆分为 `savePlayer` + `saveCargo` 等多步独立写入
- 事务内任一环节抛异常 → **自动回滚**，SQLite 始终处于上一个完整状态
- **不存在** "客户端先算，再异步保存" 的路径（Server Action 是唯一权威入口）

### 3.3 Server Action 权威路径

```
用户操作 → Server Action → loadWorld → execute → saveWorld
  → buildGameView → 返回 GameView → 客户端只渲染
```

- 客户端的职责仅限于渲染 GameView 和展示 L3/L4 交互/视觉状态
- 客户端**不执行**任何价格计算、买卖校验、航行逻辑——这些都在 `src/game/` 的纯函数中
- 用户看到的每个「确认」操作（买、卖、航行、升级）都必须调用 Server Action

### 3.4 状态分类先验

任何新状态加入前，必须先通过「三问公式」分类（详见 §4）：
- 存档保留 → L1 World（SQLite）
- 刷新保留 → L2 URL
- 临时交互 → L3 useState
- 纯视觉 → L4 useState

**严禁**将 L3/L4 临时状态塞入 World 或 SQLite。**严禁**在 MVP 阶段引入 Zustand。

### 3.5 先读后改

- 修改一个未完整审查的文件前，必须先完整阅读该文件
- 严禁仅依赖搜索代码片段（snippets）进行跨文件盲目修改
- 删除任何看似刻意设计的核心功能或现有代码前，必须先询问用户并获显式确认

### 3.6 测试覆盖约束

- `src/game/domain/` 的纯函数**必须**有单元测试（不涉及数据库，给定输入 → 断言输出）
- `src/game/view-builder/` **必须**有单元测试（给定 World → 断言 GameView 结构）
- DomainError 错误路径（钱不够、舱容不够、货物不足、已达最高等级、航行中）**必须**有测试覆盖
- 新增子系统的纯函数或 View Builder 后，不提交无测试覆盖的代码

---

## 4. 状态分类（L1–L4）

### 4.1 四层分类

| 层级 | 内容 | 存放位置 | 特征 |
|---|---|---|---|
| L1 Domain State | 金币、货物、船只、当前港口、天数等游戏事实 | World（SQLite） | 需要存档，影响游戏规则 |
| L2 Navigation State | 当前页面、分类筛选 | URL（路由或 searchParams） | 刷新后应保留，允许书签 |
| L3 Interaction State | 选中的商品、输入数量、选择目标港、弹窗开关 | 组件内 `useState` | 刷新丢失不影响游戏 |
| L4 Visual State | Toast、Tooltip、动画播放 | 组件内 `useState` | 生命周期极短 |

### 4.2 新状态三问公式

```
Q1: 存档时要不要保存？
  ├── 是 → L1 World（SQLite）
  └── 否 → Q2

Q2: 刷新页面后要不要恢复？
  ├── 是 → L2 URL
  └── 否 → Q3

Q3: 只是当前操作过程中的临时选择？
  ├── 是 → L3 useState（Interaction）
  └── 否 → L4 useState（Visual）
```

### 4.3 Zustand 规则

**MVP 阶段禁止引入 Zustand。**

原因：所有 L1 状态在 SQLite 中通过 Server Action 访问，L2 在 URL 中，L3/L4 在 `useState` 中，无跨组件共享需求。Zustand 的成本（引入依赖、学习成本、维护成本）超过其收益。

未来引入条件（须全部满足后才重新评估）：
- 出现实时地图（需要每秒更新位置）
- 出现大量跨组件状态共享
- 出现复杂动画系统
- 出现需要频繁更新的客户端独有状态（非 Server Action 返回）

详见：`docs/guides/state-management.md`

---

## 5. 交互与对话风格

- **简明扼要**：回答须保持极其简练、直击要点，拒绝冗长
- **禁用 Emoji**：严禁在 Commit、Issue、PR 评论、代码注释及任何技术文档中使用表情符号
- **杜绝冗余文本**：禁止包含任何无实质意义的废话、客套话或情绪化填充文本
- **纯技术文本风格**：仅使用技术化专业表述，保持礼貌但直截了当
- **先答后动**：当用户提出问题时，必须先正面回答问题，然后再执行代码修改、运行实现命令或变更操作
- **结果闭环建议**：每轮交互输出末尾，必须明确给出下一轮的操作或演进建议

---

## 6. 代码质量与开发规范

### 6.1 类型与代码规范

- **严格 TypeScript**：`tsconfig.json` 启用 `strict: true`，`paths: { "@/*": ["./src/*"] }`。禁止使用 `any` 类型
- **文件命名规范**：

| 目录 | 命名 | 示例 |
|---|---|---|
| `app/actions/` | kebab-case | `trade.ts` |
| `components/` | PascalCase | `MarketPanel.tsx` |
| `game/domain/` | kebab-case | `market.ts` |
| `game/view-builder/` | PascalCase + `View` | `buildMarketView.ts` |
| `data/` | kebab-case + plural | `ports.ts`、`goods.ts` |
| `lib/` | kebab-case | `prisma.ts` |
| `types/` | kebab-case | `world.ts` |

- **Domain 错误处理**：领域层只抛错码（`DomainError(code)`），不包含展示文本。由 `lib/domain-errors.ts` 将错误码映射为中文消息。**禁止在 Domain 层直接使用中文错误消息**
- **禁止不合理的单行辅助函数**：仅在单一调用点使用的单行函数必须内联到调用处
- **禁止内联导入**：禁止 `await import("./foo.js")`、禁止在类型声明位置使用 `import("pkg").Type`，必须使用标准顶级导入
- **显式检查真实类型**：严禁猜测外部 API 或依赖包的类型定义，必须直接检查 `node_modules` 中的真实类型声明
- **禁止降级避错**：严禁通过删除或降级代码来解决由过期依赖引起的类型错误，必须升级或修复该依赖

### 6.2 架构约束

- **禁止跨越**：同 §3.1 领域层纯度守则
- **事务模板**（所有写操作）：同 §3.2 事务完整性铁律
- **单个事务原则**：一个用户操作 = 一个事务。禁止拆分为 `savePlayer` + `saveCargo` 等多步独立写入
- **Server Action 权威路径**：同 §3.3。客户端只渲染，不做游戏逻辑计算
- **GameView 不进入 SQLite**：计算产物（预估利润、航行天数、价格比较）每次从当前 World 重新计算，不持久化
- **预览 vs 确认原则**：用户确认前的所有展示数据由 View Builder 从当前 World 计算得出，确认后的结果写入 World

### 6.3 命名与契约

- `World` — 游戏事实集合，序列化为 JSON 存入 SQLite（`Save` 模型的 `data` 列）
- `GameView` — 渲染快照，从 World 计算得出，不持久化
- `DomainError(code)` — 领域层仅抛错误码，`lib/domain-errors.ts` 负责映射为用户消息
- `readonly` — 所有 `World` 类型字段使用 `readonly`

### 6.4 更新确认

- 删除任何看似刻意设计的核心功能或现有代码前，必须先询问用户并获显式确认
- 除非用户明确要求，否则无需主动保持向后兼容性

---

## 7. 命令执行与工作流规范

### 7.1 技术栈速查

| 类别 | 选型 |
|---|---|
| 框架 | Next.js 16 (App Router) · React 19 |
| 语言 | TypeScript 5 (strict) |
| 数据库 | SQLite · Prisma 7 · libSQL |
| 包管理 | Bun |
| 代码规范 | Biome 2.2 (format + lint) |
| 测试 | Bun Test（单元）· Playwright（E2E） |
| CSS | Tailwind CSS 4 |

### 7.2 常用命令

| 命令 | 作用 |
|---|---|
| `bun run dev` | 启动开发服务器 (webpack) |
| `bun run build` | 生产构建（`next build`） |
| `bun run test` | 运行单元测试 `src/**/*.test.ts` |
| `bun run lint` | Biome 代码检查 |
| `bun run format` | Biome 自动格式化 |
| `bun run docs:check` | 文档完整性校验 |
| `bunx prisma db push` | 推送 schema 变更到 SQLite |
| `bunx prisma migrate dev --name <desc>` | 创建迁移 |
| `bunx playwright test` | E2E 测试 |

### 7.3 开发校验流程

修改代码后（不含仅文档修改），须在项目根目录执行以下校验：

```bash
bun run build          # 编译检查（必须无错误）
bun run lint           # Biome 代码检查（必须无 warning/error）
bun run test           # 单元测试（必须全部通过）
```

涉及文档完整性、格式化或覆盖率时：

```bash
bun run format         # Biome 格式化
bun run docs:check     # 文档元数据合规校验（必须通过）
```

---

## 8. 文档维护规则

### 8.1 文档生命周期

所有 `docs/` 下的文档按以下状态流转：

```
draft（草稿）→ review（审查中）→ approved（已核准）→ archived（已归档）
```

- **draft**：正在编写或大幅修改中，内容可能不准确
- **review**：等待 Code Review 或团队审阅
- **approved**：已核准，代表当前最新理解。**这是文档的默认目标状态**
- **archived**：已被新文档替代或决策已废弃。保留仅作历史参考

### 8.2 文档规范

- **Frontmatter 必须完整**：每个文档须包含 `status`（`draft`/`review`/`approved`/`archived`）和 `last_verified`（日期，格式 `YYYY-MM-DD`）
- **关联规则标注**：如果文档与 R1-R10 中的规则直接相关，须在文档标题下方标注：`**关联规则：** R1, R4, R6`
- **内部链接使用相对路径**：禁止使用绝对路径或外部链接替代内部文档引用。确保 `docs:check` 通过
- **与 AGENTS.md 的关系**：
  - `docs/guides/` 定义「怎么做」（工作流、编码规范、工具使用）
  - AGENTS.md 定义「不能做什么、必须做什么」（顶层约束、规则表、行动优先级）
  - 两者冲突时，AGENTS.md 优先
- **避免重复**：如果一个规则已在 AGENTS.md 中定义，`docs/guides/` 中的展开文档不应重述规则本身，而应引用 AGENTS.md 中的对应段落

### 8.3 文档与代码一致性

- 文档必须反映 `src/` 的当前状态。修改代码后，关联文档的 `last_verified` 必须同步更新
- 发现文档与代码不一致时，优先更新文档。如果暂时无法更新，将 `status` 改为 `draft` 并记录待办
- AGENTS.md 中的目录树、文件名、规则描述必须与实际代码保持一致。结构变更（重命名、新增目录、修改关键文件）后必须同步更新 §1.2

### 8.4 AGENTS.md 自身维护

- AGENTS.md 是最高优先级文档。修改代码或架构决策后，如果影响 AGENTS.md 中的任意内容（规则表、目录树、行动规则、命令表），必须在同一提交中同步更新 AGENTS.md
- 新增关键决策后，必须更新 §2.4 决策速查表和附录文档索引，并在 `docs/adr/` 中追加 ADR 文件
- 例外记录（§2.1 例外处理第三条）必须紧跟该次修改的提交

---

## 9. 输出结果要求

- 每轮输出的最末尾，必须给出清晰、明确、可操作的下一轮操作或演进建议
- 所有回答必须基于项目真实文件、文档和代码。严禁凭空猜测类型定义、API 行为或现有实现
- 发现文档与实际代码不一致时，优先更新文档。若无法立即修复，将关联文档 `status` 改为 `draft` 并记录待办

---

## 附录：关键文档索引

| 文档 | 内容 | 关联规则 |
|---|---|---|
| `docs/architecture/clean-architecture-lite.md` | 分层总览、调用链、禁止跨越约束 | R1, R4, R6 |
| `docs/architecture/data-flow.md` | 核心数据流、事务边界、Server Action 权威原因 | R3, R5 |
| `docs/architecture/view-builder-design.md` | View Builder 定位、各页面 GameView、预览 vs 确认原则 | R8 |
| `docs/architecture/routing-design.md` | MVP 路由表、平行路由策略、Navigation State 归属 | R10 |
| `docs/guides/state-management.md` | 四层分类、三问公式、Zustand 规则 | R7, R10 |
| `docs/guides/prisma-usage.md` | Prisma 单例、事务模板、Repository 约束 | R3, R5 |
| `docs/guides/project-structure.md` | 目录树、文件命名规范、目录职责 | — |
| `docs/specifications/project-positioning.md` | 项目定位、核心循环、非目标 | — |
| `docs/specifications/world-definition.md` | World 定义、包含/不包含内容、原则 | R2 |
| `docs/specifications/save-system.md` | 存档设计、Prisma 模型、操作 API | R9 |
| `docs/roadmap/phase-1-mvp.md` | MVP 范围、交付清单、完成标准、开发原则 | — |
| `docs/adr/ADR-0001-server-action-as-entry-point.md` | Server Action 作为权威入口的决策 | — |
| `docs/adr/ADR-0002-save-and-json-column.md` | Save + JSON 列模式的决策 | — |
| `docs/adr/ADR-0003-world-and-gameview-separation.md` | World 和 GameView 分离的决策 | — |
