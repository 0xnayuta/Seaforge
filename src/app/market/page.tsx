export const dynamic = "force-dynamic";

import { MarketPanel } from "../../components/MarketPanel";
import { loadMarketView } from "./actions";

export default async function MarketPage() {
  const view = await loadMarketView();
  return <MarketPanel view={view} loadView={loadMarketView} />;
}
