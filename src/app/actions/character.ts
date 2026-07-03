"use server";

import {
  allocateAttributePoint,
  equipCharacterItem,
  unequipCharacterItem,
} from "../../game/domain/player";
import type { World } from "../../game/domain/types";
import { buildCharacterView } from "../../game/view-builder/buildGameView";
import { getErrorMessage } from "../../lib/domain-errors";
import { prisma } from "../../lib/prisma";
import { loadWorld } from "../../lib/repository";
import { withTransaction } from "../../lib/with-transaction";
import type { CharacterView } from "../../types/game-view";

export async function loadCharacterView(): Promise<CharacterView> {
  const world = await loadWorld(prisma);
  return buildCharacterView(world);
}
/** 属性/装备事务管道：使用 withTransaction HOF */
async function characterTx(
  domainFn: (world: World) => World,
): Promise<CharacterView> {
  try {
    return await withTransaction(domainFn, buildCharacterView)();
  } catch (e) {
    throw new Error(getErrorMessage(e));
  }
}

export async function allocateAttributePointAction(
  formData: FormData,
): Promise<CharacterView> {
  const attribute = formData.get("attribute") as
    | "str"
    | "dex"
    | "int"
    | "fth"
    | "arc";
  if (!attribute || !["str", "dex", "int", "fth", "arc"].includes(attribute)) {
    throw new Error("无效的属性类型");
  }
  return characterTx((w) => allocateAttributePoint(w, attribute));
}

export async function equipCharacterItemAction(
  formData: FormData,
): Promise<CharacterView> {
  const itemUid = formData.get("itemUid") as string;
  const slot = formData.get("slot") as
    | "weapon"
    | "armor"
    | "accessory1"
    | "accessory2";
  if (!itemUid) throw new Error("未指定装备实例");
  if (
    !slot ||
    !["weapon", "armor", "accessory1", "accessory2"].includes(slot)
  ) {
    throw new Error("无效的装备位置");
  }
  return characterTx((w) => equipCharacterItem(w, itemUid, slot));
}

export async function unequipCharacterItemAction(
  formData: FormData,
): Promise<CharacterView> {
  const slot = formData.get("slot") as
    | "weapon"
    | "armor"
    | "accessory1"
    | "accessory2";
  if (
    !slot ||
    !["weapon", "armor", "accessory1", "accessory2"].includes(slot)
  ) {
    throw new Error("无效的装备位置");
  }
  return characterTx((w) => unequipCharacterItem(w, slot));
}
