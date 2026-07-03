# 纵横四海 (Seaforge)

Seaforge 是一款单人离线航海贸易经营 × **RPG**。灵感来源于 QQ 家园《纵横四海》——仅借鉴核心玩法，不复制原内容。融合《艾尔登法环》的属性 Build 自由度与《BLACK SOULS》的回合制策略战斗设计。

贸易是经济轴，RPG 是成长轴。

---

## 项目状态

| 阶段 | 状态 |
|------|------|
| Phase 1 MVP（核心循环） | ✅ 已完成 |
| Phase 2 系统深度（舰队/船员/装备/存档） | ✅ 已完成 |
| Phase 3 RPG 底层（人物/物品/NPC/战斗/称号） | ✅ 已完成 |
| Phase 4 内容深度（副本/合成/成就/图鉴） | 🚧 进行中 |

---

## 技术栈

| 类别 | 选型 |
|---|---|
| 框架 | Next.js 16 (App Router) · React 19 |
| 语言 | TypeScript 5 (strict) |
| 数据库 | SQLite · Prisma 7 · libSQL |
| 包管理 | Bun |
| 代码规范 | Biome 2.2 (format + lint) |
| 测试 | Bun Test（单元）· Playwright（E2E） |
| CSS | Tailwind CSS 4 |

---

## 快速开始

**前置条件：** Bun ≥ 1.3

```bash
# 克隆并安装
git clone https://github.com/0xnayuta/Seaforge && cd Seaforge
bun install

# 初始化数据库
bunx prisma generate
bunx prisma db push

# 启动开发服务器 (webpack)
bun run dev
```

浏览器打开 http://localhost:3000 即可游玩。

---

## 可用命令

| 命令 | 作用 |
|---|---|
| `bun run dev` | 启动开发服务器 (webpack) |
| `bun run build` | 生产构建 |
| `bun run start` | 运行生产构建 |
| `bun run test` | 运行单元测试（`src/**/*.test.ts`） |
| `bun run lint` | Biome 代码检查 |
| `bun run format` | Biome 自动格式化 |
| `bun run docs:check` | 文档完整性校验（frontmatter + 内部链接） |
| `bunx prisma db push` | 推送 schema 变更到 SQLite |
| `bunx prisma migrate dev --name <desc>` | 创建迁移 |
| `bunx playwright test` | E2E 测试（Playwright） |

### 开发校验流程

修改代码后依次执行：

```bash
bun run build        # 编译检查（必须无错误）
bun run lint         # Biome 代码检查
bun run test         # 单元测试（全部通过）
bun run docs:check   # 涉及文档变更时执行
```

---

## 项目结构

### 主源码（src/）

```
src/
├── app/                        # Next.js 页面 + Server Actions
│   ├── page.tsx                # 港口总览 (/)
│   ├── layout.tsx              # 根布局（导航栏 + 主内容区）
│   ├── HarborDashboard.tsx     # 港口总览 UI 组件
│   ├── NewGameForm.tsx         # 新游戏按钮
│   ├── SaveSlotList.tsx        # 存档槽位管理组件
│   ├── market/                 # 交易所 (/market)
│   ├── cargo/                  # 船舱 (/cargo)
│   ├── navigation/             # 航海图 (/navigation)
│   ├── ship/                   # 造船厂 (/ship) — 船只管理 + 装备装卸
│   ├── voyage/                 # 航行中 (/voyage)
│   ├── fleet/                  # 舰队总览 (/fleet) — 编队管理
│   ├── tavern/                 # 航海家酒馆 (/tavern) — 船员招募
│   ├── saves/                  # 存档管理 (/saves)
│   └── actions/                # Server Actions（贸易、航行、船员、装备、存档）
├── game/                       # 游戏引擎（纯函数，不依赖框架）
│   ├── domain/                 # 领域逻辑（价格、买卖、航行、舰队、战斗、船员、装备）
│   │   └── __tests__/          # 单元测试
│   └── view-builder/           # World → GameView 转换器
├── data/                       # 游戏数据配置（所有数值可调）
│   ├── ports.ts                # 12 港口 × 5 区域
│   ├── goods.ts                # 19 商品，四大品类
│   ├── ships.ts                # 8 船只，各绑定出售港口
│   ├── equipment.ts            # 9 装备，5 类型，港口绑定
│   ├── events.ts               # 随机事件配置
│   ├── formulas.ts             # 公式常量
│   ├── regions.ts              # 区域配置
│   └── __tests__/              # 数据完整性测试
├── lib/                        # 基础设施
│   ├── prisma.ts               # Prisma 单例
│   ├── repository.ts           # 存档读写（多 slot 支持）
│   ├── domain-errors.ts        # DomainError → 中文消息映射
│   ├── with-transaction.ts     # 事务管道 HOF
│   └── __tests__/
├── types/                      # 共享类型（GameView、Prisma）
├── components/                 # React UI 组件（纯渲染）
│   ├── ui/                     # 通用组件（GameCard、Modal、QuantityInput）
│   ├── MarketPanel.tsx
│   ├── CargoHold.tsx
│   ├── NavigationPanel.tsx
│   ├── ShipyardPanel.tsx
│   ├── FleetPanel.tsx
│   ├── VoyageScreen.tsx
│   ├── TavernPanel.tsx
│   ├── GoodsTable.tsx
│   ├── BuyModal.tsx
│   ├── SellModal.tsx
│   ├── DestinationsTable.tsx
│   └── DepartureConfirmModal.tsx
└── e2e/                        # Playwright E2E 测试
prisma/
├── schema.prisma               # 存档表（Save + JSON 列，0=自动 / 1-3=手动）
└── migrations/                 # 迁移历史
```

