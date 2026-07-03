# AGENTS.md — 开发与协同约束规范


## 1. 项目边界与目录职责

### 1.1 项目概述

|属性|内容|
|---|---|
|项目名称|纵横四海 (Seaforge)|
|项目类型|单人离线航海贸易经营 × **RPG**。贸易是经济轴，RPG 是成长轴|
|灵感来源|QQ家园《纵横四海》— 借鉴核心玩法；《艾尔登法环》— 属性 Build 与装备收集；《BLACK SOULS》— 回合制策略战斗|
|目标平台|PC|
|状态|Phase 4 内容深度（副本/合成/成就/图鉴） — 开发中|

**核心循环（双轴）：**

```
经济轴：贸易 → 赚钱 → 购买装备/补给 → 继续贸易
成长轴：战斗/任务/副本 → 经验/装备 → 提升人物属性 → 挑战更难内容
交汇点：贸易赚钱支撑装备消费，人物成长解锁高收益贸易路线
```

**非目标：** 非复刻版、非即时反应、非社交、非 MMORPG、非动作游戏、非生存游戏、非基地建设、非无缝开放世界、无实时等待。

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

`src/game/` 是**禁区**，遵循以下铁律：

- **零外部依赖**：不允许 `import` 任何 React / Next.js / Prisma 代码
- **无副作用**：不允许产生 I/O、网络、日志等副作用
- **纯函数**：所有函数必须是纯函数——给定相同 `World` + input → 相同 newWorld。`src/game/domain/` 下的函数名直接以纯动词或动宾短语开头（如 `buyGoods`、`sellGoods`），**严禁**使用 `execute` 前缀
- **异常约束**：只允许抛出 `DomainError(code)`，不允许抛出其他异常类型
- **无展示文本**：不允许包含中文或其他面向用户的文本——错误只抛 code，展示由 `lib/domain-errors.ts` 映射
- **禁止跨越**：Server Action 不能直接调用 Prisma 做复杂查询；React Component 不能直接调用 Domain 函数；Repository（`lib/repository.ts`）不能包含 `if/else` 业务判断

### 3.2 写操作铁律 — HOF 管道（事务与权威路径）

> **设计原则**：Server Action 是编排器（Orchestrator），不关心底层数据库如何开事务。`loadWorld` → 计算 → `saveWorld` 三步必须封装在统一的高阶函数中，禁止手写 raw 模板。

1. **HOF 唯一路径**：所有涉及游戏 World 状态变更的写操作，**必须**调用 `src/lib/with-transaction.ts` 中定义的 `withTransaction` 或 `withActionState`。**严禁**在 Server Action 中手动编写 `prisma.$transaction(loadWorld → 计算 → saveWorld)`。

2. **标准管道结构**：
   ```typescript
   export const myAction = (input: InputType) =>
     withTransaction(
       (world) => executeDomainLogic(world, input), // 1. 纯函数算
       buildCorrespondingView,                      // 2. 视图快照刷
     );
   ```

3. **用户操作 = 一个事务**：一个用户操作对应一个事务，禁止拆分为多步独立写入。

4. **Server Action 权威入口（端到端流）**：
   ```
   用户操作 → Server Action → loadWorld → executeDomainLogic → saveWorld
     → buildGameView → 返回 GameView → 客户端只渲染
   ```
   - 客户端**不执行**任何价格计算、买卖校验、航行逻辑——这些都在 `src/game/` 的纯函数中
   - 用户看到的每个「确认」操作（买、卖、航行、升级）都必须调用 Server Action
   - 不存在"客户端先算，再异步保存"的路径

### 3.3 状态分类先验

任何新状态加入前，必须先通过「三问公式」分类：
1. 存档时要不要保存？→ **L1 World**（SQLite）
2. 刷新页面后要不要恢复？→ **L2 URL**（路由或 searchParams）
3. 只是当前操作过程中的临时选择？→ **L3 useState**（Interaction）；否则 **L4 useState**（Visual）

**严禁**将 L3/L4 临时状态塞入 World 或 SQLite。**严禁**引入 Zustand。

### 3.4 命名规范与术语契约

#### 符号一致性

| 规则 | 规范 | 严禁 |
|------|------|------|
| 商品唯一标识 | `goodsId` | `goodId` |
| 数量 | `quantity` | `qty` |
| 核心生命值 | `Hp`（如 `currentHp`, `maxHp`, `hpRatio`） | `HP`、`hp` |
| 输出/返回类型 | `Result` 后缀（`BuyResult`, `SellResult`, `CombatResult`） | `CombatOutcome` |

#### 术语定义

- `World` — 游戏事实集合，序列化为 JSON 存入 SQLite（`Save` 模型的 `data` 列）。所有字段必须使用 `readonly`。
- `GameView` — 渲染快照，从 World 计算得出，不持久化。
- `DomainError(code)` — 领域层仅抛错误码，`lib/domain-errors.ts` 负责映射为用户消息。

### 3.5 测试覆盖约束

