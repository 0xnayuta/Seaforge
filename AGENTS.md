# 架构宪法

## 1. 项目定位

项目名称：纵横四海 (Seaforge)
项目类型：单人离线航海贸易经营游戏
灵感来源：QQ家园《纵横四海》——仅借鉴核心玩法，不复制原内容
项目目标：现代化重构航海贸易经营体验

详见：`docs/specifications/project-positioning.md`

---

## 2. 技术栈

| 类别 | 内容 |
|---|---|
| 必选 | Electron · Next.js (App Router) · TypeScript (strict) · Prisma · SQLite |
| 禁止引入 | NestJS · PostgreSQL · Redis · Docker（作为运行依赖） |

详见：`docs/adr/ADR-0001-tech-stack.md`

---

## 3. 架构栈

```
UI (React Components)
  → Server Actions
    → Application Layer (UseCases)
      → Domain (src/game/ 纯函数)
        → Repository (Prisma)
          → SQLite
```

各层职责详见：`docs/architecture/clean-architecture-lite.md`

---

## 4. 核心规则

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

---

## 5. 状态分类

| 层级 | 内容 | 存放位置 |
|---|---|---|
| L1 Domain State | 金币、货物、船只、当前港口、天数等游戏事实 | World（SQLite） |
| L2 Navigation State | 当前页面、分类筛选 | URL |
| L3 Interaction State | 选中的商品、输入数量、选择目标港 | `useState` |
| L4 Visual State | Toast、Tooltip、Modal | `useState` |

详见：`docs/guides/state-management.md`

---

## 6. 例外处理

本文件的任何规则都可以因合理理由被打破，但必须同时满足：

1. **在代码提交前**与团队达成共识
2. **在代码中注释标注**该行代码违反了哪条规则及理由
3. **更新本文件**记录例外

例外不是漏洞，是经过深思熟虑的设计决策。
