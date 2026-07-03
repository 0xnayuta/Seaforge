"use server";

import { updateCollection } from "../../game/domain/collection";
import type { ComponentType } from "../../game/domain/ship";
import {
  buyShip,
  repairShip,
  sellShip,
  upgradeComponent,
} from "../../game/domain/ship";
import { buildShipyardView } from "../../game/view-builder/buildGameView";
import { getErrorMessage } from "../../lib/domain-errors";
import { prisma } from "../../lib/prisma";
import { loadWorld } from "../../lib/repository";
import { withTransaction } from "../../lib/with-transaction";
import type { ShipyardView } from "../../types/game-view";

export async function loadShipyardView(
  selectedShipId?: string,
): Promise<ShipyardView> {
  const world = await loadWorld(prisma);
  return buildShipyardView(world, selectedShipId);
}

export async function buyShipAction(formData: FormData): Promise<ShipyardView> {
  const typeId = formData.get("typeId") as string;
  if (!typeId) throw new Error("未选择船只类型");
  try {
    return await withTransaction(
      (w) => updateCollection(buyShip(w, typeId)),
      buildShipyardView,
    )();
  } catch (e) {
    throw new Error(getErrorMessage(e));
  }
}

export async function sellShipAction(
  formData: FormData,
): Promise<ShipyardView> {
  const shipId = formData.get("shipId") as string;
  try {
    return await withTransaction(
      (w) => updateCollection(sellShip(w, shipId)),
      buildShipyardView,
    )();
  } catch (e) {
    throw new Error(getErrorMessage(e));
  }
}

export async function upgradeComponentAction(
  _prev: ShipyardView | null,
  formData: FormData,
): Promise<ShipyardView> {
  const component = formData.get("component") as ComponentType;
  const shipId = formData.get("shipId") as string;
  if (!shipId) throw new Error("未指定船只");
  try {
    return await withTransaction(
      (w) => updateCollection(upgradeComponent(w, shipId, component)),
      (w) => buildShipyardView(w, shipId),
    )();
  } catch (e) {
    throw new Error(getErrorMessage(e));
  }
}

export async function repairShipAction(
  _prev: ShipyardView | null,
  formData: FormData,
): Promise<ShipyardView> {
  const shipId = formData.get("shipId") as string;
  if (!shipId) throw new Error("未指定船只");
  try {
    return await withTransaction(
      (w) => updateCollection(repairShip(w, shipId)),
      (w) => buildShipyardView(w, shipId),
    )();
  } catch (e) {
    throw new Error(getErrorMessage(e));
  }
}
