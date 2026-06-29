export const dynamic = "force-dynamic";

import { NavigationPanel } from "../../components/NavigationPanel";
import { loadNavigationView } from "./actions";

export default async function NavigationPage() {
  const view = await loadNavigationView();
  return <NavigationPanel view={view} />;
}
