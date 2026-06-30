"use server";

import { redirect } from "next/navigation";
import { prisma } from "../../lib/prisma";
import {
  AUTO_SAVE_SLOT,
  deleteSave,
  loadWorldFromSlot,
  saveWorldToSlot,
} from "../../lib/repository";
import type { PrismaTransactionClient } from "../../types/prisma";

/**
 * 手动存档：将当前自动存档（槽位 0）的游戏状态保存到指定手动槽位（1-3）。
 * 覆盖该槽位原有数据。
 */
export async function manualSave(formData: FormData): Promise<void> {
  const slot = Number(formData.get("slot"));
  if (!Number.isInteger(slot) || slot < 1 || slot > 3) {
    throw new Error("无效的存档槽位");
  }

  await prisma.$transaction(async (tx: PrismaTransactionClient) => {
    const world = await loadWorldFromSlot(tx, AUTO_SAVE_SLOT);
    await saveWorldToSlot(tx, world, slot);
  });
}

/**
 * 读取存档：将指定槽位的游戏状态加载到自动存档（槽位 0），使其成为当前活跃游戏。
 * 加载后跳转到港口页。
 */
export async function loadSaveSlot(formData: FormData): Promise<void> {
  const slot = Number(formData.get("slot"));
  if (!Number.isInteger(slot) || slot < 0 || slot > 3) {
    throw new Error("无效的存档槽位");
  }

  await prisma.$transaction(async (tx: PrismaTransactionClient) => {
    const world = await loadWorldFromSlot(tx, slot);
    await saveWorldToSlot(tx, world, AUTO_SAVE_SLOT);
  });

  redirect("/");
}

/**
 * 删除存档：删除指定槽位的存档数据。
 * 删除自动存档（槽位 0）将结束当前游戏。
 */
export async function deleteSaveSlot(formData: FormData): Promise<void> {
  const slot = Number(formData.get("slot"));
  if (!Number.isInteger(slot) || slot < 0 || slot > 3) {
    throw new Error("无效的存档槽位");
  }

  await deleteSave(slot);
}
