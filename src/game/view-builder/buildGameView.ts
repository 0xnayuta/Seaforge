// ============================================================
// View Builder — 各领域 View 的 barrel 导出
// ============================================================

export { buildCharacterView } from "./characterViews";
export {
  buildCargoView,
  buildHarborView,
  buildMarketView,
  buildNavigationView,
  buildShipyardView,
  buildTavernView,
} from "./harborViews";
export {
  buildAchievementsView,
  buildCollectionView,
  buildDungeonView,
  buildTitlesView,
} from "./metaViews";
export { buildNpcDetailView } from "./npcViews";
export { buildQuestBoardView, buildQuestDetailView } from "./questViews";
export { buildSaveSlotViews, type RawSaveRow } from "./saveSlotViews";
export {
  buildFleetShipSummaryView,
  buildFleetView,
  buildShipView,
} from "./shipViews";
export { buildVoyageView } from "./voyageViews";
