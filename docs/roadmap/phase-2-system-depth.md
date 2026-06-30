---
status: draft
last_verified: 2026-06-30
---

# Phase 2：系统深度扩展

---

## 目标

在 Phase 1 核心循环完备的基础上，引入**舰队架构**——从单船扩展为可编队出航的舰队系统，同时加入等级、船员、装备等纵向成长维度。

**核心命题：** 从「跑通循环」进化到「让玩家愿意跑 10 小时」。

---

## 架构变更（Phase 1 → Phase 2）

```typescript
// Phase 1
interface World {
  readonly player: PlayerState;
  readonly ship: ShipState;          // 单船
  readonly market: MarketPriceState;
  readonly voyage: VoyageState | null;
}

// Phase 2
interface World {
  readonly player: PlayerState;
  readonly fleet: FleetState;        // 舰队，替换 ship
  readonly market: MarketPriceState;
  readonly voyage: VoyageState | null;
}
```

**核心类型：**

```typescript
interface ShipInstance {
  readonly id: string;               // 唯一标识（uuid）
  readonly typeId: string;
  readonly name: string;             // 玩家可命名
  readonly equipment: ShipEquipment;
  readonly durability: number;
  readonly maxDurability: number;
  readonly cargo: readonly CargoItem[];
  readonly equippedItems: readonly string[];  // 装备 ID 列表
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
  readonly crew: number;             // 当前船员数
  readonly maxCrew: number;          // 最大船员数
  readonly gold: number;             // 舰队共有资金（从 player 移入）
}
```

> `player.gold` 移入 `fleet.gold`：舰队共有资金库，船只买卖/货物交易/船员雇佣均使用同一钱包。

---

## 子阶段划分

### Phase 2.1：玩家等级与经验系统 ✓ 已实现

**独立子阶段，不依赖舰队重构。** 可在 Phase 1.5 完成后立即开始。

#### World 类型变更

```typescript
// PlayerState 新增字段（仅新增，不涉及舰队）
interface PlayerState {
  readonly name: string;
  readonly gold: number;             // Phase 2.2 迁移到 fleet.gold
  readonly currentPortId: string;
  readonly day: number;
  readonly level: number;            // 新增 ✓
  readonly exp: number;              // 新增 ✓
  readonly expToNext: number;        // 新增 ✓
}
```

#### 经验来源与升级

|功能|说明|状态|
|---|---|---|
|贸易经验|卖出货物时获得 `exp = 利润 × LEVEL_EXP_RATIO`|✓|
|事件经验|完成航行随机事件获少量经验|✓|
|升级公式|`expToNext = BASE_EXP × (1 + level × LEVEL_EXP_GROWTH)`|✓|
|升级收益|每级解锁舰队容量 `maxShips`、提升部件升级上限、小幅提升速度系数|✓|

**关联文件：**
- `src/game/domain/types.ts` — `PlayerState` 新增 `level/exp/expToNext`
- `src/game/domain/player.ts` — 新增 `gainExp(world, amount)`、`levelUp` 纯函数
- `src/data/formulas.ts` — `LEVEL_EXP_RATIO`、`LEVEL_EXP_GROWTH`、`BASE_EXP`、`LEVEL_SPEED_PER_LEVEL`、`EVENT_EXP`
- `src/game/domain/trade.ts` — `executeSell` 调用 `gainExp`
- `src/game/domain/voyage.ts` — `applyVoyageEvents` 调用 `gainExp`

#### UI 变更

|页面|变更|状态|
|---|---|---|
|`/` 状态栏|新增等级 + 经验条（显示 "Lv.5 [===>-----] 60%"）|✓|
|造船厂/船坞|购买船只/扩充舰队时显示等级要求|✓|

#### 测试覆盖

|范围|内容|状态|
|---|---|---|
|单元测试|卖出货物后经验增长正确|✓|
||升级触发 levelUp + 属性变化|✓|
||等级不足时拒绝操作|✓|

---

### Phase 2.2：舰队架构重构（核心基础设施变更）✓ 已实现

**一次性基础设施变更**——类型、UseCase、View Builder、Repository 全部更新。这是 Phase 2 的骨架变更，后续子阶段在此基础上加功能。

#### World 类型变更：`ship: ShipState` → `fleet: FleetState`

