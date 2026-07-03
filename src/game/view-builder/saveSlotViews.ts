// ============================================================
// Save Slot Views
// ============================================================

import { PORTS } from "../../data/ports";
import type { SaveSlotView } from "../../types/game-view";

const SAVE_SLOT_NAMES = ["自动存档", "存档位 1", "存档位 2", "存档位 3"];

/** 存档行原始数据（从 Repository 传入，不依赖 Prisma 类型） */
export interface RawSaveRow {
  slot: number;
  data: string;
  updatedAt: Date;
}

/**
 * 将原始存档行列表转换为存档槽位预览视图。
 * 保证 4 个槽位（0-3）都有对应条目，空槽位 exists=false。
 * 兼容旧存档格式（ship → fleet 迁移前）。
 */
export function buildSaveSlotViews(saves: RawSaveRow[]): SaveSlotView[] {
  return [0, 1, 2, 3].map((slot) => {
    const save = saves.find((s) => s.slot === slot);
    if (!save) {
      return {
        slot,
        slotName: SAVE_SLOT_NAMES[slot],
        exists: false,
        playerLevel: 0,
        shipCount: 0,
        gold: 0,
        currentPortName: "",
        day: 0,
        updatedAt: "",
      };
    }
    try {
      const parsed = JSON.parse(save.data) as Record<string, unknown>;
      const player = (parsed.player ?? {}) as Record<string, unknown>;
      const fleet = (parsed.fleet ?? {}) as Record<string, unknown>;
      const portId = player.currentPortId as string | undefined;
      const port = portId ? PORTS.find((p) => p.id === portId) : undefined;
      const ships = fleet.ships as unknown[] | undefined;
      return {
        slot,
        slotName: SAVE_SLOT_NAMES[slot],
        exists: true,
        playerLevel: (player.level as number) ?? 1,
        shipCount: ships?.length ?? (parsed.ship ? 1 : 0),
        gold: (fleet.gold as number) ?? (player.gold as number) ?? 0,
        currentPortName: port?.name ?? "未知",
        day: (player.day as number) ?? 1,
        updatedAt: save.updatedAt.toISOString(),
      };
    } catch {
      return {
        slot,
        slotName: SAVE_SLOT_NAMES[slot],
        exists: false,
        playerLevel: 0,
        shipCount: 0,
        gold: 0,
        currentPortName: "",
        day: 0,
        updatedAt: "",
      };
    }
  });
}
