// ============================================================
// View Builder — World → GameView 转换器
// 纯函数，无副作用，不调用数据库
// ============================================================

import {
  EQUIPMENT_TYPE_LABELS,
  EQUIPMENTS,
  getEquipmentEffectDescription,
} from "../../data/equipment";
import {
  BASE_HIRE_COST,
  REPAIR_COST_MULTIPLIER,
  SURVIVAL_DISTANCE_FACTOR,
} from "../../data/formulas";
import { CATEGORY_LABEL, GOODS } from "../../data/goods";
import { ITEM_QUALITY_LABELS, ITEMS, type ItemConfig } from "../../data/items";
import { NPCS } from "../../data/npcs";
import { PORTS } from "../../data/ports";
import { QUESTS } from "../../data/quests";
import { REGIONS } from "../../data/regions";
import { SHIPS } from "../../data/ships";
import { SKILLS } from "../../data/skills";
import type {
  AvailableShipView,
  CargoItemView,
  CargoView,
  CharacterView,
  CombatChoiceView,
  CombatLogEntryView,
  CombatParticipantView,
  ComponentView,
  DestinationView,
  FleetShipSummaryView,
  FleetView,
  GoodView,
  HarborView,
  MarketView,
  NavigationView,
  NpcDetailView,
  NpcSummaryView,
  PersonCombatView,
  QuestBoardView,
  QuestDetailView,
  QuestSummaryView,
  SaveSlotView,
  ShipView,
  ShipyardView,
  SkillView,
  TavernView,
  VoyageEventView,
  VoyageView,
} from "../../types/game-view";
import type { CombatOutcome } from "../domain/combat";
import {
  getShipCargoCapacity,
  getShipDefenseMultiplier,
  getShipSpeed,
} from "../domain/equipment";
import { getPortGoods, getSellPrice } from "../domain/market";
import {
  getEffectiveCapacityForShip,
  getReachablePorts,
} from "../domain/navigation";
import { calcPanelStats } from "../domain/player";
import { getAvailableQuests } from "../domain/quest";
import type { ComponentType } from "../domain/ship";
import {
  ARMAMENT_LABELS,
  COMPONENT_LABELS,
  getActiveShip,
} from "../domain/ship";
import { getMaxCapacity, getUsedCapacity } from "../domain/trade";
import type {
  CombatParticipant,
  ShipInstance,
  VoyageEvent,
  World,
} from "../domain/types";

// ============================================================
// 主入口
// ============================================================

function getRegionName(regionId: string | undefined): string {
  return REGIONS.find((r) => r.id === regionId)?.name ?? "";
}
export function buildHarborView(world: World): HarborView {
  const port = PORTS.find((p) => p.id === world.player.currentPortId);
  const activeShip = getActiveShip(world);
  const ship = SHIPS.find((s) => s.id === activeShip.typeId);

  // 构建当前港口的 NPC 摘要
  const npcsAtPort = NPCS.filter(
    (n) => n.portId === world.player.currentPortId,
  ).map((npc) => {
    const rel = world.npcRelations[npc.id];
    return {
      id: npc.id,
      name: npc.name,
      type: npc.type,
      typeLabel: npcTypeLabel(npc.type),
      portName: port?.name ?? "",
      affinity: rel?.affinity ?? 0,
      recruited: rel?.recruited ?? false,
      recruitable: npc.recruitable,
    } satisfies NpcSummaryView;
  });

  const availableQuests = getAvailableQuests(world);

  return {
    portName: port?.name ?? "未知",
    portDescription: port?.description ?? "",
    region: getRegionName(port?.regionId),
    playerGold: world.fleet.gold,
    cargoCount: getUsedCapacity(world),
    cargoCapacity: getMaxCapacity(world),
    currentDay: world.player.day,
    shipName: ship?.name ?? "未知",
    shipCurrentHp: activeShip.durability,
    shipMaxHp: activeShip.maxDurability,
    playerLevel: world.player.level,
    playerExp: world.player.exp,
    playerExpToNext: world.player.expToNext,
    crew: world.fleet.crew,
    maxCrew: world.fleet.maxCrew,
    npcsAtPort,
    questsAvailable: availableQuests.length,
  };
}