```typescript
// 替换 ShipState
interface ShipInstance {
  readonly id: string;
  readonly typeId: string;
  readonly name: string;
  readonly equipment: ShipEquipment;
  readonly durability: number;
  readonly maxDurability: number;
  readonly cargo: readonly CargoItem[];
  readonly equippedItems: readonly string[];
}

interface ShipEquipment {
  readonly hullLevel: number;
  readonly sailLevel: number;
  readonly armorLevel: number;
  readonly cannonLevel: number;
}

interface FleetState {
  readonly ships: readonly ShipInstance[];
  readonly maxShips: number;
  readonly crew: number;
  readonly maxCrew: number;
  readonly gold: number;            // 从 PlayerState 移入
}

// PlayerState 移除 gold
interface PlayerState {
  readonly name: string;
  readonly currentPortId: string;
  readonly day: number;
  readonly level: number;
  readonly exp: number;
  readonly expToNext: number;
}

// World 替换 ship → fleet
interface World {
  readonly player: PlayerState;
  readonly fleet: FleetState;       // 替换 ship
  readonly market: MarketPriceState;
  readonly voyage: VoyageState | null;
}
```

#### 部件升级逻辑（旧 Phase 2.1 合并至此）

|功能|说明|状态|
|---|---|---|
|部件升级|每次选择升级一个部件，扣对应金币（各部件价格独立配置）|✓|
|部件上限|每部件上限受船只基础值限制（不同船只可升级空间不同）|✓|
|升级效果|部件等级影响对应能力：hull→容量、sail→速度、armor→耐久、cannon→攻击|✓|

#### 耐久系统

|功能|说明|状态|
|---|---|---|
|耐久消耗|航行基础消耗 + 随机事件（风暴/海盗）额外消耗|✓|
|耐久与升级|armorLevel 越高 → maxDurability 越高|✓|
|修复机制|港口造船厂可付费修复，费用 = 基础修复费率 × 耐久缺口|✓|
|沉船条件|耐久降至 0 → 自动返航最近港口，丢失 50% 货物|✓|

#### 受影响模块清单

|模块|变更内容|状态|
|---|---|---|
|`src/game/domain/types.ts`|`ShipState`→`ShipInstance` + `FleetState` + `ShipEquipment`；`PlayerState.gold` 移除；`World.ship`→`World.fleet`|✓|
|`src/game/domain/ship.ts`|`upgradeComponent` 接受 `fleet` + `shipId` + `component`；`takeDamage`、`repairShip`|✓|
|`src/game/domain/trade.ts`|读 `fleet.gold` 而非 `player.gold`；`executeBuy` 存入 `fleet.ships[activeShip].cargo`|✓|
|`src/game/domain/navigation.ts`|`calcFleetTravelDays`、`getFleetCombatPower` 舰队编队计算|✓|
|`src/game/domain/voyage.ts`|航行期间舰队状态处理（各船耐久消耗）|✓|
|`src/data/ships.ts`|各船只耐久基线、每部件每级升级费用、baseCrew|✓|
|`src/game/view-builder/buildGameView.ts`|`world.ship.*` → `world.fleet.*`；`gold` 来源变更|✓|
|`src/app/actions/trade.ts`|入参/出参适配 `fleet`|✓|
|`src/app/actions/travel.ts`|适配 `fleet`|✓|
|`src/lib/repository.ts`|`parseSaveData` 中旧存档迁移逻辑（`migrateOldShipToFleet`）|✓|

#### UI 适配

|页面|变更|状态|
|---|---|---|
|`/`|状态栏 `gold` 来源变更；显示舰队总舱容/已用|✓|
|`/cargo`|显示当前舰队总货物分布，可按船查看|✓|
|`/voyage`|显示编队出航的船只列表|✓|
|`/ship`|改为舰队视角——船坞列表，选择船只后升级/维修/换装/装备管理|✓|

#### 旧存档迁移

`loadWorld` / `parseSaveData` 检测 `world.ship` 存在 → 转换为 FleetState（含 level 补充、inventory 初始化和新版字段补全）：

