"use client";

import { useActionState, useState } from "react";
import {
  giveGiftAction,
  loadNpcView,
  recruitNpcAction,
  talkToNpcAction,
} from "../app/actions/npc";
import { acceptQuestAction } from "../app/actions/quest";
import type { NpcDetailView } from "../types/game-view";
import { GameCard } from "./ui/GameCard";

interface NpcInteractionPanelProps {
  readonly view: NpcDetailView;
  readonly npcId: string;
}

export function NpcInteractionPanel({
  view: initialView,
  npcId,
}: NpcInteractionPanelProps) {
  const [view, setView] = useState(initialView);
  const [selectedItemUid, setSelectedItemUid] = useState("");

  // --- 对话 ---
  const [talkState, talkAction, talkPending] = useActionState(
    async (_prev: string | null) => {
      try {
        await talkToNpcAction(npcId);
        const updated = await loadNpcView(npcId);
        if (updated) setView(updated);
        return "对话成功";
      } catch (err) {
        return err instanceof Error ? err.message : "操作失败";
      }
    },
    null,
  );

  // --- 赠送礼物 ---
  const [giftState, giftAction, giftPending] = useActionState(
    async (_prev: string | null, formData: FormData) => {
      try {
        const itemUid = formData.get("itemUid") as string;
        if (!itemUid) return "请选择物品";
        await giveGiftAction(npcId, itemUid);
        const updated = await loadNpcView(npcId);
        if (updated) setView(updated);
        setSelectedItemUid("");
        return "赠送成功";
      } catch (err) {
        return err instanceof Error ? err.message : "操作失败";
      }
    },
    null,
  );

  // --- 招募 ---
  const [recruitState, recruitAction, recruitPending] = useActionState(
    async (_prev: string | null) => {
      try {
        await recruitNpcAction(npcId);
        const updated = await loadNpcView(npcId);
        if (updated) setView(updated);
        return "招募成功";
      } catch (err) {
        return err instanceof Error ? err.message : "操作失败";
      }
    },
    null,
  );

  // --- 接受任务 ---
  const [questState, questAction, questPending] = useActionState(
    async (_prev: string | null, formData: FormData) => {
      try {
        const questId = formData.get("questId") as string;
        if (!questId) return "任务 ID 无效";
        await acceptQuestAction(questId);
        const updated = await loadNpcView(npcId);
        if (updated) setView(updated);
        return "任务已接受";
      } catch (err) {
        return err instanceof Error ? err.message : "操作失败";
      }
    },
    null,
  );

  const affinityPercent = Math.min(
    100,
    Math.round((view.affinity / view.maxAffinity) * 100),
  );

  const giftableItems = view.inventory.filter((item) => !item.equippedSlot);

  return (
    <div className="flex-1 p-4 max-w-2xl mx-auto w-full space-y-4">
      {/* NPC 信息 */}
      <GameCard title={view.name}>
        <p className="text-sm text-parchment-dark mb-2">{view.typeLabel}</p>

        {/* 好感度进度条 */}
        <div className="mb-3">
          <div className="flex justify-between text-xs text-parchment-dark mb-1">
            <span>好感度</span>
            <span>
              {view.affinity} / {view.maxAffinity}
            </span>
          </div>
          <div className="h-2 bg-ocean-900 rounded-full overflow-hidden">
            <div
              className="h-full bg-gold-500 rounded-full transition-all"
              style={{ width: `${affinityPercent}%` }}
            />
          </div>
        </div>

        {/* 对话文本 */}
        <div className="mb-4 p-3 bg-ocean-900/50 rounded italic text-parchment-dark">
          &ldquo;{view.dialogText}&rdquo;
          {view.dialogPhase > 0 && (
            <span className="block text-xs text-gold-500 not-italic mt-1">
              （重复）
            </span>
          )}
        </div>

        {/* 对话按钮 */}
        <form action={talkAction}>
          <button
            type="submit"
            disabled={talkPending}
            className="px-4 py-2 bg-gold-600 hover:bg-gold-500 disabled:opacity-50 text-white rounded transition-colors"
          >
            {talkPending ? "对话中..." : "对话"}
          </button>
          {talkState && (
            <p className="mt-2 text-sm text-parchment-dark">{talkState}</p>
          )}
        </form>
      </GameCard>

      {/* 赠送礼物 */}
      <GameCard title="赠送礼物">
        <form action={giftAction}>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <select
                name="itemUid"
                value={selectedItemUid}
                onChange={(e) => setSelectedItemUid(e.target.value)}
                className="w-full rounded border border-ocean-600 bg-ocean-900 text-parchment-dark p-2 text-sm"
              >
                <option value="">-- 选择物品 --</option>
                {giftableItems.map((item) => {
                  const pref = view.giftPreferences.find(
                    (p) => p.itemId === item.itemId,
                  );
                  return (
                    <option key={item.uid} value={item.uid}>
                      {item.name} x{item.quantity}
                      {pref ? ` (+${pref.affinityGain} 好感度)` : ""}
                    </option>
                  );
                })}
              </select>
            </div>
            <button
              type="submit"
              disabled={giftPending || !selectedItemUid}
              className="px-4 py-2 bg-gold-600 hover:bg-gold-500 disabled:opacity-50 text-white rounded transition-colors shrink-0"
            >
              {giftPending ? "赠送中..." : "赠送"}
            </button>
          </div>
          {giftState && (
            <p className="mt-2 text-sm text-parchment-dark">{giftState}</p>
          )}
        </form>
      </GameCard>

      {/* 招募 */}
      {view.recruitable && !view.recruited && (
        <GameCard title="招募">
          {view.recruitCondition && (
            <div className="text-sm text-parchment-dark mb-3 space-y-1">
              <p className="text-gold-400 text-xs font-semibold mb-1">
                招募条件
              </p>
              {view.recruitCondition.minAffinity > 0 && (
                <p>需要好感度 &ge; {view.recruitCondition.minAffinity}</p>
              )}
              {view.recruitCondition.goldCost > 0 && (
                <p>需要金币 {view.recruitCondition.goldCost}</p>
              )}
              {view.recruitCondition.requiredQuestIds.length > 0 && (
                <p>需要完成指定任务</p>
              )}
            </div>
          )}
          <form action={recruitAction}>
            <button
              type="submit"
              disabled={recruitPending || !view.canRecruit}
              className="px-4 py-2 bg-gold-600 hover:bg-gold-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded transition-colors"
            >
              {recruitPending
                ? "招募中..."
                : view.canRecruit
                  ? "招募"
                  : "条件未满足"}
            </button>
            {recruitState && (
              <p className="mt-2 text-sm text-parchment-dark">{recruitState}</p>
            )}
          </form>
        </GameCard>
      )}

      {/* 可接任务 */}
      {view.availableQuests.length > 0 && (
        <GameCard title="可接任务">
          <div className="space-y-3">
            {view.availableQuests.map((quest) => (
              <div
                key={quest.id}
                className="border border-ocean-600 rounded p-3"
              >
                <h3 className="text-gold-400 font-semibold">{quest.name}</h3>
                <p className="text-sm text-parchment-dark mt-1">
                  {quest.description}
                </p>
                <form action={questAction} className="mt-2">
                  <input type="hidden" name="questId" value={quest.id} />
                  <button
                    type="submit"
                    disabled={questPending}
                    className="px-3 py-1 bg-gold-600 hover:bg-gold-500 disabled:opacity-50 text-white text-sm rounded transition-colors"
                  >
                    {questPending ? "接受中..." : "接受任务"}
                  </button>
                </form>
              </div>
            ))}
          </div>
          {questState && (
            <p className="mt-2 text-sm text-parchment-dark">{questState}</p>
          )}
        </GameCard>
      )}

      {/* 已招募提示 */}
      {view.recruited && (
        <GameCard>
          <p className="text-parchment-dark text-center">
            该 NPC 已在你的队伍中
          </p>
        </GameCard>
      )}

      {/* 返回按钮 */}
      <div className="text-center">
        <a
          href="/npc"
          className="text-gold-400 hover:text-gold-300 underline text-sm"
        >
          返回
        </a>
      </div>
    </div>
  );
}
