"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { SaveSlotView } from "../types/game-view";
import { createNewGame } from "./actions/new-game";
import { deleteSaveSlot, loadSaveSlot, manualSave } from "./actions/save";

interface SaveSlotListProps {
  slots: readonly SaveSlotView[];
  mode: "startup" | "manage";
}

export function SaveSlotList({ slots, mode }: SaveSlotListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function refresh() {
    startTransition(() => {
      router.refresh();
    });
  }

  async function handleSave(slot: number, slotName: string, exists: boolean) {
    if (
      exists &&
      !window.confirm(`确定覆盖「${slotName}」吗？此操作不可恢复。`)
    )
      return;
    const fd = new FormData();
    fd.set("slot", String(slot));
    await manualSave(fd);
    refresh();
  }

  async function handleDelete(slot: number, slotName: string) {
    if (!window.confirm(`确定删除「${slotName}」吗？此操作不可恢复。`)) return;
    const fd = new FormData();
    fd.set("slot", String(slot));
    await deleteSaveSlot(fd);
    refresh();
  }

  return (
    <div className="flex-1 p-4 max-w-2xl mx-auto w-full space-y-4">
      <h1 className="text-xl font-bold text-gold-400 text-center">
        {mode === "startup" ? "纵横四海" : "存档管理"}
      </h1>

      <div className="space-y-3">
        {slots.map((slot) => (
          <SlotCard
            key={slot.slot}
            slot={slot}
            mode={mode}
            disabled={isPending}
            onSave={() => handleSave(slot.slot, slot.slotName, slot.exists)}
            onDelete={() => handleDelete(slot.slot, slot.slotName)}
          />
        ))}
      </div>

      {mode === "startup" && (
        <form action={createNewGame} className="pt-2">
          <button
            type="submit"
            className="w-full rounded-lg bg-gold-500 px-6 py-3 text-lg font-bold text-ocean-900 hover:bg-gold-400 transition-colors"
          >
            开始新游戏
          </button>
        </form>
      )}

      {mode === "manage" && (
        <a
          href="/"
          className="block rounded-lg border border-ocean-600 bg-ocean-700/60 p-3 text-center text-sm hover:bg-ocean-700 transition-colors"
        >
          <span className="font-semibold text-gold-400">返回港口</span>
        </a>
      )}
    </div>
  );
}

function SlotCard({
  slot,
  mode,
  disabled,
  onSave,
  onDelete,
}: {
  slot: SaveSlotView;
  mode: "startup" | "manage";
  disabled: boolean;
  onSave: () => void;
  onDelete: () => void;
}) {
  const isAuto = slot.slot === 0;
  const updatedText = slot.updatedAt
    ? new Date(slot.updatedAt).toLocaleString("zh-CN")
    : "";

  return (
    <div className="rounded-lg border border-ocean-600 bg-ocean-800/80 p-4">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-gold-400">{slot.slotName}</span>
        {slot.exists ? (
          <span className="text-xs text-parchment-dark/60">{updatedText}</span>
        ) : (
          <span className="text-xs text-parchment-dark/40">空槽位</span>
        )}
      </div>

      {slot.exists && (
        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-parchment-dark">
          <span>
            等级 <span className="text-gold-400">Lv.{slot.playerLevel}</span>
          </span>
          <span>
            船只 <span className="text-gold-400">{slot.shipCount}</span>
          </span>
          <span>
            金币{" "}
            <span className="text-gold-400">{slot.gold.toLocaleString()}</span>
          </span>
          <span>
            港口 <span className="text-gold-400">{slot.currentPortName}</span>
          </span>
          <span>
            天数 <span className="text-gold-400">第 {slot.day} 天</span>
          </span>
        </div>
      )}

      <div className="mt-3 flex gap-2">
        {/* 存档按钮：仅管理模式 + 仅手动槽位 */}
        {mode === "manage" && !isAuto && (
          <button
            type="button"
            disabled={disabled}
            onClick={onSave}
            className="flex-1 rounded border border-ocean-600 bg-ocean-700/60 px-3 py-1.5 text-xs hover:bg-ocean-700 transition-colors disabled:opacity-50"
          >
            {slot.exists ? "覆盖存档" : "存入此槽位"}
          </button>
        )}

        {/* 读取按钮：槽位有数据时 */}
        {slot.exists && (
          <form action={loadSaveSlot} className="flex-1">
            <input type="hidden" name="slot" value={slot.slot} />
            <button
              type="submit"
              disabled={disabled}
              className="w-full rounded border border-gold-600 bg-gold-500/20 px-3 py-1.5 text-xs text-gold-400 hover:bg-gold-500/30 transition-colors disabled:opacity-50"
            >
              读取
            </button>
          </form>
        )}

        {/* 删除按钮：槽位有数据时 */}
        {slot.exists && (
          <button
            type="button"
            disabled={disabled}
            onClick={onDelete}
            className="flex-1 rounded border border-red-800 bg-red-900/30 px-3 py-1.5 text-xs text-red-400 hover:bg-red-900/50 transition-colors disabled:opacity-50"
          >
            删除
          </button>
        )}
      </div>
    </div>
  );
}