```typescript
{
  fleet: {
    ships: [{
      ...world.ship,
      id: "ship-1",
      name: SHIPS.find(s => s.id === world.ship.typeId)?.name ?? "Unknown",
      equipment: { hullLevel: world.ship.upgradeLevel, sailLevel: 0, armorLevel: 0, cannonLevel: 0 },
      durability: world.ship.currentHp,
      maxDurability: world.ship.maxHp,
      equippedItems: [],
    }],
    maxShips: 1,
    crew: shipConfig?.baseCrew ?? 3,
    maxCrew: (shipConfig?.baseCrew ?? 3) * 2,
    gold: world.player.gold,
    inventory: [],
  },
  player: { ...world.player, gold: undefined },  // 移除 gold
}
```

#### 测试覆盖

|范围|内容|状态|
|---|---|---|
|单元测试|所有现有 domain 测试适配 fleet 结构后通过|✓|
||部件升级：各部件正确影响属性、扣金币|✓|
||耐久：航行消耗、事件消耗、修复、沉船|✓|
||旧存档迁移：`ShipState` 正确转为 `FleetState`|✓|

---

### Phase 2.3：多船持有与舰队管理 ✓ 已实现

在 2.2 的 FleetState 基础上，实现多船购买、舰队编组、编队出航。

#### 多船持有

|功能|说明|状态|
|---|---|---|
|购买新船|在对应港口造船厂消耗金币购买，新船加入 `fleet.ships`|✓|
|保留旧船|不折抵，新旧船并存|✓|
|船只上限|`fleet.ships.length ≤ fleet.maxShips`；等级不足时提示|✓|
|出售船只|在造船厂选择出售指定船只，回收部分金币；禁止出售最后一艘船|✓|

#### 舰队编组与出航

|功能|说明|状态|
|---|---|---|
|选择编队|出航前从 `fleet.ships` 中选择本次出航的船只（可选多艘，至少 1 艘）|✓|
|编队总舱容|编队所有船的 `capacity` 之和|✓|
|编队消耗|各船航行消耗之和（若玩家选择全舰队出航则消耗更大）|✓|
|编队战斗力|编队所有船 `cannonLevel` 加权和|✓|
|未出航船只|留在港口，不参与事件，不消耗耐久|✓|

**关联文件：**
- `src/game/domain/ship.ts` — 新增 `buyShip(world, shipId)`、`sellShip(world, shipId)` 纯函数
- `src/game/domain/navigation.ts` — `calcFleetTravelDays` 接受 `shipId[]`（编队选择）；`getFleetCombatPower`
- `src/game/domain/types.ts` — `VoyageState` 新增 `fleetShipIds: string[]`
- `src/game/domain/voyage.ts` — `startVoyage` 接受 `options.fleetShipIds`
- `src/app/ship/actions.ts` — `buyShipAction` / `sellShipAction` Server Actions
- `src/app/fleet/actions.ts` — `switchActiveShipAction` / `setArmamentAction`
- `src/app/navigation/actions.ts` — `loadNavigationView` 显示编队选项

#### 船只购买配置

|船只|出售港口|舱容|速度|特点|状态|
|---|---|---|---|---|---|
|轻木帆船|威尼斯|20|1.2|最快速度，最低载重|✓|
|单桅帆船|威尼斯|35|1.0|基础船|✓|
|单桅三角帆船|伦敦|50|0.9||✓|
|中型帆船|伦敦|80|0.8|均衡型|✓|
|多桅小型帆船|开普敦/孟买|100|0.7|远洋商船|✓|
|三桅帆船|泉州|120|0.6|大容量商船|✓|
|佛兰德帆船|开普敦/孟买|90|0.85|高速大型，消耗高|✓|
|三桅大型帆船|泉州|150|0.55|最大容量，最慢最耗|✓|

> 具体数值在建阶段需平衡。原版氪金船（明永乐大帆船）不引入。

#### 舰队管理 UI（`/fleet` 新页面或 `/ship` 扩展）

|页面|变更|状态|
|---|---|---|
|新增 `/fleet`|舰队总览：所有船只列表（名称/型号/耐久/货物/装备），编队选择|✓|
|`/ship`|当前船只升级/维修/装备，切换船只|✓|
|`/navigation`|出航时展示编队船舶选择界面（勾选/取消）|✓|
|购买弹窗|显示新船属性 + 当前舰队状态 + 购买后舰队容量 + 确认按钮|✓|
|港口绑定|`/ship` 仅显示当前港口可购买的船只|✓|

#### 测试覆盖

