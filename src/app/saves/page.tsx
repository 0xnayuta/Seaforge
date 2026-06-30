import { buildSaveSlotViews } from "../../game/view-builder/buildGameView";
import { listSaves } from "../../lib/repository";
import { SaveSlotList } from "../SaveSlotList";

export const dynamic = "force-dynamic";

export default async function SavesPage() {
  const saves = await listSaves();
  const slots = buildSaveSlotViews(saves);
  return <SaveSlotList slots={slots} mode="manage" />;
}
