import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { createDefaultWorld } from "../../game/domain/player";
import type { World } from "../../game/domain/types";
import { prisma } from "../prisma";
import {
  AUTO_SAVE_SLOT,
  deleteSave,
  listSaves,
  loadWorldFromSlot,
  saveWorldToSlot,
} from "../repository";

/**
 * 存档管理集成测试 — 使用 dev.db，测试前后保存/恢复自动存档，清理手动槽位。
 * 仅覆盖 slot 级别读写删互不干扰，不测试业务逻辑。
 */
describe("repository multi-slot operations", () => {
  let originalAutoSaveData: string | null = null;

  beforeEach(async () => {
    // 备份自动存档
    const auto = await prisma.save.findUnique({
      where: { slot: AUTO_SAVE_SLOT },
    });
    originalAutoSaveData = auto?.data ?? null;

    // 清理手动槽位
    for (const slot of [1, 2, 3]) {
      await deleteSave(slot);
    }
  });

  afterEach(async () => {
    // 恢复自动存档
    if (originalAutoSaveData !== null) {
      await prisma.save.upsert({
        where: { slot: AUTO_SAVE_SLOT },
        update: { data: originalAutoSaveData },
        create: { slot: AUTO_SAVE_SLOT, data: originalAutoSaveData },
      });
    }

    // 清理手动槽位
    for (const slot of [1, 2, 3]) {
      await deleteSave(slot);
    }
  });

  it("多 slot 读写互不干扰", async () => {
    const world1 = createDefaultWorld();
    const world2: World = {
      ...world1,
      player: { ...world1.player, day: 99 },
    };

    await prisma.$transaction(async (tx) => {
      await saveWorldToSlot(tx, world1, 1);
      await saveWorldToSlot(tx, world2, 2);
    });

    const loaded1 = await prisma.$transaction((tx) => loadWorldFromSlot(tx, 1));
    const loaded2 = await prisma.$transaction((tx) => loadWorldFromSlot(tx, 2));

    expect(loaded1.player.day).toBe(1);
    expect(loaded2.player.day).toBe(99);
  });

  it("手动存档与自动存档共存", async () => {
    const autoWorld = createDefaultWorld();
    const manualWorld: World = {
      ...autoWorld,
      player: { ...autoWorld.player, day: 50 },
    };

    await prisma.$transaction(async (tx) => {
      await saveWorldToSlot(tx, autoWorld, AUTO_SAVE_SLOT);
      await saveWorldToSlot(tx, manualWorld, 1);
    });

    const auto = await prisma.$transaction((tx) =>
      loadWorldFromSlot(tx, AUTO_SAVE_SLOT),
    );
    const manual = await prisma.$transaction((tx) => loadWorldFromSlot(tx, 1));

    expect(auto.player.day).toBe(1);
    expect(manual.player.day).toBe(50);
  });

  it("删除存档后对应 slot 可用且读取抛异常", async () => {
    const world = createDefaultWorld();
    await prisma.$transaction(async (tx) => {
      await saveWorldToSlot(tx, world, 1);
    });

    // 确认存在
    const savesBefore = await listSaves();
    expect(savesBefore.some((s) => s.slot === 1)).toBe(true);

    // 删除
    await deleteSave(1);

    // 确认已删除
    const savesAfter = await listSaves();
    expect(savesAfter.some((s) => s.slot === 1)).toBe(false);

    // 读取已删除槽位应抛异常
    await expect(
      prisma.$transaction((tx) => loadWorldFromSlot(tx, 1)),
    ).rejects.toThrow("该存档槽位为空");

    // 删除后可重新存入
    await prisma.$transaction(async (tx) => {
      await saveWorldToSlot(tx, world, 1);
    });
    const savesFinal = await listSaves();
    expect(savesFinal.some((s) => s.slot === 1)).toBe(true);
  });
});