export function buildMarketView(world: World): MarketView {
  const port = PORTS.find((p) => p.id === world.player.currentPortId);
  const portGoods = getPortGoods(world.player.currentPortId, world);
  const activeShip = getActiveShip(world);

  const goods: GoodView[] = portGoods.map(({ good, buyPrice }) => {
    const cargo = activeShip.cargo.find((c) => c.goodId === good.id);
    const inCargo = cargo?.quantity ?? 0;
    const sellPrice = getSellPrice(good.id, world.player.currentPortId, world);
    const estimatedProfit =
      cargo != null ? (sellPrice - cargo.buyPrice) * cargo.quantity : undefined;

    const basePrice = good.basePrice;
    const priceChangePercent =
      basePrice > 0
        ? Math.round(((buyPrice - basePrice) / basePrice) * 100)
        : 0;

    return {
      id: good.id,
      name: good.name,
      category: CATEGORY_LABEL[good.category],
      buyPrice,
      sellPrice,
      inCargo,
      cargoBuyPrice: cargo?.buyPrice,
      estimatedProfit,
      canAfford: world.fleet.gold >= buyPrice,
      volume: good.volume,
      priceChangePercent,
    };
  });

  return {
    portName: port?.name ?? "未知",
    goods,
    playerGold: world.fleet.gold,
    cargoCount: getUsedCapacity(world),
    cargoCapacity: getEffectiveCapacityForShip(
      activeShip.typeId,
      getMaxCapacity(world),
      activeShip.armamentLevel,
    ),
  };
}

export function buildNavigationView(world: World): NavigationView {
  const port = PORTS.find((p) => p.id === world.player.currentPortId);
  const reachable = getReachablePorts(world);
  const activeShip = getActiveShip(world);

  const depRegion = REGIONS.find((reg) => reg.id === port?.regionId);
  const depRegionMod = depRegion?.dangerModifier ?? 1.0;
  const destinations: DestinationView[] = reachable.map((r) => {
    const estimatedProfit = activeShip.cargo.reduce((sum, c) => {
      const targetPrice = getSellPrice(c.goodId, r.port.id, world);
      return sum + (targetPrice - c.buyPrice) * c.quantity;
    }, 0);

    const depDanger = port?.danger ?? 0.5;
    const arrDanger = r.port.danger;
    const avgDanger = (depDanger + arrDanger) / 2;
    const destRegion = REGIONS.find((reg) => reg.id === r.port.regionId);
    const avgModifier =
      (depRegionMod + (destRegion?.dangerModifier ?? 1.0)) / 2;
    const baseDangerScore =
      avgDanger * r.distance * SURVIVAL_DISTANCE_FACTOR * avgModifier;

    return {
      portId: r.port.id,
      portName: r.port.name,
      region: getRegionName(r.port.regionId),
      distance: r.distance,
      travelDays: r.travelDays,
      estimatedProfit,
      baseDangerScore,
    };
  });

  return {
    currentPortName: port?.name ?? "未知",
    destinations,
    currentCargoCount: getUsedCapacity(world),
    fleetShips: world.fleet.ships.map((ship) =>
      buildFleetShipSummaryView(world, ship),
    ),
    crew: world.fleet.crew,
    maxCrew: world.fleet.maxCrew,
  };
}

export function buildCargoView(world: World): CargoView {
  const activeShip = getActiveShip(world);
  const ship = SHIPS.find((s) => s.id === activeShip.typeId);

  const items: CargoItemView[] = activeShip.cargo.map((c) => {
    const good = GOODS.find((g) => g.id === c.goodId);
    const sellPrice = getSellPrice(c.goodId, world.player.currentPortId, world);
    return {
      goodId: c.goodId,
      goodName: good?.name ?? "未知",
      category: good ? CATEGORY_LABEL[good.category] : "",
      quantity: c.quantity,
      buyPrice: c.buyPrice,
      sellPrice,
      volume: good?.volume ?? 0,
      estimatedProfit: (sellPrice - c.buyPrice) * c.quantity,
    };
  });

  return {
    shipName: ship?.name ?? "未知",
    usedCapacity: getUsedCapacity(world),
    maxCapacity: getMaxCapacity(world),
    effectiveCapacity: getEffectiveCapacityForShip(
      activeShip.typeId,
      getMaxCapacity(world),
      activeShip.armamentLevel,
    ),
    items,
  };
}

