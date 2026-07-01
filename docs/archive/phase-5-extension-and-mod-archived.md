---
status: archived
last_verified: 2026-07-01
---

# Phase 5：扩展与 MOD 支持（Extension & Modding）

---

## 目标

在 Phase 1-4 的完整游戏内容基础之上，引入**外部扩展能力**和**非核心生活系统**——房屋系统、宠物系统，以及最重要的 **MOD 支持**——让社区可以修改和扩展游戏内容而不需要修改核心代码。

**核心命题：** 从「一个完整的游戏」进化到「一个可被社区扩展的游戏平台」。

---

## 架构总览

### 分层（核心架构不变，新增 MOD 加载层）

```
Server Action（入口）
  → MOD Hook Layer（新增 — 在关键节点调用 MOD 脚本）
  → loadWorld（读存档）
  → UseCase（纯函数计算，MOD 可覆盖或扩展）
  → saveWorld（写存档）
  → View Builder（MOD 可注册自定义 view builder）
  → 返回 GameView（客户端只渲染）
```

### 关键设计决策

| 决策 | 说明 |
|------|------|
| MOD 数据驱动 | MOD 通过扩展 `src/data/` 配置实现（新增港口/商品/船只/事件），不需要修改 TypeScript 代码 |
| MOD 脚本安全沙箱 | 如需 MOD 脚本（自定义事件逻辑），在受限沙箱中执行，不访问文件系统/网络 |
| MOD 不影响核心存档 | MOD 内容存储在独立数据文件中，World 存档只保存 MOD 数据的引用，不混合核心数据 |
| 房屋/宠物独立子系统 | 与核心贸易循环解耦，不加入房屋/宠物不会影响主体游戏体验 |

---

## 子阶段划分

### Phase 5.1：房屋系统

在 Phase 1-4 基础上，为玩家提供可购买和装饰的个人房屋。

> 调研确认度：📝 可回忆 — 原版 60 级解锁，可购买装饰。

#### 数据配置

新建 `src/data/housing.ts`：

| 字段 | 说明 |
|------|------|
| `cityPortId` | 房屋所在港口 |
| `name` | 房屋名称 |
| `price` | 购买价格 |
| `levelRequirement` | 等级要求 |
| `decorationSlots` | 装饰槽位数 |
| `baseDescription` | 房屋默认描述 |

新建 `src/data/decorations.ts`：

| 字段 | 说明 |
|------|------|
| `id` | 唯一标识 |
| `name` | 装饰名称 |
| `type` | 家具/挂饰/摆件等分类 |
| `price` | 购买价格 |
| `description` | 描述文本 |
| `effect` | 可选属性加成（微量） |

#### 领域逻辑

新建 `src/game/domain/housing.ts`：

| 函数 | 说明 |
|------|------|
| `buyHouse(world, houseId)` | 购买房屋 |
| `buyDecoration(world, decorationId)` | 购买装饰品 |
| `placeDecoration(world, houseId, decorationId)` | 摆放装饰 |
| `removeDecoration(world, houseId, decorationId)` | 移除装饰 |

#### World 类型

```typescript
interface HouseState {
  readonly houseId: string;
  readonly decorations: readonly string[];
}

// 在 World 中新增
readonly house: HouseState | null;
```

#### 关联文件

| 模块 | 文件 | 说明 |
|------|------|------|
| 数据配置 | `src/data/housing.ts` | 房屋配置（新增） |
| 数据配置 | `src/data/decorations.ts` | 装饰品配置（新增） |
| 领域逻辑 | `src/game/domain/housing.ts` | 房屋纯函数（新增） |
| 类型定义 | `src/game/domain/types.ts` | World 新增 `house` 字段 |
| View Builder | `src/game/view-builder/buildGameView.ts` | 房屋视图 |
| UI | 新增 `/house` 页面 | 房屋展示 + 装饰管理 |

---

### Phase 5.2：宠物系统

为玩家提供可携带的宠物，辅助战斗和社交展示。

> 调研确认度：📝 可回忆 — 原版宠物辅助战斗，兼具社交展示属性。

#### 数据配置

新建 `src/data/pets.ts`：

| 字段 | 说明 |
|------|------|
| `id` | 唯一标识 |
| `name` | 宠物名称 |
| `description` | 描述文本 |
| `effect` | 属性加成（速度/舱容/战斗 微量加成） |
| `price` | 购买价格 |
| `sellPortIds` | 售卖港口 |

#### 领域逻辑

新建 `src/game/domain/pet.ts`：

| 函数 | 说明 |
|------|------|
| `buyPet(world, petId)` | 购买宠物 |
| `setActivePet(world, petId)` | 设置当前携带宠物 |
| `applyPetEffects(world)` | 应用宠物属性加成 |

#### World 类型

```typescript
// 在 World 中新增
readonly pet: {
  readonly owned: readonly string[];    // 拥有的宠物 ID 列表
  readonly active: string | null;       // 当前携带的宠物 ID
};
```

---

### Phase 5.3：MOD 支持（核心）

构建 MOD 系统，允许社区通过数据文件扩展游戏内容。

#### 5.3.1 MOD 加载器

