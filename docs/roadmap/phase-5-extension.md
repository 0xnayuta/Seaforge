---
status: draft
last_verified: 2026-07-01
---

# Phase 5：扩展与 MOD 支持（Extension & Modding）

---

## 目标

在 Phase 1-4 的完整游戏内容基础之上，引入**非核心生活系统**（房屋、宠物）和 **MOD 支持**。此阶段的主题是"丰富游戏世界的生活感，并开放给社区扩展"。

**核心命题：** 从「一个完整的游戏」进化到「一个有生活气息、可被社区扩展的游戏平台」。

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
| MOD 数据驱动 | MOD 通过扩展 `src/data/` 配置实现（新增港口/商品/船只/事件/装备/任务等），不需要修改 TypeScript 代码 |
| MOD 脚本安全沙箱 | 如需 MOD 脚本（自定义事件逻辑），在受限沙箱中执行，不访问文件系统/网络 |
| MOD 不影响核心存档 | MOD 内容存储在独立数据文件中，World 存档只保存 MOD 数据的引用，不混合核心数据 |
| 房屋/宠物独立子系统 | 与核心贸易/RPG 循环解耦，不加入房屋/宠物不会影响主体游戏体验 |

---

## 子阶段划分

### Phase 5.1：房屋系统

为玩家提供可购买和装饰的个人房屋。

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
| `effect` | 可选属性加成（微量，可作用于人物面板） |

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
| 数据配置 | `src/data/housing.ts`（新增） | 房屋配置 |
| 数据配置 | `src/data/decorations.ts`（新增） | 装饰品配置 |
| 领域逻辑 | `src/game/domain/housing.ts`（新增） | 房屋纯函数 |
| 类型定义 | `src/game/domain/types.ts` | World 新增 `house` 字段 |
| View Builder | `src/game/view-builder/buildGameView.ts` | 房屋视图 |
| UI | 新增 `/house` 页面 | 房屋展示 + 装饰管理 |

---

### Phase 5.2：宠物系统

为玩家提供可携带的宠物，辅助战斗和提供微量属性加成。

#### 数据配置

新建 `src/data/pets.ts`：

| 字段 | 说明 |
|------|------|
| `id` | 唯一标识 |
| `name` | 宠物名称 |
| `description` | 描述文本 |
| `effect` | 属性加成（ATK/DEF/SPD/LUK 微量加成） |
| `price` | 购买价格 |
| `sellPortIds` | 售卖港口 |

#### 领域逻辑

新建 `src/game/domain/pet.ts`：

| 函数 | 说明 |
|------|------|
| `buyPet(world, petId)` | 购买宠物 |
| `setActivePet(world, petId)` | 设置当前携带宠物 |
| `applyPetEffects(world)` | 应用宠物属性加成（叠加到人物面板） |

#### World 类型

```typescript
// 在 World 中新增
readonly pet: {
  readonly owned: readonly string[];    // 拥有的宠物 ID 列表
  readonly active: string | null;       // 当前携带的宠物 ID
};
```

#### 关联文件

| 模块 | 文件 | 说明 |
|------|------|------|
| 数据配置 | `src/data/pets.ts`（新增） | 宠物配置 |
| 领域逻辑 | `src/game/domain/pet.ts`（新增） | 宠物纯函数 |
| 类型定义 | `src/game/domain/types.ts` | World 新增 pet 字段 |
| View Builder / UI | 宠物页面 | 宠物购买/切换/效果展示 |

---

### Phase 5.3：MOD 支持（核心）

构建 MOD 系统，允许社区通过数据文件扩展游戏内容。

#### 5.3.1 MOD 加载器

| 功能 | 说明 |
|------|------|
| MOD 目录约定 | `mods/<mod-name>/` 目录，自动扫描加载 |
| MOD 数据结构 | `mods/<mod-name>/manifest.json` 声明 MOD 元数据 |
| 数据扩展 | MOD 可扩展或覆盖 `ports.json`、`goods.json`、`ships.json`、`events.json`、`items.json`、`npcs.json`、`quests.json`、`dungeons.json`、`titles.json` |
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
    "data/ports.json",
    "data/goods.json",
    "data/items.json",
    "data/npcs.json",
    "data/quests.json"
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
| 副本脚本 | MOD 可自定义副本层内事件序列 |
| 沙箱限制 | 禁止文件 I/O、网络请求、系统调用 |
| 安全执行 | 在独立 VM 上下文中执行，捕获超时/异常 |

#### 关联文件

| 模块 | 文件 | 说明 |
|------|------|------|
| MOD 加载器 | `src/lib/mod-loader.ts`（新增） | MOD 扫描、加载、合并 |
| MOD 类型定义 | `src/types/mod.ts`（新增） | MOD manifest 和条目类型 |
| 数据加载改造 | `src/data/*.ts` | 改为从 MOD 加载器获取合并数据 |
| 文档 | `docs/guides/mod-development.md`（新增） | MOD 开发指南 |

---

## 依赖关系

```
Phase 5.1 (房屋系统) ─── 独立，不依赖其他子阶段
Phase 5.2 (宠物系统) ─── 独立，不依赖其他子阶段
Phase 5.3 (MOD 支持) ─── 依赖 Phase 1-4 所有数据配置稳定
```

**推荐执行顺序：** 5.1 + 5.2（并行）→ 5.3（数据配置稳定后再开始）

---

## 完成标准

### 硬性条件（必须满足）

- [ ] 房屋系统：至少 3 种可购买房屋，10 种装饰品，购买/摆放/移除完整操作
- [ ] 宠物系统：至少 5 种可购买宠物，正确应用属性加成到人物面板
- [ ] MOD 加载器：自动扫描 `mods/` 目录，按 manifest 合并数据
- [ ] MOD 扩展验证：至少一个 MOD 示例（新增港口+商品+装备），加载后游戏中可见
- [ ] 核心稳定性：启用 MOD 后，核心游戏功能不受影响
- [ ] 存档安全：卸载 MOD 后，引用 MOD 数据的存档优雅降级（不崩溃）
- [ ] `npx next build` 无错误
- [ ] `bun run lint` 无 warning/error
- [ ] 游戏引擎纯函数测试全部通过

### 质量条件（建议满足）

- [ ] MOD 开发文档完备，包含至少一个完整示例
- [ ] 房屋装饰对玩家有实质吸引力（微量属性加成或文本审美价值）
- [ ] 宠物有视觉差异化（纯文本描述层面，不同宠物不同描述）
- [ ] MOD 加载不影响启动性能（首次扫描后缓存）
- [ ] UI 无控制台报错
