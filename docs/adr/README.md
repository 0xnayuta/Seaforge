---
status: proposed
last_verified: 2026-06-25
---

# 架构决策记录（Architecture Decision Records）

## 用途

记录项目中做出过的重大技术决策，包括：

- 为什么选择某个技术方案
- 为什么放弃某个备选方案
- 决策的上下文、约束条件、后果

## 为什么需要 ADR

架构决策的上下文会在几周后就被遗忘。

ADR 的存在让每个决策的理由可追溯，避免重复讨论已经解决过的问题，也避免新开发者引入与既有决策矛盾的方案。

## 目录约定

- 每个 ADR 是一个独立的 `.md` 文件
- 文件一经创建不再修改（需要修正或推翻时，创建新 ADR 取代旧 ADR）
- 按编号顺序排列

## 命名规范

```
ADR-NNNN-short-kebab-title.md
```

| 部分 | 说明 | 示例 |
|---|---|---|
| `NNNN` | 4 位数字序号，从 0001 开始 | `0001` |
| `short-kebab-title` | 主题简述 | `use-sqlite-for-persistence` |

### 示例

```
ADR-0001-use-sqlite-for-persistence.md
ADR-0002-server-action-as-entry-point.md
ADR-0003-world-and-gameview-separation.md
```

## 模板

每篇 ADR 应包含以下章节：

```markdown
---
status: proposed / accepted / rejected / deprecated / superseded
last_verified: YYYY-MM-DD
---

# ADR-NNNN: 标题

概述主要内容。

---

## 背景

为何需要做这个决策？当前面临什么问题？

---

## 备选方案

列出并简要说明被考虑的方案。

---

## 决策

选择了哪个方案，为什么。

---

## 后果

这个决策带来的影响、约束、后续需要关注的事项。

---

## 参考资料

- 相关的 ADR 链接
- 外部资料链接
```