| 功能 | 说明 |
|------|------|
| MOD 目录约定 | `mods/<mod-name>/` 目录，自动扫描加载 |
| MOD 数据结构 | `mods/<mod-name>/manifest.json` 声明 MOD 元数据 |
| 数据扩展 | MOD 可扩展或覆盖 `ports.json`、`goods.json`、`ships.json`、`events.json` |
| 优先级系统 | 核心数据 < MOD 数据，后加载的 MOD 优先级更高 |

#### 5.3.2 MOD 数据格式

```jsonc
// mods/my-mod/manifest.json
{
  "id": "my-mod",
  "name": "我的模组",
  "version": "1.0.0",
  "description": "添加了 XXX",
  "dependencies": [],
  "entries": [
    "data/ports.json",     // 新增港口
    "data/goods.json",     // 新增商品
    "data/ships.json",     // 新增船只
    "data/events.json",    // 新增事件
    "data/quests.json"     // 新增任务（需 Phase 3.1）
  ]
}
```

#### 5.3.3 加载逻辑

```typescript
// src/lib/mod-loader.ts
function loadModData<T>(baseData: T[], modDir: string): T[] {
  // 1. 加载基础数据（内置数据）
  // 2. 扫描 mods/ 目录
  // 3. 按依赖顺序合并 MOD 数据
  // 4. 返回合并后的完整数据
}
```

#### 5.3.4 沙箱脚本（可选，Stretch Goal）

如需 MOD 扩展逻辑而非仅数据：

| 功能 | 说明 |
|------|------|
| 事件脚本 | MOD 可自定义随机事件的条件和效果逻辑 |
| 任务脚本 | MOD 可自定义任务的完成条件 |
| 沙箱限制 | 禁止文件 I/O、网络请求、系统调用 |
| 安全执行 | 在独立 VM 上下文中执行，捕获超时/异常 |

#### 关联文件

| 模块 | 文件 | 说明 |
|------|------|------|
| MOD 加载器 | `src/lib/mod-loader.ts` | MOD 扫描、加载、合并（新增） |
| MOD 类型定义 | `src/types/mod.ts` | MOD manifest 和条目类型（新增） |
| 数据加载改造 | `src/data/ports.ts` 等 | 改为从 MOD 加载器获取合并数据 |
| 文档 | `docs/guides/mod-development.md` | MOD 开发指南（新增） |

---

## 依赖关系

```
Phase 5.1 (房屋系统) ─── 独立，不依赖其他子阶段
Phase 5.2 (宠物系统) ─── 独立，不依赖其他子阶段
Phase 5.3 (MOD 支持) ─── 依赖 Phase 1-4 所有数据配置稳定
```

**推荐执行顺序：** 5.3（先做完 MOD 框架让社区参与）→ 5.1 + 5.2（并行，官方内容填充）

---

## 暂不实现（Phase 5 范围外）

| 功能 | 备注 | 预计 Phase |
|------|------|-----------|
| 图形化世界地图 | 当前文字列表，符合定位 | 低优先级 |
| 联机功能 | 需要服务器架构 | 不计划 |
| 社交系统（帮会/师徒/结婚） | 单机版不计划 | 不计划 |
| PK/玩家劫掠 | 单机版不计划 | 不计划 |
| 活动/限时事件 | 无运营需求 | 不计划 |
| 排行榜 | 需要多人数据 | 不计划 |
| Zustand | 当前架构不需要 | 见 Phase 1 条件 |

---

## 完成标准

### 硬性条件（必须满足）

- [ ] 房屋系统：至少 3 种可购买房屋，10 种装饰品，购买/摆放/移除完整操作
- [ ] 宠物系统：至少 5 种可购买宠物，正确应用属性加成
- [ ] MOD 加载器：自动扫描 `mods/` 目录，按 manifest 合并数据
- [ ] MOD 扩展验证：至少一个 MOD 示例（新增港口+商品），加载后游戏中可见
- [ ] 核心稳定性：启用 MOD 后，核心游戏功能不受影响
- [ ] 存档安全：卸载 MOD 后，引用 MOD 数据的存档优雅降级（不崩溃）
- [ ] `npx next build` 无错误
- [ ] `bun run lint` 无 warning/error
- [ ] 游戏引擎纯函数测试全部通过

### 质量条件（建议满足）

- [ ] MOD 开发文档完备，包含至少一个完整示例
- [ ] 房屋装饰对玩家有实质吸引力（微量属性加成或审美价值）
- [ ] 宠物有视觉差异化（纯文本描述层面，不同宠物不同描述）
- [ ] MOD 加载不影响启动性能（首次扫描后缓存）
- [ ] UI 无控制台报错

---

## 参考文档

| 主题 | 文档 |
|------|------|
| 原版游戏调研 | `docs/reference/deep-research-report.md` |
| Phase 1 路线图 | `docs/roadmap/phase-1-mvp.md` |
| Phase 2 路线图 | `docs/roadmap/phase-2-system-depth.md` |
| Phase 3 路线图 | `docs/roadmap/phase-3-content-depth.md` |
| Phase 4 路线图 | `docs/roadmap/phase-4-long-term-retention.md` |
| 原版房屋/宠物描述 | `docs/reference/deep-research-report.md` §12.3（宠物）、§12.4（房屋） |
| 项目定位 | `docs/specifications/project-positioning.md` |
| World 定义 | `docs/specifications/world-definition.md` |
| Clean Architecture 分层 | `docs/architecture/clean-architecture-lite.md` |
| 数据流 | `docs/architecture/data-flow.md` |
| 架构宪法 | `AGENTS.md` |
