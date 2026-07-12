---
status: draft
last_verified: 2026-07-10
---

# 审计问题修复计划

**关联文档：** [audit-report-2026-07-03.md](../audits/audit-report-2026-07-03.md)
**创建日期：** 2026-07-10
**状态：** ⌛ 进行中

---

## 0. 已修复记录（从审计文档转移）

> 以下条目记录审计报告发布后已修复的发现。内容自 `docs/audits/audit-report-2026-07-03.md` §0 转移至此。

### 0.1 `withTransaction` HOF 零调用 → 已全面推广

| | |
|---|---|
| **关联痛点** | 6. 痛点 1 |
| **修复日期** | 2026-07-03（两次提交后最终确认） |
| **涉及文件** | `src/app/actions/{trade,combat,crew,equipment,character,travel,quest,npc,titles}.ts`（9 个文件） |

**修复前后对比：**

```diff
- await prisma.$transaction(async (tx) => {
-   const world = await loadWorld(tx);
-   const result = doDomainLogic(world, input);
-   await saveWorld(tx, result);
-   return buildView(result);
- });
+ return await withTransaction(
+   (world) => doDomainLogic(world, input),
+   buildView,
+ )();
```

**结论：** 9/11 个 Server Action 已全面迁移至 `withTransaction` HOF。剩余 2 个（`new-game.ts` 新建游戏无 World 可加载、`save.ts` 槽位间复制/加载写入目标异构）属于 HOF 设计合法边界，非遗漏。

**后续跟踪（2026-07-10）：** 当前 14 个 Server Action 文件中 12 个使用 `withTransaction`。`achievement.ts`、`character.ts`、`combat.ts`、`crafting.ts`、`crew.ts`、`dungeon.ts`、`equipment.ts`、`npc.ts`、`quest.ts`、`titles.ts`、`trade.ts`、`travel.ts` 全部迁移。`new-game.ts` / `save.ts` 仍为合法例外。**✅ 确认关闭。**

### 0.2 存档 JSON 解析失败静默回退 → 改为 Fail-Fast 报错

| | |
|---|---|
| **关联痛点** | 6. 痛点 3 |
| **修复日期** | 2026-07-03 |
| **涉及文件** | `src/lib/repository.ts` |

**修复前后对比：**

```diff
  try {
    return JSON.parse(save.data) as World;
- } catch {
-   return createDefaultWorld();  // 静默丢失数据
+ } catch (error) {
+   console.error("❌ [存档重创] ...", error);
+   throw new Error("存档版本不匹配！...");
  }
```

**结论：** 损坏数据不再静默回退至空世界，改为 `console.error` + 抛出带清晰指引的 Error（事务自动回滚，不污染数据库）。

**后续跟踪（2026-07-10）：** `src/lib/repository.ts:24-34` 确认已实现 fail-fast。**✅ 确认关闭。**

---

## 1. 痛点 2：超大客户端组件未分解

**来源：** 审计报告 §6 痛点 2
**严重度：** 低
**涉及文件：** `src/components/ShipyardPanel.tsx`（571 行）、`src/components/CharacterPanel.tsx`（385 行）

### 问题描述

`ShipyardPanel` 和 `CharacterPanel` 是超大单文件组件，混合多种功能：

| 组件 | 行数 | 混合职责 |
|------|------|----------|
| **ShipyardPanel** | 571 | 船只购买/出售/升级/维修/武装切换/装备管理/状态显示 |
| **CharacterPanel** | 385 | 属性面板/属性加点/装备槽/背包/装备/卸装 |

功能边界模糊，后续新增特性（船只技能、特殊词缀）会进一步膨胀。

### 修复方案分析

**方案 A：提取子组件（推荐）**

按功能边界提取独立子组件，与现有 `BuyModal.tsx` / `SellModal.tsx` 风格对齐：

```
ShipyardPanel/
├── ShipList.tsx          # 船只列表 + 切换
├── ShipDetail.tsx        # 当前船只属性/HP/部件状态
├── ShipEquipSlot.tsx     # 装备槽位组件
├── UpgradeButton.tsx     # 部件升级按钮 + 成本展示
├── RepairBar.tsx         # 维修进度 + 费用
├── BuyShipModal.tsx      # 购买船只弹窗
├── ShipyardPanel.tsx     # 组合入口（~150 行）
```

