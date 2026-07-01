---
status: final
last_verified: 2026-06-25
---

# 架构审计与代码审计

## 用途

存放项目各阶段的审计与评审记录。

包括：

- 架构审计：检查实际代码是否偏离既定架构
- 代码审计：代码质量、安全性、一致性检查
- Phase 回顾：每个开发阶段结束后的总结评审
- 技术债务记录

## 审计价值

审计不是为了追责，而是为了发现「架构宪法」与实际代码之间的差距，并决定：

1. 更新代码以符合架构
2. 或更新架构以反映实际情况（因合理理由偏离）

## 命名规范

```
YYYY-MM-DD-topic.md
```

日期为审计执行日期。

### 示例

```
2026-07-01-phase-1-architecture-audit.md
2026-07-15-code-quality-review.md
```

## 模板建议

每篇审计文档建议包含：

```markdown
---
status: draft / current / superseded / template / implemented
last_verified: YYYY-MM-DD
---

# YYYY-MM-DD: [审计类型] - [主题]

概述主要内容。

---

## 审计项清单

- [ ] 规则R1：游戏规则位于 src/game/
- [ ] 规则R2：World 不含 UI 状态
- ...

## 发现的问题

1. 问题描述
2. 严重程度
3. 建议修复方式

## 结论
```