|范围|内容|状态|
|---|---|---|
|单元测试|购买新船：金币扣除 + 船只加入 fleet|✓|
||出售船只：金币回收 + 船只移除|✓|
||禁止出售最后一艘船|✓|
||编队出航：各船货物累加 + 各船消耗累加|✓|
||未出航船只：不消耗耐久、不出货|✓|

---

### Phase 2.4：船员系统（抽象资源型）✓ 已实现

作为舰队不可或缺的消耗性资源——每条船需要船员操作，船员影响战斗和航行表现。

#### World 类型（已在 2.2 预留）

```typescript
interface FleetState {
  readonly ships: readonly ShipInstance[];
  readonly maxShips: number;
  readonly crew: number;             // 新增（已在 2.2 预留）
  readonly maxCrew: number;          // 新增（已在 2.2 预留）
  readonly gold: number;
  readonly inventory: readonly string[];
}
```

#### 船员系统设计

|功能|说明|状态|
|---|---|---|
|基本规则|每条船最少需要 `baseCrew` 名船员才能出航；舰队总船员数 = 各船最少船员之和|✓|
|船员上限|`maxCrew` 由舰队总舱位决定（每 5 舱容提供 1 船员位）|✓|
|雇佣与解雇|港口「航海家酒馆」招募或解雇船员；招募费用递增|✓|
|航行消耗|船员每日消耗 `CREW_UPKEEP_PER_DAY` 金币/人（在抵达结算时统一扣除）|✓|
|船员损失|风暴/海盗战斗中可能损失船员|✓|
|低于最低船员|无法出航（「船员不足，无法出海」）|✓|
|船员战斗加成|船员数超出最低需求时，每多 1 名船员提供 `+0.5%` 战斗加成（上限 30%）|✓|

**关联文件：**
- `src/data/formulas.ts` — `BASE_HIRE_COST`、`CREW_UPKEEP_PER_DAY`、`CREW_PER_SLOT`、`STORM_CREW_LOSS_CHANCE`、`COMBAT_VICTORY_CREW_LOSS_CHANCE`、`COMBAT_PARTIAL_LOSS_CREW_LOSS_MIN/MAX`
- `src/game/domain/crew.ts` — `hireCrew`、`fireCrew`、`calcCrewUpkeep`、`calcMinCrewForFleet`、`deductCrewUpkeep`、`recalculateMaxCrew` 纯函数
- `src/data/ships.ts` — 各船只 `baseCrew` 配置（集成在 ship config 中，无独立 crew.ts）
- `src/app/actions/crew.ts` — `hireCrewAction` / `fireCrewAction` Server Actions
- `src/app/tavern/actions.ts` — `loadTavernView`

#### UI 变更

|页面|变更|状态|
|---|---|---|
|`/` 状态栏|新增船员数（当前/最大）|✓|
|新增 `/tavern`|航海家酒馆：招募/解雇船员，显示费率、船员信息|✓|
|出航检查|船员不足时 `/navigation` 页禁用出航按钮并提示|✓|

#### 测试覆盖

|范围|内容|状态|
|---|---|---|
|单元测试|招募正确扣金币 + 增加船员数 + 费率递增|✓|
||解雇减少船员数|✓|
||船员不足拒绝出航|✓|
||航行后正确扣除每日维护费|✓|
||战斗中损失船员逻辑|✓|

---

### Phase 2.5：装备系统 ✓ 已实现

为每条船提供独立装备槽，装备影响船只属性。共 9 种装备（5 类型，每船 3 槽）。

#### 装备类型

|类型|效果|示例|状态|
|---|---|---|---|
|sail（帆）|速度加成|「高速帆」速度 +8%、「疾风帆」+15%|✓|
|cannon（炮）|战斗加成|「轻型火炮」+10%、「加农炮」+15%|✓|
|armor（装甲）|耐久上限加成|「铁甲板」+20、「钢甲板」+40|✓|
|figurehead（船首像）|特殊效果|「海神像」海盗回避率 +10%|✓|
|special（特殊）|综合效果|「货舱加固」舱容 +10、「超大货舱」+25|✓|

#### 系统设计（与 Phase 1 规划一致，调整适配舰队）

