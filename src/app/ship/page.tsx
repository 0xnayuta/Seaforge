export const dynamic = "force-dynamic";

import { CraftingPanel } from "../../components/CraftingPanel";
import { ShipyardPanel } from "../../components/ShipyardPanel";
import { loadCraftingView } from "../actions/crafting";
import {
  buyShipAction,
  loadShipyardView,
  repairShipAction,
  sellShipAction,
  upgradeComponentAction,
} from "./actions";

interface ShipPageProps {
  readonly searchParams: Promise<{ shipId?: string; tab?: string }>;
}

export default async function ShipPage({ searchParams }: ShipPageProps) {
  const params = await searchParams;
  const tab = params?.tab ?? "shipyard";

  return (
    <div className="flex-1 p-4 max-w-2xl mx-auto w-full space-y-4">
      {/* Tab 导航 */}
      <div className="flex gap-2">
        <a
          href="/ship?tab=shipyard"
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
            tab === "shipyard"
              ? "bg-gold-500 text-ocean-900"
              : "bg-ocean-700/60 text-parchment-dark hover:bg-ocean-700"
          }`}
        >
          造船厂
        </a>
        <a
          href="/ship?tab=blacksmith"
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
            tab === "blacksmith"
              ? "bg-gold-500 text-ocean-900"
              : "bg-ocean-700/60 text-parchment-dark hover:bg-ocean-700"
          }`}
        >
          铁匠铺
        </a>
      </div>

      {tab === "blacksmith" ? (
        <CraftingPanel view={await loadCraftingView()} />
      ) : (
        <ShipyardPanel
          view={await loadShipyardView(params?.shipId)}
          onBuyShip={buyShipAction}
          onSellShip={sellShipAction}
          onUpgrade={upgradeComponentAction}
          onRepair={repairShipAction}
        />
      )}
    </div>
  );
}
