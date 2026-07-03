import { TitlesPanel } from "../../components/TitlesPanel";
import { loadTitlesView } from "../actions/titles";

export const dynamic = "force-dynamic";

export default async function TitlesPage() {
  const view = await loadTitlesView();
  return <TitlesPanel view={view} />;
}
