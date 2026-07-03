"use server";

import {
  buyEquipment,
  equipItem,
  sellEquipment,
  unequipItem,
} from "../../game/domain/equipment";
import type { World } from "../../game/domain/types";
import { buildShipyardView } from "../../game/view-builder/buildGameView";
import { getErrorMessage } from "../../lib/domain-errors";
import { withTransaction } from "../../lib/with-transaction";
import type { ShipyardView } from "../../types/game-view";

/** 装备操作事务管道：读档 → domain → 保存 → 返回 ShipyardView */
async function shipyardTx(
  domainFn: (world: World) => World,
  shipId: string,
): Promise<ShipyardView> {
  try {
    return await withTransaction(domainFn, (w) =>
      buildShipyardView(w, shipId),
    )();
  } catch (e) {
    throw new Error(getErrorMessage(e));
  }
}

/** 解析买卖装备的表单参数 */
function parseBuySellParams(formData: FormData): {
  equipmentId: string;
  shipId: string;
} {
  const equipmentId = formData.get("equipmentId") as string;
  const shipId = formData.get("shipId") as string;
  if (!equipmentId) throw new Error("未选择装备");
  if (!shipId) throw new Error("未指定船只");
  return { equipmentId, shipId };
}

/** 解析装卸装备的表单参数 */
function parseEquipParams(formData: FormData): {
  shipId: string;
  equipmentId: string;
} {
  const shipId = formData.get("shipId") as string;
  const equipmentId = formData.get("equipmentId") as string;
  if (!shipId || !equipmentId) throw new Error("未指定船只或装备");
  return { shipId, equipmentId };
}

export async function buyEquipmentAction(
  formData: FormData,
): Promise<ShipyardView> {
  const { equipmentId, shipId } = parseBuySellParams(formData);
  return shipyardTx((w) => buyEquipment(w, equipmentId), shipId);
}

export async function sellEquipmentAction(
  formData: FormData,
): Promise<ShipyardView> {
  const { equipmentId, shipId } = parseBuySellParams(formData);
  return shipyardTx((w) => sellEquipment(w, equipmentId), shipId);
}

export async function equipItemAction(
  formData: FormData,
): Promise<ShipyardView> {
  const { shipId, equipmentId } = parseEquipParams(formData);
  return shipyardTx((w) => equipItem(w, shipId, equipmentId), shipId);
}

export async function unequipItemAction(
  formData: FormData,
): Promise<ShipyardView> {
  const { shipId, equipmentId } = parseEquipParams(formData);
  return shipyardTx((w) => unequipItem(w, shipId, equipmentId), shipId);
}
