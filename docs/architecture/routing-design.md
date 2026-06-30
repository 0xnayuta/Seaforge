---
status: current
last_verified: 2026-06-30
---

# 路由设计

**关联规则：** R10 (L2 Navigation State → URL)

---

## MVP 路由表

采用平行路由，每个页面独立：

| 路由 | 页面 | 内容 |
|---|---|---|
| `/` | 港口总览 | 当前港口信息、状态预览 |
| `/market` | 交易所 | 商品列表、买入/卖出（仅货物交易） |
| `/ship` | 造船厂 | 船只信息、升级、维修、装备管理（含港口铁匠铺） |
| `/cargo` | 船舱 | 当前货物清单 |
| `/navigation` | 航海图 | 选择目的港、查看航线 |
| `/voyage` | 航行中 | 航行进度、随机事件 |

## 为什么平行路由（不嵌套）

| 方案 | 优点 | 缺点 |
|---|---|---|
| 平行路由 `/market` | URL 简单，每个页面独立 | 切换页面不能保留底部状态栏（Phase 2 加） |
| 嵌套布局 `/game/market`，`/game` 提供全局壳 | 全局状态栏持续显示 | URL 多一级，页面间耦合 |

**MVP 采用平行路由**。Phase 2 如需全局状态栏（金幣/天数/港口名常驻），改为嵌套布局：

```
/game           ← 游戏布局（状态栏 + 内容区）
/game/market    ← 交易所
/game/ship      ← 造船厂
...
```

## Navigation State 归属

路由本身属于 L2 Navigation State，存放于 URL。

### 筛选状态的 URL 管理策略

`/market` 页的分类筛选：

| 方案 | 实现 | 适用场景 |
|---|---|---|
| `/market?category=luxury` | searchParams | 刷新后用户想回到同一筛选状态 |
| `useState` | 组件内 | 筛选只是临时浏览行为 |

具体方案不强制，在实现 `/market` 功能时根据用户体验判断。

## 不允许的路由设计

- 路由参数中包含游戏状态（如 `/port/guangzhou?gold=5000`）
- 嵌套超过 2 层的路由
- Hash router（不使用 `#/market`）
