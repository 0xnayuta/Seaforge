# AGENTS.md — 开发与协同约束规范

## 1. 项目概述

### 1.1 项目简述

| 属性 | 内容 |
|---|---|
| 项目名称 | 纵横四海 (Seaforge) |
| 项目类型 | 单人离线航海贸易经营游戏 |
| 目标平台 | PC |
| 状态 | Phase 3 内容深度（Content Depth）— 进行中 |

**核心循环：**

```
查看港口价格 → 购买商品 → 选择目的港
  → 航行（触发随机事件）→ 抵达港口
  → 出售商品 → 获得利润 → 升级船只 → 继续贸易
```

**非目标：** 非复刻版、非即时反应、非社交、非剧情驱动、非 MMORPG。

详见 `docs/specifications/project-positioning.md`

### 1.2 src/ 边界规则

| 目录 | 职责 | 能否包含游戏规则 | 能否引用 React/Next.js/Prisma |
|---|---|---|---|
| `app/` | 路由 + Server Actions（只编排，不实现业务规则） | 否 | 是 |
| `components/` | React UI 组件（纯渲染） | 否 | 是 |
| `game/domain/` | 纯函数 + 类型定义 | **是** | **否**（不依赖任何框架） |
| `game/view-builder/` | World → GameView 转换 | 否 | 否 |
| `data/` | 配置数据 | 否（数据不是规则） | 否 |
| `lib/` | 基础设施（Prisma、repository） | 否 | 是 |
| `types/` | TypeScript 共享类型 | 否 | 否（纯类型） |

### 1.3 docs/ 各子目录用途

| 目录 | 内容类型 | 约束 |
|---|---|---|
| `adr/` | 不可变的已决策记录 | 写后不改，新决策追加新文件 |
| `architecture/` | 系统「如何组织」 | 随架构演进更新，与代码保持同步 |
| `specifications/` | 功能「输入、输出、规则」 | 描述行为而非实现 |
| `guides/` | 怎么做（工作流、规范） | 与 AGENTS.md 互补：这里定义「怎么做」，AGENTS.md 定义「不能做什么、必须做什么」 |
| `roadmap/` | 未来规划 | 每个 Phase 一个文件 |
| `reference/` | 调研与参考资料 | 原版游戏分析等外部来源 |
| `issues/` | 待解决技术问题 | 讨论中的争议与决策前置 |
| `audits/` | 审计日志 | 记录已发现的问题和修复追踪 |
| `archive/` | 废弃与历史文档 | 只增不删，历史是有效参考 |
| `assets/` | 图片、图表等资源文件 | 架构图、截图等 |

---

## 2. 架构宪法

### 2.1 R1-R10

| ID | 规则 | 详情 |
|---|---|---|
| R1 | 游戏规则必须位于 `src/game/`，禁止出现在 Component / Server Action / Repository 中 | `docs/architecture/clean-architecture-lite.md` |
| R2 | World 只保存游戏事实，不保存 UI 状态 | `docs/specifications/world-definition.md` |
| R3 | 所有写操作必须在 `prisma.$transaction` 内原子执行 | `docs/guides/prisma-usage.md` |
| R4 | Server Action 只编排，不实现业务规则 | `docs/architecture/clean-architecture-lite.md` |
| R5 | SQLite 是持久化层，不参与业务逻辑 | `docs/architecture/data-flow.md` |
| R6 | React 组件只渲染 GameView，不包含游戏规则 | `docs/architecture/clean-architecture-lite.md` |
| R7 | 禁止引入 Zustand（当前架构不需要） | `docs/guides/state-management.md` |
| R8 | 严格区分 Domain World 与 Game View | `docs/architecture/view-builder-design.md` |
| R9 | 存档采用 Save + JSON 列模式 | `docs/specifications/save-system.md` |
| R10 | 状态按 L1 Domain / L2 Navigation / L3 Interaction / L4 Visual 四层分类管理 | `docs/guides/state-management.md` |

> 违反 R1-R10 的提交将在 Code Review 中被驳回。

例外处理：本文件任何规则都可以因合理理由被打破，但必须同时满足：
1. **在代码提交前**与团队达成共识
2. **在代码中注释标注**该行代码违反了哪条规则及理由
3. **更新本文件**记录例外

### 2.2 依赖方向

外层依赖内层，内层不感知外层：`UI → Server Actions → Domain（核心）`，`Domain → View Builder（只读 World）→ Repository（Prisma）`。

### 2.3 演进偏好

```
Consistent + Clean + Slightly Breaking（一致、整洁、允许轻微破坏性变更）
优先于
Backward Compatible + Inconsistent + Special-cased（向后兼容、不一致、特殊分支处理）
```

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
| 单船→舰队重构提前至 Phase 2（ADR-0004） | `docs/adr/ADR-0004-ship-to-fleet-in-phase2.md` |

---

## 3. 行为约束

以下规则在所有其他规则之上优先遵守。任何提交若违反其中一条，无论其他方面是否合规，都将直接驳回。

### 3.1 领域层纯度守则

`src/game/` 是禁区：
- 不允许 import 任何 React / Next.js / Prisma 代码
- 不允许产生副作用（I/O、网络、日志）
- 不允许抛出 DomainError 以外的异常类型
- 不允许包含中文文本——错误只抛 code，展示由 `lib/domain-errors.ts` 映射
- 所有函数必须是纯函数：给定相同 World + input → 相同 newWorld

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