function buildComponentDescription(
  component: ComponentType,
  level: number,
): string {
  switch (component) {
    case "hull":
      return `舱容 ${10 + level * 20}%`;
    case "sail":
      return `速度 ${5 + level * 5}%`;
    case "armor":
      return `耐久上限 ${20 + level * 20}%`;
    case "cannon":
      return `攻击 ${10 + level * 10}%`;
  }
}

export function buildShipView(world: World, targetShipId?: string): ShipView {
  const activeShip = targetShipId
    ? (world.fleet.ships.find((s) => s.id === targetShipId) ??
      getActiveShip(world))
    : getActiveShip(world);
  const shipConfig = SHIPS.find((s) => s.id === activeShip.typeId);
  if (!shipConfig) throw new Error("无效船只");

  const missing = activeShip.maxDurability - activeShip.durability;
  const repairCost =
    missing > 0
      ? Math.ceil(
          missing * shipConfig.repairCostPerDurability * REPAIR_COST_MULTIPLIER,
        )
      : 0;

  const components: ComponentView[] = (
    ["hull", "sail", "armor", "cannon"] as ComponentType[]
  ).map((component) => {
    const equipKey =
      component === "hull"
        ? "hullLevel"
        : component === "sail"
          ? "sailLevel"
          : component === "armor"
            ? "armorLevel"
            : "cannonLevel";
    const level = activeShip.equipment[equipKey];
    const maxLevel = shipConfig.maxComponentLevel;
    const canUpgrade = level < maxLevel;
    const cost = canUpgrade ? shipConfig.upgradeCosts[component][level] : null;

    return {
      id: component,
      label: COMPONENT_LABELS[component],
      level,
      maxLevel,
      nextCost: cost,
      canUpgrade:
        canUpgrade && world.fleet.gold >= (cost ?? Infinity) && !world.voyage,
      upgradeDescription: buildComponentDescription(component, level + 1),
    };
  });

  const sellPrice = (eq: { price: number } | undefined) =>
    eq ? Math.floor(eq.price * 0.5) : 0;

  const equippedItems = (activeShip.equippedItems || []).map((itemId) => {
    const eq = EQUIPMENTS.find((e) => e.id === itemId);
    return {
      id: itemId,
      name: eq?.name ?? "未知",
      type: eq?.type ?? "special",
      typeLabel: eq ? EQUIPMENT_TYPE_LABELS[eq.type] : "未知",
      effectDescription: eq ? getEquipmentEffectDescription(eq) : "",
      sellPrice: sellPrice(eq),
    };
  });

  const fleetInventory = (world.fleet.shipEquipmentInventory || []).map(
    (itemId) => {
      const eq = EQUIPMENTS.find((e) => e.id === itemId);
      return {
        id: itemId,
        name: eq?.name ?? "未知",
        type: eq?.type ?? "special",
        typeLabel: eq ? EQUIPMENT_TYPE_LABELS[eq.type] : "未知",
        effectDescription: eq ? getEquipmentEffectDescription(eq) : "",
        sellPrice: sellPrice(eq),
      };
    },
  );

  return {
    shipName: shipConfig.name,
    fleetGold: world.fleet.gold,
    durability: activeShip.durability,
    maxDurability: activeShip.maxDurability,
    repairCost,
    canRepair: missing > 0 && world.fleet.gold >= repairCost && !world.voyage,
    blockedByVoyage: !!world.voyage,
    components,
    equippedItems,
    fleetInventory,
  };
}

// ============================================================
// 舰队视图辅助函数
// ============================================================

