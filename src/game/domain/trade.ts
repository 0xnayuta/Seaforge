import { LEVEL_EXP_RATIO } from "../../data/formulas";
import { GOODS } from "../../data/goods";
import { SHIPS } from "../../data/ships";
import { getShipCargoCapacity } from "./equipment";
import { applyTradeImpact, getBuyPrice, getSellPrice } from "./market";
import { gainExp } from "./player";
import { getActiveShip } from "./ship";
import type { CargoItem, World } from "./types";
import { DomainError } from "./types";

// ============================================================
// 买卖逻辑 — 纯函数
// ============================================================

// ---- 容量计算 ----

export function getUsedCapacity(world: World): number {
  const ship = getActiveShip(world);
  return ship.cargo.reduce((total, item) => {
    const good = GOODS.find((g) => g.id === item.goodId);
    return total + (good?.volume ?? 0) * item.quantity;
  }, 0);
}

export function getMaxCapacity(world: World): number {
  const ship = getActiveShip(world);
  const shipConfig = SHIPS.find((s) => s.id === ship.typeId);
  if (!shipConfig) return 0;
  return getShipCargoCapacity(ship, shipConfig);
}

// ---- 买入 ----

export interface BuyInput {
  readonly goodId: string;
  readonly quantity: number;
}

export interface BuyResult {
  readonly world: World;
  readonly totalCost: number;
}

function updateShipCargo(
  world: World,
  shipId: string,
  cargo: readonly CargoItem[],
): World {
  return {
    ...world,
    fleet: {
      ...world.fleet,
      ships: world.fleet.ships.map((s) =>
        s.id === shipId ? { ...s, cargo } : s,
      ),
    },
  };
}

export function executeBuy(world: World, input: BuyInput): BuyResult {
  const { goodId, quantity } = input;
  if (quantity <= 0) throw new DomainError("INVALID_QUANTITY");

  const price = getBuyPrice(goodId, world.player.currentPortId, world);
  const totalCost = price * quantity;

  if (world.fleet.gold < totalCost) throw new DomainError("INSUFFICIENT_GOLD");

  const good = GOODS.find((g) => g.id === goodId);
  if (!good) throw new DomainError("GOOD_NOT_FOUND");

  const usedCapacity = getUsedCapacity(world);
  const maxCapacity = getMaxCapacity(world);
  const neededVolume = good.volume * quantity;
  if (usedCapacity + neededVolume > maxCapacity)
    throw new DomainError("INSUFFICIENT_CARGO");

  const activeShip = getActiveShip(world);
  const existingIndex = activeShip.cargo.findIndex((c) => c.goodId === goodId);

  let newCargo: CargoItem[];
  if (existingIndex >= 0) {
    newCargo = activeShip.cargo.map((c, i) =>
      i === existingIndex
        ? {
            ...c,
            quantity: c.quantity + quantity,
            buyPrice: Math.round(
              (c.buyPrice * c.quantity + price * quantity) /
                (c.quantity + quantity),
            ),
          }
        : c,
    );
  } else {
    newCargo = [...activeShip.cargo, { goodId, quantity, buyPrice: price }];
  }

  const withCargo = updateShipCargo(world, activeShip.id, newCargo);
  const withGold = {
    ...withCargo,
    fleet: { ...withCargo.fleet, gold: world.fleet.gold - totalCost },
  };

  const worldAfterTrade = applyTradeImpact(
    withGold,
    world.player.currentPortId,
    goodId,
    quantity,
    true,
  );

  return { world: worldAfterTrade, totalCost };
}

// ---- 卖出 ----

export interface SellInput {
  readonly goodId: string;
  readonly quantity: number;
}

export interface SellResult {
  readonly world: World;
  readonly totalRevenue: number;
  readonly profit: number;
}

export function executeSell(world: World, input: SellInput): SellResult {
  const { goodId, quantity } = input;
  if (quantity <= 0) throw new DomainError("INVALID_QUANTITY");

  const activeShip = getActiveShip(world);
  const cargo = activeShip.cargo.find((c) => c.goodId === goodId);
  if (!cargo || cargo.quantity < quantity)
    throw new DomainError("CARGO_NOT_FOUND");

  const price = getSellPrice(goodId, world.player.currentPortId, world);
  const totalRevenue = price * quantity;
  const profit = (price - cargo.buyPrice) * quantity;

  const remaining = cargo.quantity - quantity;
  const newCargo =
    remaining > 0
      ? activeShip.cargo.map((c) =>
          c.goodId === goodId ? { ...c, quantity: remaining } : c,
        )
      : activeShip.cargo.filter((c) => c.goodId !== goodId);

  const withCargo = updateShipCargo(world, activeShip.id, newCargo);
  const withGold = {
    ...withCargo,
    fleet: { ...withCargo.fleet, gold: world.fleet.gold + totalRevenue },
  };

  const worldAfterTrade = applyTradeImpact(
    withGold,
    world.player.currentPortId,
    goodId,
    quantity,
    false,
  );
  const profitAmount = Math.max(0, profit);
  const worldAfterExp = gainExp(
    worldAfterTrade,
    Math.floor(profitAmount * LEVEL_EXP_RATIO),
  );

  // 称号统计：累计贸易额和单次最佳利润
  const worldWithTracking = {
    ...worldAfterExp,
    player: {
      ...worldAfterExp.player,
      totalSalesRevenue: worldAfterExp.player.totalSalesRevenue + totalRevenue,
      bestSingleProfit: Math.max(
        worldAfterExp.player.bestSingleProfit,
        profitAmount,
      ),
    },
  };

  return { world: worldWithTracking, totalRevenue, profit };
}
