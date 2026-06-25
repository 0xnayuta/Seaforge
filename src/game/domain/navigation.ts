import type { World } from "./types"
import { PORTS, ROUTES, type PortConfig } from "../../data/ports"
import { SHIPS } from "../../data/ships"
import { SPEED_BASE } from "../../data/formulas"

// ============================================================
// 航行逻辑 — 纯函数
// ============================================================

/** 当前港口可前往的所有目的地（港口气氛，非游戏事实） */
export function getReachablePorts(
  world: World,
): Array<{ port: PortConfig; distance: number; travelDays: number }> {
  const currentPortId = world.player.currentPortId

  return ROUTES.filter((r) => r.from === currentPortId).map((route) => {
    const port = PORTS.find((p) => p.id === route.to)
    if (!port) throw new Error(`目标港口 ${route.to} 未找到`)
    return {
      port,
      distance: route.distance,
      travelDays: calcTravelDays(route.distance, world),
    }
  })
}

/** 计算航行天数 */
export function calcTravelDays(distance: number, world: World): number {
  const ship = SHIPS.find((s) => s.id === world.ship.typeId)
  if (!ship) return Infinity
  return Math.ceil(distance / (ship.speed * SPEED_BASE))
}

/** 执行到达：更新当前港口 */
export function arriveAtPort(
  world: World,
  targetPortId: string,
  travelDays: number,
): World {
  return {
    ...world,
    player: {
      ...world.player,
      currentPortId: targetPortId,
      day: world.player.day + travelDays,
    },
    // 抵达后最终状态由外层统一保存
  }
}