function buildFleetShipSummaryView(
  world: World,
  ship: ShipInstance,
): FleetShipSummaryView {
  const shipConfig = SHIPS.find((s) => s.id === ship.typeId);
  const typeName = shipConfig?.name ?? "未知";
  const cargoCapacity = shipConfig ? getShipCargoCapacity(ship, shipConfig) : 0;

  const cargoUsed = ship.cargo.reduce((sum, c) => {
    const good = GOODS.find((g) => g.id === c.goodId);
    return sum + (good?.volume ?? 0) * c.quantity;
  }, 0);

  const speed = shipConfig ? getShipSpeed(ship, shipConfig) : 0;

  const defenseMultiplier = shipConfig
    ? getShipDefenseMultiplier(ship, shipConfig)
    : 1.0;

  const cargo: CargoItemView[] = ship.cargo.map((c) => {
    const good = GOODS.find((g) => g.id === c.goodId);
    const goodName = good?.name ?? "未知";
    const category = good ? CATEGORY_LABEL[good.category] : "未知";
    const volume = good?.volume ?? 1;
    const sellPrice = getSellPrice(c.goodId, world.player.currentPortId, world);
    const estimatedProfit = (sellPrice - c.buyPrice) * c.quantity;

    return {
      goodId: c.goodId,
      goodName,
      quantity: c.quantity,
      category,
      buyPrice: c.buyPrice,
      sellPrice,
      volume,
      estimatedProfit,
    };
  });

  return {
    id: ship.id,
    name: ship.name,
    typeName,
    durability: ship.durability,
    maxDurability: ship.maxDurability,
    cargoUsed,
    cargoCapacity,
    speed,
    isActive: ship.id === world.fleet.activeShipId,
    armamentLevel: ship.armamentLevel,
    armamentLabel: ARMAMENT_LABELS[ship.armamentLevel],
    defenseMultiplier,
    cargo,
    baseCrew: shipConfig?.baseCrew ?? 0,
  };
}

export function buildFleetView(world: World): FleetView {
  const ships: FleetShipSummaryView[] = world.fleet.ships.map((ship) =>
    buildFleetShipSummaryView(world, ship),
  );

  return {
    ships,
    maxShips: world.fleet.maxShips,
    fleetGold: world.fleet.gold,
    blockedByVoyage: !!world.voyage,
  };
}

export function buildShipyardView(
  world: World,
  selectedShipId?: string,
): ShipyardView {
  const port = PORTS.find((p) => p.id === world.player.currentPortId);
  const ships: FleetShipSummaryView[] = world.fleet.ships.map((ship) =>
    buildFleetShipSummaryView(world, ship),
  );

  const targetShipId = selectedShipId ?? world.fleet.activeShipId;
  const selectedShip =
    world.fleet.ships.find((s) => s.id === targetShipId) ??
    getActiveShip(world);

  const selectedShipDetail = buildShipView(world, selectedShip.id);

  const availableShips: AvailableShipView[] = SHIPS.filter(
    (s) =>
      s.sellPortIds.length > 0 &&
      s.sellPortIds.includes(world.player.currentPortId),
  ).map((s) => ({
    typeId: s.id,
    name: s.name,
    capacity: s.capacity,
    speed: s.speed,
    price: s.basePrice,
    canAfford: world.fleet.gold >= s.basePrice,
    fleetFull: world.fleet.ships.length >= world.fleet.maxShips,
  }));

  const availableEquipments = EQUIPMENTS.filter((e) =>
    e.sellPortIds.includes(world.player.currentPortId),
  ).map((e) => ({
    id: e.id,
    name: e.name,
    type: e.type,
    typeLabel: EQUIPMENT_TYPE_LABELS[e.type],
    effectDescription: getEquipmentEffectDescription(e),
    price: e.price,
    canAfford: world.fleet.gold >= e.price,
  }));

  return {
    portName: port?.name ?? "未知",
    ships,
    selectedShipId: selectedShip.id,
    selectedShipDetail,
    availableShips,
    availableEquipments,
    maxShips: world.fleet.maxShips,
    fleetGold: world.fleet.gold,
    blockedByVoyage: !!world.voyage,
  };
}
function formatCombatLog(outcome: CombatOutcome): CombatLogEntryView {
  const resultLabel =
    outcome.result === "victory"
      ? "胜利"
      : outcome.result === "partialLoss"
        ? "受损"
        : "惨败";
  return {
    result: resultLabel,
    description: outcome.description,
    hpDamage: outcome.hpDamage,
    cargoLoss: outcome.cargoLoss,
    ...(outcome.allCargoLost ? { allCargoLost: true as const } : {}),
  };
}
/** 格式化金币变动文本 */
function formatGoldChange(goldChange: number): string | null {
  if (goldChange > 0) return `获得 ${goldChange} 金币`;
  if (goldChange < 0) return `损失 ${Math.abs(goldChange)} 金币`;
  return null;
}

