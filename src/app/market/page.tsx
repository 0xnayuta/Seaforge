"use client";

import { useActionState } from "react";
import { MarketPanel } from "../../components/MarketPanel";
import { loadMarketView } from "./actions";

export default function MarketPage() {
  const [view, loadAction, isLoadPending] = useActionState(
    loadMarketView,
    null,
  );

  if (!view) {
    return (
      <form
        action={loadAction}
        className="flex-1 flex items-center justify-center"
      >
        <button
          type="submit"
          disabled={isLoadPending}
          className="rounded-lg bg-gold-500 px-6 py-3 text-lg font-bold text-ocean-900 hover:bg-gold-400 transition-colors disabled:opacity-50"
        >
          {isLoadPending ? "加载中..." : "进入交易所"}
        </button>
      </form>
    );
  }

  return <MarketPanel view={view} onRefresh={loadAction} />;
}
