export const dynamic = "force-dynamic";

import { ShipyardPanel } from "../../components/ShipyardPanel";
import {
  loadShipView,
  repairShipAction,
  upgradeComponentAction,
} from "./actions";

export default async function ShipPage() {
  const view = await loadShipView();
  return (
    <ShipyardPanel
      view={view}
      onUpgrade={upgradeComponentAction}
      onRepair={repairShipAction}
    />
  );
}