/** 格式化单个航行事件视图 */
function buildEventView(event: VoyageEvent): VoyageEventView {
  const parts: string[] = [];
  const goldText = formatGoldChange(event.goldChange);
  if (goldText) parts.push(goldText);
  if (event.cargoLoss > 0) parts.push(`丢失 ${event.cargoLoss} 单位货物`);

  const combatLog = event.combatOutcome
    ? formatCombatLog(event.combatOutcome)
    : undefined;
  const effect =
    parts.length > 0 ? parts.join("，") : combatLog ? "" : "无影响";

  return {
    day: event.day,
    description: event.description,
    effect,
    combatLog,
  };
}

export function buildVoyageView(world: World): VoyageView {
  const voyage = world.voyage;
  if (!voyage) {
    return {
      fromPortName: "未知",
      toPortName: "未知",
      travelDays: 0,
      isUnderway: false,
      events: [],
      fleetShipCount: 0,
      combatState: null,
      combatChoice: null,
    };
  }

  const fromPort = PORTS.find((p) => p.id === voyage.fromPortId);
  const toPort = PORTS.find((p) => p.id === voyage.toPortId);

  return {
    fromPortName: fromPort?.name ?? "未知",
    toPortName: toPort?.name ?? "未知",
    travelDays: voyage.travelDays,
    isUnderway: true,
    events: voyage.events.map(buildEventView),
    fleetShipCount: voyage.fleetShipIds ? voyage.fleetShipIds.length : 1,
    combatState: buildPersonCombatView(world),
    combatChoice: buildCombatChoiceView(world),
  };
}

function buildCombatParticipantView(
  p: CombatParticipant,
): CombatParticipantView {
  const weaponName = p.weaponId
    ? (ITEMS.find((i) => i.id === p.weaponId)?.name ?? null)
    : null;
  return {
    id: p.id,
    name: p.name,
    type: p.type,
    hp: p.hp,
    maxHp: p.maxHp,
    mp: p.mp,
    maxMp: p.maxMp,
    spd: p.spd,
    level: p.level,
    weaponName,
    statuses: p.statuses.map((s) => ({
      type: s.type,
      label: getStatusLabel(s.type),
      duration: s.duration,
    })),
    isDodging: p.isDodging,
    isParrying: p.isParrying,
    isDead: p.hp <= 0,
  };
}

function buildPersonCombatView(world: World): PersonCombatView | null {
  const combat = world.combat;
  if (!combat) return null;

  const currentTurnId = combat.turnOrder[combat.currentTurnIndex];
  const player = combat.participants.find((p) => p.id === "player");
  if (!player) return null;

  const weaponConfig = player.weaponId
    ? ITEMS.find((i) => i.id === player.weaponId)
    : null;
  const availableSkills: SkillView[] = weaponConfig?.skills
    ? weaponConfig.skills
        .filter((s) => player.level >= s.levelRequired)
        .map((s) => {
          const skill = SKILLS.find((sk) => sk.id === s.skillId);
          if (!skill) return null;
          return {
            skillId: skill.id,
            name: skill.name,
            mpCost: skill.mpCost,
            type: skill.type,
            description: skill.description,
            power: skill.power,
          };
        })
        .filter((s): s is SkillView => s !== null)
    : [];

  return {
    participants: combat.participants.map(buildCombatParticipantView),
    turnOrder: combat.turnOrder,
    currentTurnId,
    round: combat.round,
    logs: combat.logs.map((l) => ({
      round: l.round,
      message: l.message,
    })),
    status: combat.status,
    isPlayerTurn: combat.status === "in_progress" && currentTurnId === "player",
    availableSkills,
  };
}

function buildCombatChoiceView(world: World): CombatChoiceView | null {
  const voyage = world.voyage;
  if (!voyage || !voyage.combatSelection) return null;

  const difficulty = 1; // default fallback
  return {
    hasSelection: true,
    isDirectBoarding: voyage.directBoarding ?? false,
    difficulty,
  };
}

