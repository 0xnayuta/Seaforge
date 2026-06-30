import {
  buildHarborView,
  buildSaveSlotViews,
} from "../game/view-builder/buildGameView";
import { prisma } from "../lib/prisma";
import { listSaves, loadWorld } from "../lib/repository";
import { HarborDashboard } from "./HarborDashboard";
import { NewGameForm } from "./NewGameForm";
import { SaveSlotList } from "./SaveSlotList";

export const dynamic = "force-dynamic";

export default async function HarborPage() {
  const autoSave = await prisma.save.findUnique({
    where: { slot: 0 },
  });

  if (!autoSave) {
    const saves = await listSaves();
    const slots = buildSaveSlotViews(saves);
    // 有手动存档时显示槽位选择器；完全无存档时显示新游戏按钮
    if (slots.some((s) => s.exists)) {
      return <SaveSlotList slots={slots} mode="startup" />;
    }
    return <NewGameForm />;
  }

  const world = await loadWorld(prisma);
  const view = buildHarborView(world);
  return <HarborDashboard view={view} />;
}