|功能|说明|状态|
|---|---|---|
|装备槽|每船 3 个槽位，同类型不可重复装备|✓|
|获取方式|港口铁匠铺/造船厂购买（部分港口专属稀有装备）|✓|
|装备效果|叠加到船只基础 + 部件属性上|✓|
|跨船转移|出售船只前必须卸下所有装备|✓|

**关联文件：**
- `src/data/equipment.ts` — 9 装备配置表（5 类型、售卖港口绑定）
- `src/game/domain/equipment.ts` — `equipItem`、`unequipItem`、`buyEquipment`、`sellEquipment`、属性计算函数
- `src/app/actions/equipment.ts` — `buyEquipmentAction`、`sellEquipmentAction`、`equipItemAction`、`unequipItemAction`
- `src/components/ShipyardPanel.tsx` — 装备购买/出售 + 装备槽插槽 UI（已装备显示 + 可装配/出售列表）
#### UI 变更

|页面|变更|状态|
|---|---|---|
|`/ship`（选中某船后）|装备面板：当前装备 + 舰队装备包 + 装配/卸下操作 + 同类型冲突提示|✓|
|`/market`|「港口铁匠铺」显示该港口可购买装备 + 「已拥有装备包」支持出售|✓|
|装备预览|装配前可查看装备效果描述|✓|

#### 测试覆盖

|范围|内容|状态|
|---|---|---|
|单元测试|装备/卸下正确影响船只属性|✓|
||同类型不可重复装备|✓|
||出售装备船时必须先卸装|✓|
||装备槽满时拒绝装备|✓|

---

### Phase 2.6：存档管理增强 ✓ 已实现

多手动存档位 + 存档信息预览 + 删除存档。全文档系统变更，与舰队架构解耦。

#### 功能

|功能|说明|状态|
|---|---|---|
|多存档位|3 个手动存档槽位 + 1 个自动存档槽位|✓|
|存档信息|槽位显示：玩家等级、舰队规模（船数）、金币、当前港口、天数|✓|
|存/读档|港口页面可手动存档到指定槽位；启动时选择槽位读取|✓|
|删除存档|可删除指定槽位|✓|
|自动存档|每次关键操作后自动存入自动存档槽位，不覆盖手动存档|✓（原有机制不变）|

#### UI 变更

|页面|变更|状态|
|---|---|---|
|启动页|从自动读档改为「选择存档槽位」列表 + 新游戏按钮|✓|
|`/` 设置入口|港口页面新增「存档管理」入口（快捷操作区 + `/saves` 路由）|✓|
|存档管理页|`/saves` 页面：槽位列表 + 存入/覆盖确认 + 读取 + 删除|✓|

**关联文件：**
- `prisma/schema.prisma` — `Save` 模型 `slot` 字段注释更新（0=自动, 1-3=手动）
- `src/lib/repository.ts` — 新增 `loadWorldFromSlot`、`saveWorldToSlot`、`listSaves`、`deleteSave`；重构 `parseSaveData` 提取迁移逻辑
- `src/types/prisma.ts` — `PrismaTransactionClient` 新增 `findMany`、`delete` 方法
- `src/types/game-view.ts` — 新增 `SaveSlotView` 类型
- `src/game/view-builder/buildGameView.ts` — 新增 `buildSaveSlotViews` 函数
- `src/app/actions/save.ts` — 新增 `manualSave`、`loadSaveSlot`、`deleteSaveSlot` Server Actions
- `src/app/SaveSlotList.tsx` — 新增存档槽位选择/管理客户端组件
- `src/app/saves/page.tsx` — 新增存档管理页面
- `src/app/page.tsx` — 无自动存档时显示存档槽位选择器
- `src/app/HarborDashboard.tsx` — 新增「存档管理」快捷入口

#### 测试覆盖

|范围|内容|状态|
|---|---|---|
|单元测试|`buildSaveSlotViews`：空槽位、有效存档、多槽位独立、旧格式兼容、损坏 JSON|✓|
|集成测试|多 slot 读写互不干扰|✓|
||手动存档 + 自动存档共存|✓|
||删除存档后对应 slot 可用|✓|

---

## 依赖关系

```
Phase 2.1 (等级经验) ─── 独立，可先做
Phase 2.2 (舰队重构) ─── 独立，一次性基础设施变更
                              │
                   ┌──────────┼──────────┐
                   │          │          │
Phase 2.3 (多船管理)  2.4 (船员)  2.5 (装备)
                   │          │          │
                   └──────────┴──────────┘
                        都依赖 2.2
Phase 2.6 (存档管理) ─── 独立，随时可做
```