function getStatusLabel(type: string): string {
  const labels: Record<string, string> = {
    poison: "中毒",
    bleed: "出血",
    burn: "燃烧",
    freeze: "冰冻",
    sleep: "睡眠",
    silence: "沉默",
    blind: "暗闇",
  };
  return labels[type] ?? type;
}
export function buildTavernView(world: World): TavernView {
  const port = PORTS.find((p) => p.id === world.player.currentPortId);
  const fleet = world.fleet;
  const ships = fleet.ships.map((ship) => {
    const config = SHIPS.find((s) => s.id === ship.typeId);
    return {
      id: ship.id,
      name: ship.name,
      typeName: config?.name ?? "未知",
      baseCrew: config?.baseCrew ?? 0,
    };
  });

  const minCrew = ships.reduce((sum, s) => sum + s.baseCrew, 0);
  const hireCost = Math.floor(BASE_HIRE_COST * (1 + fleet.crew * 0.1));

  // Calculate max hireable quantity
  const remainingSlots = fleet.maxCrew - fleet.crew;
  let maxHireable = 0;
  let tempGold = fleet.gold;
  while (maxHireable < remainingSlots) {
    const nextCost = Math.floor(
      BASE_HIRE_COST * (1 + (fleet.crew + maxHireable) * 0.1),
    );
    if (tempGold < nextCost) break;
    tempGold -= nextCost;
    maxHireable++;
  }

  return {
    portName: port?.name ?? "未知",
    gold: fleet.gold,
    crew: fleet.crew,
    maxCrew: fleet.maxCrew,
    minCrew,
    hireCost,
    maxHireable,
    blockedByVoyage: world.voyage !== null,
    ships,
  };
}

// ============================================================
// 存档槽位视图
// ============================================================

const SAVE_SLOT_NAMES = ["自动存档", "存档位 1", "存档位 2", "存档位 3"];

/** 存档行原始数据（从 Repository 传入，不依赖 Prisma 类型） */
export interface RawSaveRow {
  slot: number;
  data: string;
  updatedAt: Date;
}

/**
 * 将原始存档行列表转换为存档槽位预览视图。
 * 保证 4 个槽位（0-3）都有对应条目，空槽位 exists=false。
 * 兼容旧存档格式（ship → fleet 迁移前）。
 */
export function buildSaveSlotViews(saves: RawSaveRow[]): SaveSlotView[] {
  return [0, 1, 2, 3].map((slot) => {
    const save = saves.find((s) => s.slot === slot);
    if (!save) {
      return {
        slot,
        slotName: SAVE_SLOT_NAMES[slot],
        exists: false,
        playerLevel: 0,
        shipCount: 0,
        gold: 0,
        currentPortName: "",
        day: 0,
        updatedAt: "",
      };
    }

    try {
      const parsed = JSON.parse(save.data) as Record<string, unknown>;
      const player = (parsed.player ?? {}) as Record<string, unknown>;
      const fleet = (parsed.fleet ?? {}) as Record<string, unknown>;
      const portId = player.currentPortId as string | undefined;
      const port = portId ? PORTS.find((p) => p.id === portId) : undefined;
      const ships = fleet.ships as unknown[] | undefined;

      return {
        slot,
        slotName: SAVE_SLOT_NAMES[slot],
        exists: true,
        playerLevel: (player.level as number) ?? 1,
        shipCount: ships?.length ?? (parsed.ship ? 1 : 0),
        gold: (fleet.gold as number) ?? (player.gold as number) ?? 0,
        currentPortName: port?.name ?? "未知",
        day: (player.day as number) ?? 1,
        updatedAt: save.updatedAt.toISOString(),
      };
    } catch {
      return {
        slot,
        slotName: SAVE_SLOT_NAMES[slot],
        exists: false,
        playerLevel: 0,
        shipCount: 0,
        gold: 0,
        currentPortName: "",
        day: 0,
        updatedAt: "",
      };
    }
  });
}

const ITEM_TYPE_LABELS = {
  weapon: "武器",
  armor: "铠甲",
  accessory: "饰品",
  consumable: "消耗品",
  material: "材料",
} as const;