### 文档目录（docs/）

```
docs/
├── adr/                        # 架构决策记录（ADR-0001 ~ 0004）
├── architecture/               # 系统架构设计
├── specifications/             # 功能规格说明
├── guides/                     # 开发规范
├── roadmap/                    # 路线图（Phase 1 ~ 5）
├── reference/                  # 原版游戏调研
├── issues/                     # 待解决问题
├── audits/                     # 审计记录
├── archive/                    # 已归档文档
├── assets/                     # 资源文件
└── README.md                   # 文档索引中心
```

详见：[`docs/README.md`](docs/README.md)

---

## 核心架构

### Clean Architecture Lite

```
UI (React Components)
  → Server Actions（编排入口）
  → Domain / Game Engine（src/game/ 纯函数）
    → View Builder（World → GameView，只读）
    → Repository（Prisma → SQLite）
```

**依赖方向：** 外层依赖内层，内层不感知外层。

### 关键约束

| 规则 | 说明 | 文档 |
|---|---|---|
| R1 | 游戏规则必须在 `src/game/`，禁止出现在 Component / Server Action / Repository 中 | [`clean-architecture-lite.md`](docs/architecture/clean-architecture-lite.md) |
| R2 | World 只保存游戏事实，不保存 UI 状态 | [`world-definition.md`](docs/specifications/world-definition.md) |
| R3 | 所有写操作必须在 `prisma.$transaction` 内原子执行 | [`prisma-usage.md`](docs/guides/prisma-usage.md) |
| R4 | Server Action 只编排，不实现业务规则 | [`clean-architecture-lite.md`](docs/architecture/clean-architecture-lite.md) |
| R7 | 禁止引入 Zustand（当前架构不需要） | [`state-management.md`](docs/guides/state-management.md) |

完整规则表（R1-R10）见：[`AGENTS.md`](AGENTS.md) §2.1

### 核心数据流

```
用户操作 → Server Action → loadWorld（读 SQLite）
  → execute（纯函数计算新 World）
  → saveWorld（写 SQLite，同一事务）
  → buildGameView（World → GameView）
  → 返回 GameView → React 渲染
```

- **Server Action 是唯一权威入口**：客户端只渲染，不执行游戏逻辑
- **事务完整性**：读→算→写必须在同一个 `prisma.$transaction` 内完成，任一异常自动回滚
- **状态分类**：L1 World / L2 URL / L3 useState / L4 useState 四层管理

---

## 测试

```bash
# 单元测试（覆盖 domain + view builder + lib）
bun run test

# E2E 测试（需先初始化测试数据库）
DATABASE_URL="file:./prisma/e2e-test.db" bunx prisma db push
bunx playwright test
```

---

## 开发规范

- **严格 TypeScript**：`strict: true`。禁止 `any` 类型
- **Domain 错误处理**：领域层抛 `DomainError(code)`，`lib/domain-errors.ts` 映射为中文消息
- **文件命名**：`game/domain/` 用 kebab-case、`components/` 用 PascalCase
- **测试覆盖**：Domain 纯函数和 View Builder 必须有单元测试

完整开发规范见：[`AGENTS.md`](AGENTS.md)

---

## 许可证

私有项目，仅用于原型验证。

---

## ⚠️ 开发期约定（技术债登记）

### 1. 存档向后兼容性 (Backward Compatibility)
- **当前状态**：由于当前项目处于个人高频迭代的原型开发阶段，**目前完全不考虑旧存档的向后兼容性**。
- **处理机制**：若因后续大量填充游戏内容（增删港口、调整商品品类或微调数值公式）导致 `World` 领域类型结构发生变更，系统在加载旧存档时将**直接抛出显式异常并中断**，绝不进行静默重置。
- **开发者应对**：当遭遇存档解析崩溃时，属于正常预期。开发者只需手动清理 SQLite 数据库文件（或利用相关工具清空 `Save` 表），直接开启新游戏即可。
- **后续规划**：待游戏全部子系统与基础配置彻底定型、准备发布公开测试版前，再统一引入 Schema 版本号管理与数据迁移（Migration）机制。