```
CharacterPanel/
├── AttributePanel.tsx    # 属性数值 + 加点按钮
├── EquipSlot.tsx         # 装备槽位（武器/防具/饰品）
├── InventoryTable.tsx    # 背包物品列表
├── CharacterPanel.tsx    # 组合入口（~100 行）
```

**收益：** 每组件 ≤150 行，可独立测试，新功能按需追加新文件。
**成本：** 提取 + 数据接口对齐约需 2–3 小时。无行为变更风险（纯重构）。

**方案 B：功能分区 + 注释标记（轻量替代）**

在当前文件内用 `// ── section ──` 分隔 + 折叠区域，不拆分文件。

**收益：** 零重构成本。
**成本：** 不解决膨胀趋势，新增功能仍会推高单文件行数。

**建议：** 采用方案 A，按审计建议与 `BuyModal.tsx`/`SellModal.tsx` 风格对齐。

---

## 2. 离线结算机制缺失

**来源：** 审计报告 §3.3 ⚠️
**严重度：** 中（影响出航效率体验）
**涉及文件：** `src/game/domain/voyage.ts`、`src/app/voyage/actions.ts`

### 问题描述

`progressVoyage()` 逐日逐个事件线性推进，无「跳过 N 天」或「离线回归后批量结算」机制。当前 `completeVoyage()` (voyage/actions.ts) 只是包装了一层 `progressVoyage`，底层仍是全量线性迭代。

### 修复方案分析

**方案 A：skipDays 参数化（推荐）**

在 `progressVoyage` 上增加可选参数：

```typescript
export function progressVoyage(
  world: World,
  options?: { skipToEnd?: boolean; maxDays?: number },
): World
```

- `skipToEnd: true` → 跳过全部剩余天数，一次性结算所有事件
- `maxDays: N` → 最多推进 N 天（分批结算）
- 默认行为不变（逐日推进，遇 combat 暂停）

**Server Action 侧：**

```typescript
// 现有 completeVoyage：一次推进到底
await withTransaction(
  (w) => progressVoyage(w, { skipToEnd: true }),
  () => undefined,
)();

// 新增 skipDaysAction：玩家可指定跳几天
export async function skipDaysAction(days: number) {
  await withTransaction(
    (w) => progressVoyage(w, { maxDays: days }),
    () => undefined,
  )();
}
```

**收益：** 明确表达意图，不改变现有行为，测试可增量覆盖。
**成本：** domain 层改动 ~20 行，Server Action 新增 ~30 行，测试 ~50 行。

**方案 B：离线结算钩子**

在 `loadWorld` 时检测 `world.voyage` 非空且距上次保存时间超过阈值，自动调用 `progressVoyage` 批量结算。需引入时间戳字段到 `Save` 模型或 `VoyageState`。

**收益：** 回归玩家自动结算，无感体验。
**成本：** 需改 Prisma schema / World 结构，复杂度较高。离线时间检测有精度边界（`saveWorld` 时间 ≠ 游戏内时间）。

**建议：** 先做方案 A（skipDays/参数化），方案 B 作为后续扩增。

**后续跟踪（2026-07-12）：** 经代码审查确认，`progressVoyage(world)` 已一次性批量处理所有非战斗事件（内部循环遍历全部事件，遇战斗暂停返回）。玩家一次点击"推进航行"即处理剩余所有天数，不存在"逐日逐个事件手动推进"的场景。`skipToEnd: true` 与当前行为完全等价；`maxDays: N` 无对应 UI 且无设计需求。离线回归后一次点击同样批量结算。**✅ 确认关闭（非问题）。**

---

## 3. `/cargo` 无独立路由

**来源：** 审计报告 §5.1 🟡
**严重度：** 低
**涉及文件：** `src/app/` 路由结构、`src/components/FleetPanel.tsx`（当前 cargo 展示位置）

### 问题描述