function getItemEffectDescription(config: ItemConfig): string {
  const parts: string[] = [];
  if (config.effect.hpBonus) parts.push(`生命值 +${config.effect.hpBonus}`);
  if (config.effect.atkBonus) parts.push(`攻击力 +${config.effect.atkBonus}`);
  if (config.effect.defBonus) parts.push(`防御力 +${config.effect.defBonus}`);
  if (config.effect.magBonus) parts.push(`魔力 +${config.effect.magBonus}`);
  if (config.effect.mdfBonus) parts.push(`魔防 +${config.effect.mdfBonus}`);
  if (config.effect.spdBonus) parts.push(`速度 +${config.effect.spdBonus}`);
  if (config.effect.lukBonus) parts.push(`幸运 +${config.effect.lukBonus}`);
  if (config.effect.equipLoadBonus)
    parts.push(`负重 +${config.effect.equipLoadBonus}`);

  if (config.scaling) {
    const scalings: string[] = [];
    if (config.scaling.str)
      scalings.push(`力[${ITEM_QUALITY_LABELS[config.scaling.str]}]`);
    if (config.scaling.dex)
      scalings.push(`敏[${ITEM_QUALITY_LABELS[config.scaling.dex]}]`);
    if (config.scaling.int)
      scalings.push(`智[${ITEM_QUALITY_LABELS[config.scaling.int]}]`);
    if (config.scaling.fth)
      scalings.push(`信[${ITEM_QUALITY_LABELS[config.scaling.fth]}]`);
    if (config.scaling.arc)
      scalings.push(`感[${ITEM_QUALITY_LABELS[config.scaling.arc]}]`);
    if (scalings.length > 0) {
      parts.push(`补正: ${scalings.join(" ")}`);
    }
  }
  return parts.join(", ") || "无额外效果";
}

export function buildCharacterView(world: World): CharacterView {
  const player = world.player;
  const panel = calcPanelStats(player, world.fleet.inventory);

  const getEquippedView = (uid: string | null) => {
    if (!uid) return null;
    const instance = world.fleet.inventory.find((item) => item.uid === uid);
    if (!instance) return null;
    const config = ITEMS.find((cfg) => cfg.id === instance.itemId);
    if (!config) return null;
    return {
      uid: instance.uid,
      itemId: instance.itemId,
      name: config.name,
      typeLabel: ITEM_TYPE_LABELS[config.type] ?? "未知",
      qualityLabel: ITEM_QUALITY_LABELS[config.quality] ?? "普通",
      effectDescription: getItemEffectDescription(config),
      description: config.description ?? "",
    };
  };

  const inventory = (world.fleet.inventory || []).map((item) => {
    const config = ITEMS.find((cfg) => cfg.id === item.itemId);
    return {
      uid: item.uid,
      itemId: item.itemId,
      type: config?.type ?? "material",
      name: config?.name ?? "未知物品",
      typeLabel: config ? ITEM_TYPE_LABELS[config.type] : "未知",
      qualityLabel: config ? ITEM_QUALITY_LABELS[config.quality] : "普通",
      quantity: item.quantity,
      durability: item.durability,
      maxDurability: item.maxDurability,
      upgradeLevel: item.upgradeLevel,
      equippedSlot: item.equippedSlot,
      effectDescription: config ? getItemEffectDescription(config) : "",
      description: config?.description ?? "",
    };
  });

  return {
    name: player.name,
    level: player.level,
    exp: player.exp,
    expToNext: player.expToNext,
    gold: world.fleet.gold,
    attributePoints: player.attributePoints,
    attributes: {
      str: player.str,
      dex: player.dex,
      int: player.int,
      fth: player.fth,
      arc: player.arc,
    },
    panelStats: {
      hp: panel.hp,
      atk: panel.atk,
      def: panel.def,
      mag: panel.mag,
      mdf: panel.mdf,
      spd: panel.spd,
      luk: panel.luk,
      equipLoad: panel.equipLoad,
    },
    equipment: {
      weapon: getEquippedView(player.equipment.weapon),
      armor: getEquippedView(player.equipment.armor),
      accessory1: getEquippedView(player.equipment.accessory1),
      accessory2: getEquippedView(player.equipment.accessory2),
    },
    inventory,
    blockedByVoyage: !!world.voyage,
  };
}

// ---- NPC 视图 ----

function npcTypeLabel(type: string): string {
  switch (type) {
    case "captain":
      return "船长";
    case "merchant":
      return "商人";
    case "questGiver":
      return "任务发布人";
    case "blacksmith":
      return "铁匠";
    default:
      return type;
  }
}

