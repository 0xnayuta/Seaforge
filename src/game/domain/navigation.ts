import { LEVEL_SPEED_PER_LEVEL, SPEED_BASE } from "../../data/formulas";
import { PORTS, type PortConfig } from "../../data/ports";
import { SHIPS } from "../../data/ships";
import { getShipSpeed } from "./equipment";
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
        travelDays: calcFleetTravelDays(distance, world, [
          getActiveShip(world).id,
        ]),
      };
    })
    .sort((a, b) => a.distance - b.distance);
}

/** 计算多船舰队航行天数（以最慢船为准） */
export function calcFleetTravelDays(
  distance: number,
  world: World,
  shipIds: string[],
): number {
  const speeds = shipIds.map((id) => {
    const ship = world.fleet.ships.find((s) => s.id === id);
    if (!ship) return null;
    const shipConfig = SHIPS.find((s) => s.id === ship.typeId);
    if (!shipConfig) return null;
    return getShipSpeed(ship, shipConfig);
  });
  const validSpeeds = speeds.filter((s): s is number => s !== null);
  if (validSpeeds.length !== shipIds.length) return Infinity;
  const fleetSpeed = Math.min(...validSpeeds);
  const levelBonus = 1 + world.player.level * LEVEL_SPEED_PER_LEVEL;
  return Math.ceil(distance / (fleetSpeed * levelBonus * SPEED_BASE));
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
