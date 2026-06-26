---
status: accepted
last_verified: 2026-06-26
---

# ADR-0004: 单船→舰队重构提前至 Phase 2

---

## 背景

Phase 1 的 World 类型为**单船架构**：

```typescript
interface World {
  readonly player: PlayerState;       // 含 gold
  readonly ship: ShipState;           // 单船，upgradeLevel 单数值
  readonly market: MarketPriceState;
  readonly voyage: VoyageState | null;
}
```

原规划（`docs/architecture/fleet-evolution-path.md` v1.0）将舰队重构定在 **Phase 3**，分两步走：

1. Phase 2：部件升级 (`ShipEquipment`) + 耐久，在 `ShipState` 内增量扩展
2. Phase 3：`ship → fleet`，将单船包装为 `FleetState` 单船数组

该两步走的出发点是**避免提前抽象**——在不确定需要舰队时，不在 Phase 2 做架构级重构。

### 触发重新评估的原因

项目定位明确后，确认两个关键需求：

1. **多船持有**：买新船时不折抵旧船，新旧船并存
2. **舰队编队出航**：出航时选择多艘船一起走，总舱容和总消耗累加

这两条需求使得「Phase 2 增量扩展、Phase 3 再重构」的方案失效——如果在 Phase 2 扩展 `ShipState`（加 `ShipEquipment` + 耐久），Phase 3 再改成 `ShipInstance[]`，意味着**两次类型变更**，涉及所有 UseCase、View Builder、UI、存档迁移的改动都要做两遍。

---

## 决策

**将单船→舰队重构提前到 Phase 2，作为一次性基础设施变更。**

原先分散在 Phase 2（部件升级）和 Phase 3（舰队）的类型变更合并在 Phase 2.2 一次完成：

```typescript
// Phase 2 最终类型
interface ShipInstance {
  readonly id: string;               // uuid
  readonly typeId: string;
  readonly name: string;             // 玩家可命名
  readonly equipment: ShipEquipment;  // 部件升级
  readonly durability: number;       // 当前耐久
  readonly maxDurability: number;    // 最大耐久
  readonly cargo: readonly CargoItem[];
  readonly equippedItems: readonly string[];  // 装备 ID
}

interface ShipEquipment {
  readonly hullLevel: number;
  readonly sailLevel: number;
  readonly armorLevel: number;
  readonly cannonLevel: number;
}

interface FleetState {
  readonly ships: readonly ShipInstance[];
  readonly maxShips: number;         // 由等级决定
  readonly crew: number;
  readonly maxCrew: number;
  readonly gold: number;             // 从 PlayerState 移入
}

interface World {
  readonly player: PlayerState;      // 不含 gold
  readonly fleet: FleetState;        // 替换 ship
  readonly market: MarketPriceState;
  readonly voyage: VoyageState | null;
}
```

---

## 详细设计

### A. 编队出航模式（模式 B）

|维度|决策|
|---|---|
|出航方式|出航前从 `fleet.ships` 中选择本次出航的船只（可选多艘，≥1 艘）|
|总舱容|编队各船容量之和|
|总消耗|各船航行消耗之和|
|未出航船|留在港口，不消耗耐久，不参与事件|

`VoyageState` 新增字段 `fleetShipIds: string[]` 记录编队船只。

### B. 金币归属迁移

`player.gold` → `fleet.gold`。原因：

- 金币是舰队共有资产，不因当前操控哪艘船而改变
- 买卖船只、货物交易、船员雇佣均使用同一钱包
- 消除「玩家身上的钱」和「船上的钱」的概念分裂

### C. 一次性变更原则

所有关联模块在 Phase 2.2 **一次改完**，不拆为「先加字段再重构」两步：

|模块|变更|
|---|---|
|`types.ts`|`ShipState` → `ShipInstance` + `FleetState` + `ShipEquipment`；`PlayerState` 移除 `gold`|
|`ship.ts`|`upgradeShip` 接受 `fleet + shipId + component`；新增 `buyShip`/`sellShip`|
|`trade.ts`|读 `fleet.gold`；货物存入 `fleet.ships[activeShip].cargo`|
|`navigation.ts`|出航接受 `shipId[]`|
|`voyage.ts`|编队耐久消耗|
|`buildGameView.ts`|`world.ship.*` → `world.fleet.*`|
|`Repository`|存档迁移逻辑|
|UI|所有页面适配|

### D. 向后兼容

`loadWorld` 检测 `world.ship` 存在 → 自动转换为 `FleetState`：

```
ShipState → FleetState.ships[0] (含 uuid、name 映射)
upgradeLevel → equipment.hullLevel (其余部件默认为 1)
player.gold → fleet.gold
player.gold 移除
```

---

## 备选方案

### 方案 A：保持 Phase 2 增量 + Phase 3 重构（原规划）

```
Phase 2：ShipEquipment + durability 加到 ShipState
Phase 3：ShipState → ShipInstance，ship → fleet
```

**否决理由：** 同一批字段改两次，涉及所有 UseCase/UI/迁移。估算工作量：方案 A 的总改动量约比方案 B 多 40%（接口适配两次 + 第二次迁移逻辑），而 Phase 1→2 的迁移逻辑会被 Phase 2→3 的迁移完全覆盖。

### 方案 B（采纳）：Phase 2 一次性重构

```
Phase 2.2：ship → fleet + ShipEquipment + durability + gold 迁移
```

**优点：**
- 只改一次类型，所有模块只适配一次
- 旧存档只需要一次迁移（Phase 1 → Phase 2 最终结构）
- 后续 Phase 3 扩展战斗系统时，舰队结构已就绪，无需再次迁移

**代价：**
- Phase 2.2 的工作量较大（但 2.2 本来就是 Phase 2 最重的子阶段）
- 必须提前设计 `ShipInstance`，不能通过增量方式逐步探索

---

## 影响范围

|影响|说明|
|---|---|
|测试|所有现有 domain 测试需适配 fleet 结构；新增 fleet 相关测试|
|旧存档|`loadWorld` 增加 Phase 1 → Phase 2 迁移逻辑|
|UI|`/ship` 改为舰队视角；新增 `/fleet` 页面；`/navigation` 增加编队选择|
|UX|玩家可拥有多艘船、可编队出航、船员不足时禁止出航|
|后续 Phase|Phase 3 扩展战斗时不需要再次迁移 World 结构|

---

## 关联文档

- `docs/roadmap/phase-2-system-depth.md` — Phase 2 完整路线图
- `docs/architecture/fleet-evolution-path.md` — 舰队演进路径（已更新）
- `docs/specifications/world-definition.md` — World 定义
- `docs/guides/project-structure.md` — 项目结构
- `docs/adr/ADR-0002-save-and-json-column.md` — JSON 列存档模式
- `docs/adr/ADR-0003-world-and-gameview-separation.md` — World/GameView 分离