export function buildNpcDetailView(
  world: World,
  npcId: string,
): NpcDetailView | null {
  const npc = NPCS.find((n) => n.id === npcId);
  if (!npc) return null;
  const rel = world.npcRelations[npcId] ?? {
    affinity: 0,
    recruited: false,
    dialogPhase: 0,
    completedQuests: [] as readonly string[],
  };

  const availableQuests = getAvailableQuests(world)
    .filter((q) => q.issuerNpcId === npcId)
    .map(
      (q) =>
        ({
          id: q.id,
          name: q.name,
          description: q.description,
          type: q.type,
          progress: 0,
          target: 0,
          isActive: false,
          canAccept: true,
        }) satisfies QuestSummaryView,
    );
  const cond = npc.recruitCondition;
  const canRecruit =
    npc.recruitable &&
    !rel.recruited &&
    npc.portId === world.player.currentPortId &&
    rel.affinity >= (cond?.minAffinity ?? Infinity) &&
    world.fleet.gold >= (cond?.goldCost ?? Infinity) &&
    (cond?.requiredQuestIds ?? []).every((qId) =>
      rel.completedQuests.includes(qId),
    );

  return {
    id: npc.id,
    name: npc.name,
    type: npc.type,
    typeLabel: npcTypeLabel(npc.type),
    dialogText: npc.dialogText,
    dialogPhase: rel.dialogPhase,
    affinity: rel.affinity,
    maxAffinity: 100,
    recruited: rel.recruited,
    canRecruit,
    recruitable: npc.recruitable,
    recruitCondition: npc.recruitCondition
      ? {
          minAffinity: npc.recruitCondition.minAffinity,
          goldCost: npc.recruitCondition.goldCost,
          requiredQuestIds: npc.recruitCondition.requiredQuestIds ?? [],
        }
      : null,
    availableQuests,
    completedQuests: rel.completedQuests,
    giftPreferences: npc.giftPreferences.map((g) => ({
      itemId: g.itemId,
      affinityGain: g.affinityGain,
    })),
    inventory: world.fleet.inventory.map((item) => {
      const config = ITEMS.find((i) => i.id === item.itemId);
      return {
        uid: item.uid,
        itemId: item.itemId,
        type: config?.type ?? "material",
        name: config?.name ?? item.itemId,
        typeLabel: config ? ITEM_TYPE_LABELS[config.type] : "",
        qualityLabel: config ? ITEM_QUALITY_LABELS[config.quality] : "",
        quantity: item.quantity,
        durability: item.durability,
        maxDurability: item.maxDurability,
        upgradeLevel: item.upgradeLevel,
        equippedSlot: item.equippedSlot ?? undefined,
        effectDescription: config?.description ?? "",
        description: config?.description ?? "",
      };
    }),
  };
}

// ---- 任务视图 ----

export function buildQuestBoardView(world: World): QuestBoardView {
  const port = PORTS.find((p) => p.id === world.player.currentPortId);

  const availableQuests = getAvailableQuests(world).map(
    (q) =>
      ({
        id: q.id,
        name: q.name,
        description: q.description,
        type: q.type,
        progress: 0,
        target: 0,
        isActive: false,
        canAccept: true,
      }) satisfies QuestSummaryView,
  );

  const activeQuests = world.activeQuests.map((aq) => {
    const q = QUESTS.find((x) => x.id === aq.questId);
    return {
      id: aq.questId,
      name: q?.name ?? aq.questId,
      description: q?.description ?? "",
      type: q?.type ?? "delivery",
      progress: aq.progress,
      target: aq.target,
      isActive: true,
      canAccept: false,
    } satisfies QuestSummaryView;
  });

  return {
    portName: port?.name ?? "未知",
    availableQuests,
    activeQuests,
  };
}

export function buildQuestDetailView(
  world: World,
  questId: string,
): QuestDetailView | null {
  const aq = world.activeQuests.find((a) => a.questId === questId);
  const q = QUESTS.find((x) => x.id === questId);
  if (!q) return null;

  const issuerNpc = NPCS.find((n) => n.id === q.issuerNpcId);
  const canComplete = aq ? aq.progress >= aq.target : false;

  return {
    id: q.id,
    name: q.name,
    description: q.description,
    type: q.type,
    progress: aq?.progress ?? 0,
    target: aq?.target ?? 0,
    isActive: !!aq,
    canComplete,
    rewards: {
      gold: q.rewards.gold,
      exp: q.rewards.exp,
      items: q.rewards.itemIds ?? [],
    },
    issuerNpcName: issuerNpc?.name ?? "未知",
  };
}
