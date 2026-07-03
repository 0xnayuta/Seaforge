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
  const goodsId = formData.get("goodsId") as string;
  const quantity = Number(formData.get("quantity"));

  if (!goodsId || !Number.isFinite(quantity) || quantity <= 0)
    throw new Error("无效的购买请求");

  try {
    return await withTransaction(
      (w) => domainBuyGoods(w, { goodsId, quantity }).world,
      buildMarketView,
    )();
  } catch (e) {
    throw new Error(getErrorMessage(e));
  }
}

export async function sellGoods(formData: FormData): Promise<CargoView> {
  const goodsId = formData.get("goodsId") as string;
  const quantity = Number(formData.get("quantity"));

  if (!goodsId || !Number.isFinite(quantity) || quantity <= 0)
    throw new Error("无效的卖出请求");

  try {
    return await withTransaction(
      (w) => domainSellGoods(w, { goodsId, quantity }).world,
      buildCargoView,
    )();
  } catch (e) {
    throw new Error(getErrorMessage(e));
  }
}