cargo 货物明细仅在 `FleetPanel` 和 `MarketPanel` 中内嵌展示，无独立页面路由 (`/cargo`)，导航栏无入口。

### 修复方案分析

**方案 A：新增 `/cargo` 路由 + 独立页面（完整方案）**

- 新增 `src/app/cargo/page.tsx`（SSR，读取 `loadWorld` → `buildCargoView`）
- 新增 `CargoView` / `buildCargoView`（按港/按船分组的货物清单）
- 在 `HarborDashboard` 状态栏的「舱容」文字上添加 `<a href="/cargo">`
- 导航栏添加入口（若存在统一导航组件）

**收益：** 完整 cargo 管理入口，可扩展为货物操作（整理/丢弃/转移）。
**成本：** 新路由 ~20 行，View Builder ~40 行，类型 ~10 行，UI 组件 ~100 行。

**方案 B：舱容链接指向已有 cargo 展示位置（轻量方案）**

在 `HarborDashboard` 中把「舱容 N/M」改为指向 `/fleet`（FleetPanel 已有 cargo 明细表）的链接：

```tsx
<a href="/fleet" className="text-parchment-dark hover:text-gold-400">
  舱容 {view.cargoCount}/{view.cargoCapacity}
</a>
```

**收益：** ~3 行改动，利用现有 FleetPanel 的 cargo 表格。
**成本：** 无独立页面，功能受限（不能按港口/品类筛选）。

**建议：** 先做方案 B 快速填补导航空白，后续评估 cargo 独立页面的 ROI 再决定是否升级方案 A。

---

## 4. 数据分支覆盖补齐（原"内容填充率不足"）

**来源：** 审计报告 §7 P1（范围重估后）
**严重度：** 中（数据层有代码定义了但零实例的分支，影响功能验证完整性）

### 范围重估

原始审计建议目标（30+ 商品 / 20+ 港口 / 15+ 事件 / 6+ 副本 / 10+ NPC）是针对 Phase 4「内容深度」的长期愿景。当前目标缩小为：**用最小数据改动，覆盖所有 17 个玩法系统中代码已定义但数据中零实例的分支**。

当前 19 商品 / 12 港口 / 7 事件 / 3 副本 / 5 NPC 已足够验证所有系统的核心功能路径。唯一的 3 个缺口是类型分支级的数据缺失：

| # | 缺口 | 代码中定义 | 数据中实例 | 影响 |
|---|------|-----------|-----------|------|
| 1 | `NPC.type === "blacksmith"` | `npcs.ts:18` | 0 / 5 | view-builder 或 UI 中的铁匠分支逻辑无法到达 |
| 2 | `QuestConfig.prerequisiteQuestId` | `quests.ts:73` | 0 / 6 | 任务链前置判定逻辑无数据可测 |
| 3 | `EquipmentRecipe.minAffinity` | `items.ts:313-316` | 0 / 6 | 配方亲和度门禁渲染/判定逻辑无数据可测 |

### 修复方案

| 缺口 | 改动 | 行数 | 耗时 |
|------|------|------|------|
| blacksmith NPC | 在 `nagasaki` 新增 1 个铁匠 NPC | ~20 行 | ~15min |
| 任务链 | 为 1 个现有 quest 设置 `prerequisiteQuestId` | 1 行 | ~2min |
| 配方亲和度 | 为 1 个现有 recipe 设置 `minAffinity` | 3 行 | ~2min |
| 配方数排查 | `git log` 追查 RECIPES 是否有意外丢失 | 纯查询 | ~10min |

**总工作量：** ~30 分钟数据改动 + 10 分钟排查。不涉及任何 domain / view-builder / UI 代码变动。

### 执行顺序

1. 配方数排查（纯查询，不影响其他）
2. blacksmith NPC 新增（独立）
3. 任务链关联（独立）
4. 配方亲和度门（独立）

全部完成后 `bun run test` 验证。当前测试断言不检查 NPC 数量或 quest 字段使用率，新增数据不会导致现有测试失败。

**后续跟踪（2026-07-10）：** 经代码审计确认，三项缺口在数据中均已存在（`takeda` NPC `type:"blacksmith"`、`family_heirloom.prerequisiteQuestId`、`silver_to_harpoon.minAffinity`），无需新增改动。**✅ 确认关闭。**
---

