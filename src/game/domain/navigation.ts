import { LEVEL_SPEED_PER_LEVEL, SPEED_BASE } from "../../data/formulas";
import { PORTS, type PortConfig } from "../../data/ports";
import { SHIPS } from "../../data/ships";
import { getActiveShip } from "./ship";
import type { World } from "./types";

// ============================================================
// 航行逻辑 — 纯函数
// ============================================================

function calcDistance(a: PortConfig, b: PortConfig): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.round(Math.sqrt(dx * dx + dy * dy));
}

/** 当前港口可前往的所有目的地 */
export function getReachablePorts(
  world: World,
): Array<{ port: PortConfig; distance: number; travelDays: number }> {
  const currentPort = PORTS.find((p) => p.id === world.player.currentPortId);
  if (!currentPort) return [];

  return PORTS.filter((p) => p.id !== currentPort.id)
    .map((port) => {
      const distance = calcDistance(currentPort, port);
      return {
        port,
        distance,
        travelDays: calcTravelDays(distance, world),
      };
    })
    .sort((a, b) => a.distance - b.distance);
}

/** 计算航行天数 */
export function calcTravelDays(distance: number, world: World): number {
  const activeShip = getActiveShip(world);
  const shipConfig = SHIPS.find((s) => s.id === activeShip.typeId);
  if (!shipConfig) return Infinity;
  const baseSpeed =
    shipConfig.speed * (1 + activeShip.equipment.sailLevel * 0.05);
  const levelBonus = 1 + world.player.level * LEVEL_SPEED_PER_LEVEL;
  return Math.ceil(distance / (baseSpeed * levelBonus * SPEED_BASE));
}
export function arriveAtPort(
  world: World,
  targetPortId: string,
  _travelDays: number,
): World {
  return {
    ...world,
    player: {
      ...world.player,
      currentPortId: targetPortId,
    },
    // 天数已在 advanceDay 中推进，抵达后最终状态由外层统一保存
  };
}

/**
 * 获取指定武装档次的有效舱容。
 */
export function getEffectiveCapacityForShip(
  shipTypeId: string,
  maxCapacity: number,
  armamentLevel: 0 | 1 | 2,
): number {
  const shipConfig = SHIPS.find((s) => s.id === shipTypeId);
  if (!shipConfig) return maxCapacity;
  const cargoRatio = shipConfig.armamentTiers[armamentLevel][0];
  return Math.floor(maxCapacity * cargoRatio);
}
