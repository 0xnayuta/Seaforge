# 纵横四海 (Seaforge)

Seaforge 是一款单人离线航海贸易经营游戏。灵感来源于 QQ 家园《纵横四海》——仅借鉴核心玩法，不复制原内容。

> 🚧 原型开发阶段（Phase 1 MVP）

---

## 技术栈

| 类别 | 选型 |
|---|---|
| 框架 | Next.js 16 (App Router) · React 19 |
| 语言 | TypeScript 5 (strict) |
| 数据库 | SQLite · Prisma 7 · libSQL |
| 包管理 | Bun |
| 代码规范 | Biome (format + lint) |
| 测试 | Bun Test (单元) · Playwright (E2E) |
| CSS | Tailwind CSS 4 |

---

## 快速开始

**前置条件：** Bun ≥ 1.3

```bash
# 克隆并安装
git clone https://github.com/0xnayuta/voyage-prototype && cd voyage-prototype
bun install

# 初始化数据库
bunx prisma generate
bunx prisma db push

# 启动开发服务器
bun run dev
```

浏览器打开 http://localhost:3000 即可游玩。

---

## 可用命令

| `bun run dev` | 启动开发服务器 (Turbopack) |
| `bun run build` | 生产构建 |
| `bun run start` | 运行生产构建 |
| `bun run test` | 运行单元测试 (Bun Test) |
| `bun run lint` | 代码检查 (Biome) |
| `bun run format` | 自动格式化 (Biome) |
| `bun run docs:check` | 检查文档完整性 |
| `bunx playwright test` | 运行 E2E 测试 |

---

## 项目结构

```
src/
├── app/                    # Next.js 页面与 Server Actions
│   ├── page.tsx            # 港口首页
│   ├── market/             # 交易所
│   ├── cargo/              # 船舱
│   ├── navigation/         # 航海图
│   ├── ship/               # 造船厂
│   ├── voyage/             # 航行页
│   └── actions/            # 公共 Server Actions (贸易、旅行、存档)
├── game/                   # 游戏核心（纯函数，不依赖框架）
│   ├── domain/             # 领域逻辑：贸易、航行、导航、玩家
│   └── view-builder/       # GameView 构建器
├── data/                   # 游戏数据配置（港口、商品、船只）
├── lib/                    # Prisma 客户端、仓库层
├── types/                  # 共享类型
├── components/             # React UI 组件
└── e2e/                    # Playwright E2E 测试
prisma/
├── schema.prisma           # 数据模型
└── migrations/             # 迁移历史
docs/                       # 项目文档（架构决策、规格说明、路线图）
```

---

## 架构

Clean Architecture Lite：四层单向数据流。

```
UI (React) → Server Action → View Builder → Domain → Repository → SQLite
```

- **Domain 层**：纯函数，所有游戏规则在此，不依赖框架
- **Server Action**：只编排，不实现业务规则；调用 Domain 处理世界状态，再通过 View Builder 转换输出
- **View Builder**：将 Domain World 转换为 UI 消费的可序列化 GameView
- **Repository**：通过 Prisma 读写 SQLite，存档采用 Save + JSON 列模式

详见 [`docs/architecture/`](docs/architecture/)。

---

## 测试

```bash
# 单元测试（83 个）
bun run test

# E2E 测试（4 个场景，需先初始化测试数据库）
DATABASE_URL="file:./prisma/e2e-test.db" bunx prisma db push
bunx playwright test
```

---

## 许可证

私有项目，仅用于原型验证。
