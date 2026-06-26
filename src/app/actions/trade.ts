"use server";
import { executeBuy, executeSell } from "../../game/domain/trade";
import {
  buildCargoView,
  buildMarketView,
} from "../../game/view-builder/buildGameView";
import { getErrorMessage } from "../../lib/domain-errors";
import { prisma } from "../../lib/prisma";
import { loadWorld, saveWorld } from "../../lib/repository";
import type { CargoView, MarketView } from "../../types/game-view";
import type { PrismaTransactionClient } from "../../types/prisma";

export async function buyGoods(formData: FormData): Promise<MarketView> {
  const goodId = formData.get("goodId") as string;
  const quantity = Number(formData.get("quantity"));

  if (!goodId || !Number.isFinite(quantity) || quantity <= 0)
    throw new Error("无效的购买请求");

  try {
    return await prisma.$transaction(async (tx: PrismaTransactionClient) => {
      const world = await loadWorld(tx);
      const result = executeBuy(world, { goodId, quantity });
      await saveWorld(tx, result.world);
      return buildMarketView(result.world);
    });
  } catch (e) {
    throw new Error(getErrorMessage(e));
  }
}
export async function sellGoods(formData: FormData): Promise<CargoView> {
  const goodId = formData.get("goodId") as string;
  const quantity = Number(formData.get("quantity"));

  if (!goodId || !Number.isFinite(quantity) || quantity <= 0)
    throw new Error("无效的卖出请求");

  try {
    return await prisma.$transaction(async (tx: PrismaTransactionClient) => {
      const world = await loadWorld(tx);
      const result = executeSell(world, { goodId, quantity });
      await saveWorld(tx, result.world);
      return buildCargoView(result.world);
    });
  } catch (e) {
    throw new Error(getErrorMessage(e));
  }
}
