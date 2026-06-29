export const dynamic = "force-dynamic";

import { CargoHold } from "../../components/CargoHold";
import { loadCargoView } from "./actions";

export default async function CargoPage() {
  const view = await loadCargoView();
  return <CargoHold view={view} />;
}
