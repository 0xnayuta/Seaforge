"use server";
import { redirect } from "next/navigation";
import { PORTS } from "../../data/ports";
import { calcMinCrewForFleet } from "../../game/domain/crew";
import { calcFleetTravelDays } from "../../game/domain/navigation";
import { getActiveShip } from "../../game/domain/ship";
import { startVoyage } from "../../game/domain/voyage";
import { getErrorMessage } from "../../lib/domain-errors";
import { withTransaction } from "../../lib/with-transaction";

export async function startTravel(formData: FormData): Promise<void> {
  const targetPortId = formData.get("portId") as string;
  if (!targetPortId) throw new Error("未选择目的港");

  const shipIdsRaw = formData.get("shipIds") as string | null;

  try {
    await withTransaction(
      (w) => {
        if (w.voyage) throw new Error("航行中，无法再次出航");

        // 解析舰队船只选择
        const shipIds: string[] = shipIdsRaw
          ? (JSON.parse(shipIdsRaw) as string[])
          : [getActiveShip(w).id];

        if (shipIds.length === 0) throw new Error("请至少选择一艘船出航");

        // 验证所有选中的船只都存在且耐久度 > 0
        for (const id of shipIds) {
          const ship = w.fleet.ships.find((s) => s.id === id);
          if (!ship) throw new Error("无效船只");
          if (ship.durability <= 0) throw new Error("船体严重损坏，无法出航");
        }

        // 验证船员是否足够
        const totalCrewRequired = calcMinCrewForFleet(w, shipIds);
        if (w.fleet.crew < totalCrewRequired) {
          throw new Error("船员不足，无法出海");
        }
        // 查找目标港口，计算航线距离
        const fromPort = PORTS.find((p) => p.id === w.player.currentPortId);
        const toPort = PORTS.find((p) => p.id === targetPortId);
        if (!fromPort || !toPort) throw new Error("无法到达该港口");
        const dx = fromPort.x - toPort.x;
        const dy = fromPort.y - toPort.y;
        const distance = Math.round(Math.sqrt(dx * dx + dy * dy));

        // 计算航行天数（以舰队中最慢船为准）
        const travelDays = calcFleetTravelDays(distance, w, shipIds);

        const voyage = startVoyage(w, {
          fromPortId: w.player.currentPortId,
          toPortId: targetPortId,
          travelDays,
          fleetShipIds: shipIds,
        });

        return { ...w, voyage };
      },
      () => undefined,
    )();
  } catch (e) {
    throw new Error(getErrorMessage(e));
  }

  redirect("/voyage");
}