- 一个用户操作 = 一个事务。禁止拆分为多步独立写入
- 事务内任一环节抛异常 → **自动回滚**，SQLite 始终处于上一个完整状态
- **不存在**"客户端先算，再异步保存"的路径（Server Action 是唯一权威入口）

### 3.3 Server Action 权威路径

```
用户操作 → Server Action → loadWorld → execute → saveWorld
  → buildGameView → 返回 GameView → 客户端只渲染
```

- 客户端**不执行**任何价格计算、买卖校验、航行逻辑——这些都在 `src/game/` 的纯函数中
- 用户看到的每个「确认」操作（买、卖、航行、升级）都必须调用 Server Action

### 3.4 状态分类先验

任何新状态加入前，必须先通过「三问公式」分类：
1. 存档时要不要保存？→ **L1 World**（SQLite）
2. 刷新页面后要不要恢复？→ **L2 URL**（路由或 searchParams）
3. 只是当前操作过程中的临时选择？→ **L3 useState**（Interaction）；否则 **L4 useState**（Visual）

**严禁**将 L3/L4 临时状态塞入 World 或 SQLite。**严禁**引入 Zustand。

### 3.5 测试覆盖约束

- `src/game/domain/` 的纯函数**必须**有单元测试（不涉及数据库，给定输入 → 断言输出）
- `src/game/view-builder/` **必须**有单元测试（给定 World → 断言 GameView 结构）
- DomainError 错误路径（钱不够、舱容不够、货物不足、已达最高等级、航行中）**必须**有测试覆盖
- 新增子系统的纯函数或 View Builder 后，不提交无测试覆盖的代码

### 3.6 命名与契约

- `World` — 游戏事实集合，序列化为 JSON 存入 SQLite（`Save` 模型的 `data` 列）
- `GameView` — 渲染快照，从 World 计算得出，不持久化
- `DomainError(code)` — 领域层仅抛错误码，`lib/domain-errors.ts` 负责映射为用户消息
- `readonly` — 所有 `World` 类型字段使用 `readonly`

---

## 4. 开发校验流程

修改代码后（不含仅文档修改）必须依次执行：

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

## 5. 文档治理

### 5.1 文档生命周期

所有 `docs/` 下的文档按以下状态流转：`draft（草稿）→ review（审查中）→ approved（已核准）→ archived（已归档）`。

### 5.2 文档规范与同步

- **Frontmatter 必须完整**：每个文档须包含 `status`（`draft`/`review`/`approved`/`archived`）和 `last_verified`（日期，格式 `YYYY-MM-DD`）
- **关联规则标注**：如果文档与 R1-R10 中的规则直接相关，须在文档标题下方标注：`**关联规则：** R1, R4, R6`
- **内部链接使用相对路径**，确保 `docs:check` 通过
- 文档与 `docs/guides/` 的关系：`docs/guides/` 定义「怎么做」，AGENTS.md 定义「不能做什么、必须做什么」；两者冲突时 AGENTS.md 优先
- 文档必须反映 `src/` 的当前状态。修改代码后，关联文档的 `last_verified` 必须同步更新
- 发现文档与代码不一致时，优先更新文档。如无法立即修复，将 `status` 改为 `draft` 并记录待办
- AGENTS.md 自身是最高优先级文档。修改代码或架构决策后，如果影响 AGENTS.md 中的任意内容，必须在同一提交中同步更新

---

## 附录：关键文档索引

| 文档 | 内容 | 关联规则 |
|---|---|---|
| `docs/architecture/clean-architecture-lite.md` | 分层总览、调用链、禁止跨越约束 | R1, R4, R6 |
| `docs/architecture/data-flow.md` | 核心数据流、事务边界、Server Action 权威原因 | R3, R5 |
| `docs/architecture/view-builder-design.md` | View Builder 定位、各页面 GameView、预览 vs 确认原则 | R8 |
| `docs/architecture/routing-design.md` | 路由表、平行路由策略、Navigation State 归属 | R10 |
| `docs/guides/state-management.md` | 四层分类、三问公式、Zustand 规则 | R7, R10 |
| `docs/guides/prisma-usage.md` | Prisma 单例、事务模板、Repository 约束 | R3, R5 |
| `docs/guides/project-structure.md` | 目录树、文件命名规范、目录职责 | — |
| `docs/specifications/project-positioning.md` | 项目定位、核心循环、非目标 | — |
| `docs/specifications/world-definition.md` | World 定义、包含/不包含内容、原则 | R2 |
| `docs/specifications/save-system.md` | 存档设计、Prisma 模型、操作 API | R9 |
| `docs/roadmap/phase-1-mvp.md` | Phase 1 MVP 范围、交付清单、完成标准 | — |
| `docs/roadmap/phase-2-system-depth.md` | Phase 2 系统深度路线图 | — |
| `docs/roadmap/phase-3-content-depth.md` | Phase 3 内容深度路线图（进行中） | — |
| `docs/adr/ADR-0001-server-action-as-entry-point.md` | Server Action 作为权威入口的决策 | — |
| `docs/adr/ADR-0002-save-and-json-column.md` | Save + JSON 列模式的决策 | — |
| `docs/adr/ADR-0003-world-and-gameview-separation.md` | World 和 GameView 分离的决策 | — |
| `docs/adr/ADR-0004-ship-to-fleet-in-phase2.md` | 单船→舰队重构提前至 Phase 2 的决策 | — |