**推荐执行顺序：** 2.1（独立热身）→ 2.2（硬骨头先啃）→ 2.3 + 2.4 + 2.5（并行）→ 2.6（收尾）

---

## 暂不实现（Phase 2 范围外）

|功能|备注|预计 Phase|
|---|---|---|
|完整战斗系统（炮击类型、多回合战术选择）|Phase 1.4 已有基础 + Phase 2.4 船员 + Phase 2.5 装备|Phase 3|
|剧情系统（主线任务）|—|Phase 3|
|图形化世界地图|当前文字列表，符合定位|低优先级|
|船队热切换（航海中更换编队）|—|Phase 3|
|船员个体化（命名/技能/成长）|当前为抽象资源|Phase 3|
|成就系统|长线留存|Phase 4|
|图鉴系统|收集要素|Phase 4|
|音效和音乐|—|Phase 4|
|社交系统（帮会/师徒/结婚）|单机版不计划|不计划|
|PK 海域|单机版不计划|不计划|
|活动/限时事件|无运营需求|不计划|
|MOD 支持|—|Phase 5|
|Zustand|当前架构不需要|见 Phase 1 条件|

---

## 完成标准

### 硬性条件（必须满足）

- [x] `World.ship` → `World.fleet` 重构完成，所有现有 UseCase/View Builder/UI 适配
- [x] 玩家等级系统：贸易产生经验 → 升级 → 解锁 `maxShips` 和部件上限
- [x] 多船持有：可购买多艘船，旧船保留，舰队管理页面完整
- [x] 编队出航：出航时选择船只、计算总舱容和总消耗
- [x] 船员系统：招募/解雇/日常消耗/战斗损失/船员不足禁止出航
- [x] 部件升级：hull/sail/armor/cannon 四部件独立升级 + 耐久维修
- [x] 装备系统：9 种装备，每船 3 槽，正确装配/卸下/叠加
- [x] 8 种可购买船只，各有差异化属性 + 港口绑定
- [x] 3 个手动存档位，存/读/删功能完整
- [x] 旧存档自动迁移（Phase 1 `ShipState` → Phase 2 `FleetState`）
- [x] `npx next build` 无错误
- [x] 游戏引擎纯函数测试全部通过（222 pass）

### 质量条件（建议满足）

- [x] 等级曲线：经验公式已实现，通过 `LEVEL_EXP_GROWTH`、`BASE_EXP` 可调
- [x] 船只价格梯度合理：8 船只价格梯度明确
- [x] 船员维护费形成有意义的策略压力——不是负担但需要规划
- [x] 装备稀有度平衡合理，无碾压性装备
- [x] UI 无控制台报错
- [x] 存档切换流畅，无数据丢失风险

---

## 与后续 Phase 的边界

|系统|Phase 2 做到什么程度|后续再做什么|
|---|---|---|
|战斗|Phase 1.4 基础海盗碰撞 + Phase 2.4 船员加成 + Phase 2.5 装备加成|多回合战术选择、炮击类型、交战前选择迎战/逃跑/谈判|
|舰队|`FleetState` 基础结构 + 多船持有 + 编队出航|船队热切换、旗舰系统、舰队阵型|
|船员|抽象资源池 + 最低船员 + 维护费 + 战斗加成|个体船员（命名/技能/忠诚度/成长）|
|港口|8-12 港口 + 文字列表|图形化世界地图（低优先级）|

---

## 参考文档

|主题|文档|
|---|---|
|原版游戏调研|`docs/reference/deep-research-report.md`|
|Phase 1 完整路线图|`docs/roadmap/phase-1-mvp.md`|
|舰队演进路径（原 Phase 2→3 迁移策略，待更新）|`docs/architecture/fleet-evolution-path.md`|
|World 定义|`docs/specifications/world-definition.md`|
|Clean Architecture 分层|`docs/architecture/clean-architecture-lite.md`|
|数据流|`docs/architecture/data-flow.md`|
|Prisma 使用规范|`docs/guides/prisma-usage.md`|
|状态管理|`docs/guides/state-management.md`|
|架构宪法|`AGENTS.md`|