- `src/game/domain/` 的纯函数**必须**有单元测试（不涉及数据库，给定输入 → 断言输出）
- `src/game/view-builder/` **必须**有单元测试（给定 World → 断言 GameView 结构）
- DomainError 错误路径（钱不够、舱容不够、货物不足、已达最高等级、航行中）**必须**有测试覆盖
- 新增子系统的纯函数或 View Builder 后，不提交无测试覆盖的代码


## 4. 开发与提交流程

### 4.1 提交前校验

修改代码后，必须依次执行以下命令且全部通过：

```bash
bun run build          # 编译检查（必须无错误）
bun run lint           # Biome 代码检查（必须无 warning/error）
bun run test           # 单元测试（必须全部通过）
```

涉及文档或格式化时：

```bash
bun run format         # Biome 格式化
bun run docs:check     # 文档元数据合规校验（必须通过）
```

### 4.2 提交分批

| 时机 | 动作 | 约束 |
|---|---|---|
| 每轮开发结束后 | 立即按修改批次提交，每条 commit 职责单一 | Conventional Commits 格式 |
| 代码审查通过后 | rebase 整理，合并同类 fixup | 确保每 commit 可独立编译通过 |
| 审查修复 | 作为独立 `fix(review):` commit 追加 | 保留审查前后对比链 |

批量原则：同一文件的非关联修改拆为不同 commit；关联修改（如 domain 函数 + 对应测试 + view-builder 适配）合为一个 commit。

### 4.3 提交信息格式

```
<type>(<scope>): <description>
```

| type | 用途 |
|---|---|
| `feat` | 新功能 |
| `fix` | 修复（含 review 修复） |
| `refactor` | 重构，无功能变化 |
| `test` | 测试增补 |
| `docs` | 文档变更 |
| `chore` | 杂项（删除、重命名、配置） |

`scope` 为变更主要模块，小写英文（`domain`、`view-builder`、`actions`、`dungeon`、`crafting` 等）。

### 4.4 推送禁令

**绝不推送（NEVER push）到任何远程分支。** 所有 commit 仅限本地。远程推送由人工审阅后统一操作。违反者直接驳回。

### 4.5 轮次终结

每轮交付（开发 + 审查 + 提交分批完毕）后，必须输出下一轮建议，包含：
- 本轮未完成的剩余工作
- 下轮优先处理的模块或问题
- 已知技术债务或待重构点

## 5. 文档治理

### 5.1 文档生命周期

文档状态按所在目录范围受限：

| 目录 / 范围 | 允许的状态 | 说明 |
|---|---|---|
| `docs/` 根目录, `docs/architecture/`, `docs/guides/`, `docs/specifications/`, `docs/issues/`, `docs/reference/` | `draft` → `review` → `approved` → `archived` | 通用生命周期，默认状态集 |
| `docs/adr/` | `proposed` → `accepted` / `rejected` → `deprecated` / `superseded` | ADR 决策记录专用 |
| `docs/roadmap/` | `draft` → `active` → `completed` | 路线图文档专用 |
| `docs/audits/` | `draft` → `final` | 审计日志专用 |
| `docs/archive/` | `archived` | 已归档，固定状态，不允许其他值 |

`check-docs.mjs` 中 `DOC_META_RULES.scoped` 数组按 `pattern` 优先匹配，第一条命中规则的 `status` 集生效；无匹配回退到默认状态集（`defaultStatus`）。

### 5.2 文档规范与同步

- **Frontmatter 必须完整**：每个文档须包含以下字段，且只能包含以下字段：
  - `status` — 取值范围由所属目录的生命周期定义（见 5.1 文档生命周期）
  - `last_verified` — 日期，格式 `YYYY-MM-DD`；如果 `status: template` 则允许写为文字 `YYYY-MM-DD` 占位
- **禁止额外字段**：frontmatter 中不能出现 `status` 和 `last_verified` 之外的键，否则 `checkDocFrontmatter` 中的 `validateNoExtraFields` 会报错
- **关联规则标注**：如果文档与 R1-R10 中的规则直接相关，须在文档标题下方标注：`**关联规则：** R1, R4, R6`
- **内部链接使用相对路径**，确保 `docs:check` 通过。`checkLinks` 扫描所有 Markdown 文件中的 `[text](path)` 链接，排除 `https?:`、`mailto:`、`#` 锚点、以及 `../../` 开头的相对路径；其余链接必须指向存在的文件
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
| `docs/roadmap/phase-3-rpg-foundation.md` | Phase 3 RPG 底层（人物/物品/NPC/战斗/称号）路线图 | — |
| `docs/roadmap/phase-4-content-depth.md` | Phase 4 内容深度（副本/合成/成就/图鉴）路线图 | — |
| `docs/roadmap/phase-5-extension.md` | Phase 5 扩展（房屋/宠物/MOD）路线图 | — |
| `docs/adr/ADR-0001-server-action-as-entry-point.md` | Server Action 作为权威入口的决策 | — |
| `docs/adr/ADR-0002-save-and-json-column.md` | Save + JSON 列模式的决策 | — |
| `docs/adr/ADR-0003-world-and-gameview-separation.md` | World 和 GameView 分离的决策 | — |
| `docs/adr/ADR-0004-ship-to-fleet-in-phase2.md` | 单船→舰队重构提前至 Phase 2 的决策 | — |

---