## 5. 扩展玩法未启动

**来源：** 审计报告 §7 P2
**严重度：** 低（当前带宽应聚焦 P1 内容填充）

### 问题描述

房屋、宠物、世界事件、船只技能等扩展系统完全未启动。审计列为 P2，但 P1 内容填充尚未开展，这些系统在代码中没有任何文件或占位符。

### 修复方案分析

**当前建议：搁置，等待内容填充达到「够吃」线再启动。**

扩展玩法与内容填充的关系：

| 扩展系统 | 前置依赖 | 预计工作量（Domain + Data + UI） |
|----------|---------|--------------------------------|
| **船只技能** | 船只系统现有 `ShipConfig` 需扩展 `skills` 字段 | ~3 天 |
| **世界事件** | 事件模板已有，需新增全局事件类型（非航程中） | ~5 天 |
| **房屋系统** | 全新子系统：购买/装修/仓库/展示 | ~2 周 |
| **宠物系统** | 全新子系统：获取/养成/效果 | ~1.5 周 |

**触发条件：** 当 §4 数据分支覆盖全部补齐，且下一阶段决定做内容厚度扩展时，重新评估扩展玩法的优先级。

---

## 6. UI 打磨

**来源：** 审计报告 §7 P3
**严重度：** 低
**关联条目：** 痛点 2（超大组件）、`/cargo` 路由

### 问题描述

除组件分解和 cargo 路由外，UI 打磨还包括：
- 导航栏缺少 cargo 入口
- 部分页面缺少 loading/error 边界
- 移动端适配检查（当前 Tailwind 响应式布局存在，但未系统验证）

### 修复方案分析

UI 打磨依赖 §1（组件分解）和 §3（cargo 路由）完成后进行：

1. 导航栏统一：补全所有入口（cargo、collection、crafting、dungeon）
2. Loading 边界：Server Action 调用处增加 `useTransition` 加载态（大部分已有，个别缺失）
3. Error 边界：每个 `"use client"` 组件已包装 try/catch，检查一致性
4. 移动端适配：以 360px 宽度为基准测试所有路由页面

---

## 7. 额外发现：配方数异常减少

**来源：** 2026-07-10 回检发现
**严重度：** 中（可能是合并丢失或故意清理）

### 问题描述

审计报告（2026-07-03）描述「合成配方 ~8（位于 `items.ts` RECIPES 数组）」，当前 `RECIPES.length` 为 6。

### 排查方案

1. `git log` 检索 `items.ts` 或 `RECIPES` 相关提交
2. 确认是否有意移除（changelog/commit message）
3. 若为无意丢失，恢复 2 个配方配置

---

**后续跟踪（2026-07-12）：** 经 `git log` 追查，初始提交 `eeb6e85`（feat(crafting)）即创建 6 个配方，commit message 明确注明 "6 recipes"。审计报告所述 "~8" 为描述误差，并非配方丢失。当前 6 条配方与初始设计一致。**✅ 确认关闭。**

## 优先级总表（2026-07-12）

| 优先级 | 条目 | 工作量 | 依赖 |
|--------|------|--------|------|
| ~~🔴 P0~~ | §4 数据分支补齐 | ✅ 已关闭 |
| ~~🔴 P0~~ | §7 配方数异常排查 | ✅ 已关闭（描述误差） |
| ~~🟡 P1~~ | §2 离线结算 skipDays 参数化 | ✅ 已关闭（非问题） |
| 🟢 **P2** | §1 超大组件分解（ShipyardPanel 572行 + CharacterPanel 386行） | ~3h | 无 |
| 🔵 **P3** | §3 `/cargo` 路由（先方案 B 轻量） | ~0.2h | 无 |
| ⚪ **P4** | §6 UI 打磨（导航栏 + loading/error + 移动端） | ~2h | §1、§3 完成后 |
| ⚪ **P4** | §5 扩展玩法（船只技能/世界事件/房屋/宠物） | — | 内容达"够吃"线后评估 |
