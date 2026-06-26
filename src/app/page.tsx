import { buildHarborView } from "../game/view-builder/buildGameView";
import { prisma } from "../lib/prisma";
import { loadWorld } from "../lib/repository";
import { HarborDashboard } from "./HarborDashboard";
import { NewGameForm } from "./NewGameForm";

export const dynamic = "force-dynamic";

export default async function HarborPage() {
  const save = await prisma.save.findUnique({
    where: { slot: 0 },
  });

  if (!save) return <NewGameForm />;

  const world = await loadWorld(prisma);
  const view = buildHarborView(world);
  return <HarborDashboard view={view} />;
}
