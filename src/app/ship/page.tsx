"use client";

import { useActionState } from "react";
import { ShipyardPanel } from "../../components/ShipyardPanel";
import { loadShipView, repairShipAction, upgradeShipAction } from "./actions";

export default function ShipPage() {
  const [view, loadAction, isLoading] = useActionState(loadShipView, null);
  const [afterUpgrade, doUpgrade] = useActionState(upgradeShipAction, null);
  const [afterRepair, doRepair] = useActionState(repairShipAction, null);

  if (!view) {
    return (
      <form
        action={loadAction}
        className="flex-1 flex items-center justify-center"
      >
        <button
          type="submit"
          disabled={isLoading}
          className="rounded-lg bg-gold-500 px-6 py-3 text-lg font-bold text-ocean-900 hover:bg-gold-400 transition-colors disabled:opacity-50"
        >
          {isLoading ? "加载中..." : "进入造船厂"}
        </button>
      </form>
    );
  }

  return (
    <ShipyardPanel
      view={view}
      onUpgrade={doUpgrade}
      onRepair={doRepair}
      afterUpgrade={afterUpgrade}
      afterRepair={afterRepair}
    />
  );
}
