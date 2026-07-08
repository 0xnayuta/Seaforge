"use server";
import { updateCollection } from "../../game/domain/collection";
import {
  buyGoods as domainBuyGoods,
  sellGoods as domainSellGoods,
} from "../../game/domain/trade";
import { buildMarketView } from "../../game/view-builder/buildGameView";
import { getErrorMessage } from "../../lib/domain-errors";
import { withTransaction } from "../../lib/with-transaction";
import type { MarketView } from "../../types/game-view";

export async function buyGoods(formData: FormData): Promise<MarketView> {
  const goodsId = formData.get("goodsId") as string;
  const quantity = Number(formData.get("quantity"));

  if (!goodsId || !Number.isFinite(quantity) || quantity <= 0)
    throw new Error("无效的购买请求");
  try {
    return await withTransaction(
      (w) => updateCollection(domainBuyGoods(w, { goodsId, quantity }).world),
      buildMarketView,
    )();
  } catch (e) {
    throw new Error(getErrorMessage(e));
  }
}

export async function sellGoods(formData: FormData): Promise<void> {
  const goodsId = formData.get("goodsId") as string;
  const quantity = Number(formData.get("quantity"));

  if (!goodsId || !Number.isFinite(quantity) || quantity <= 0)
    throw new Error("无效的卖出请求");
  try {
    await withTransaction(
      (w) => updateCollection(domainSellGoods(w, { goodsId, quantity }).world),
      () => undefined,
    )();
  } catch (e) {
    throw new Error(getErrorMessage(e));
  }
}
