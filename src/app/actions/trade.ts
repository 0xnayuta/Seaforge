"use server";
import {
  buyGoods as domainBuyGoods,
  sellGoods as domainSellGoods,
} from "../../game/domain/trade";
import {
  buildCargoView,
  buildMarketView,
} from "../../game/view-builder/buildGameView";
import { getErrorMessage } from "../../lib/domain-errors";
import { withTransaction } from "../../lib/with-transaction";
import type { CargoView, MarketView } from "../../types/game-view";

export async function buyGoods(formData: FormData): Promise<MarketView> {
  const goodId = formData.get("goodId") as string;
  const quantity = Number(formData.get("quantity"));

  if (!goodId || !Number.isFinite(quantity) || quantity <= 0)
    throw new Error("无效的购买请求");

  try {
    return await withTransaction(
      (w) => domainBuyGoods(w, { goodId, quantity }).world,
      buildMarketView,
    )();
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
    return await withTransaction(
      (w) => domainSellGoods(w, { goodId, quantity }).world,
      buildCargoView,
    )();
  } catch (e) {
    throw new Error(getErrorMessage(e));
  }
}
