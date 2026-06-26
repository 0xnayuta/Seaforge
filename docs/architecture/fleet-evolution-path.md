---
status: current
last_verified: 2026-06-26
---

# 舰队系统演进路径（Fleet Evolution Path）

**关联规则：** R1, R2, R8

---

## 动机

原版《纵横四海》最深的策略层来自 **「货舱 vs 战力」的取舍博弈**——玩家必须在舰队中决定牺牲多少货舱位置来配置武装战船以保障安全，还是全堆舱容赌一路顺风。

当前 Phase 1 为单船架构，Phase 2 起引入舰队系统。本文档记录从单船到舰队的演进路径和迁移策略。

---

## 当前架构（Phase 1）

```typescript
interface ShipState {
  readonly typeId: string;
  readonly upgradeLevel: number;
  readonly cargo: readonly CargoItem[];
}

interface World {
  readonly player: PlayerState;
  readonly ship: ShipState;          // 单船
  readonly market: MarketPriceState;
  readonly voyage: VoyageState | null;
}
```

---

## 演进路径

### Phase 2：舰队架构重构 + 多船管理

一次性将 `ship: ShipState` 重构为 `fleet: FleetState`：

```typescript
interface ShipInstance {
  readonly id: string;               // uuid
  readonly typeId: string;
  readonly name: string;             // 玩家可命名
  readonly equipment: ShipEquipment;
  readonly durability: number;
  readonly maxDurability: number;
  readonly cargo: readonly CargoItem[];
  readonly equippedItems: readonly string[];
}

interface ShipEquipment {
  readonly hullLevel: number;        // 最大舱容
  readonly sailLevel: number;        // 速度
  readonly armorLevel: number;       // 耐久上限
  readonly cannonLevel: number;      // 战斗攻击力
}

interface FleetState {
  readonly ships: readonly ShipInstance[];
  readonly maxShips: number;         // 由等级决定
  readonly crew: number;
  readonly maxCrew: number;
  readonly gold: number;             // 从 PlayerState 移入
}

interface World {
  readonly player: PlayerState;
  readonly fleet: FleetState;        // 替换 ship
  readonly market: MarketPriceState;
  readonly voyage: VoyageState | null;
}
```

**变化范围：**
- `src/game/domain/types.ts` — 全部类型变更
- `src/game/domain/ship.ts` — 升级/购买/出售适配 fleet
- `src/game/domain/trade.ts` — fleet.gold + 船舱货物
- `src/game/domain/navigation.ts` — 编队出航
- `src/data/ships.ts` — 新增船只配置 + 部件费用
- `src/game/view-builder/` — world.ship → world.fleet
- `src/app/actions/` — 所有 action 适配
- `src/lib/repository.ts` — 旧存档迁移
- UI `/fleet`（新增）/ `/ship` / `/cargo` / `/navigation`

### Phase 3：战斗深度与剧情

在 Phase 2 舰队架构基础上，扩展战斗系统深度和剧情系统。

**战斗扩展方向：**
- 多回合战术选择（迎战/逃跑/谈判）
- 炮击类型差异化
- 个体船员（命名/技能/成长）
- 战报深度增强

**已不属于 Phase 3 的内容：**
- ~~舰队系统~~ → 已提前至 Phase 2
- ~~部件升级~~ → 已提前至 Phase 2
- ~~船员系统~~ → 已提前至 Phase 2

---

## 决策原则

|原则|说明|
|---|---|
|**Phase 1 不动 ship 结构**|单船足够跑通核心循环|
|**Phase 2 一次性重构**|`ship → fleet` + 部件 + 耐久 + 船员一次完成，不拆为两次改类型|
|**Phase 2 不做完整战斗**|仅 Phase 1.4 基础海盗碰撞 + 船员/装备加成，不涉及多回合战术|
|**禁止提前抽象**|不为「以后可能需要的功能」预留未使用的接口|

---

## World 向后兼容

|阶段|迁移方式|
|---|---|
|Phase 1 → Phase 2|`ShipState` → 包装为 `FleetState` 中的单船数组；`upgradeLevel` → `equipment.hullLevel`；`player.gold` → `fleet.gold`|

迁移逻辑在 `lib/repository.ts` 的 `loadWorld` 中实现，检查旧结构并升级。

---
### 当前不需要的行动

- 不改战斗系统（Phase 3）
- 不加多回合战术（Phase 3）
- 不加个体船员（Phase 3）
