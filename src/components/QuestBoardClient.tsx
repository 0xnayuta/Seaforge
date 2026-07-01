"use client";

import { useActionState } from "react";
import { acceptQuestAction, completeQuestAction } from "../app/actions/quest";
import type { QuestBoardView, QuestSummaryView } from "../types/game-view";

interface RewardInfo {
  readonly gold: number;
  readonly exp: number;
  readonly itemNames: readonly string[];
}

interface QuestBoardClientProps {
  readonly board: QuestBoardView;
  readonly rewardInfo: Record<string, RewardInfo | undefined>;
}

export function QuestBoardClient({ board, rewardInfo }: QuestBoardClientProps) {
  const handleAction = async (_prev: unknown, formData: FormData) => {
    const action = formData.get("_action") as string;
    const questId = formData.get("questId") as string;
    if (action === "accept") {
      await acceptQuestAction(questId);
    } else if (action === "complete") {
      await completeQuestAction(questId);
    }
    return { action, questId };
  };
  const [_state, formAction, isPending] = useActionState(handleAction, null);

  return (
    <>
      {/* 可选任务 */}
      <section>
        <h2 className="text-lg font-semibold text-gold-400 mb-3">可选任务</h2>
        {board.availableQuests.length === 0 ? (
          <p className="text-parchment-dark/60">当前港口没有可接的任务</p>
        ) : (
          <div className="space-y-3">
            {board.availableQuests.map((quest) => (
              <QuestCard
                key={quest.id}
                quest={quest}
                rewardInfo={rewardInfo[quest.id]}
              >
                <form action={formAction}>
                  <input type="hidden" name="_action" value="accept" />
                  <input type="hidden" name="questId" value={quest.id} />
                  <button
                    type="submit"
                    disabled={isPending}
                    className="px-4 py-1.5 bg-gold-500 text-ocean-900 rounded hover:bg-gold-400 disabled:opacity-50 text-sm font-medium transition-colors"
                  >
                    接受
                  </button>
                </form>
              </QuestCard>
            ))}
          </div>
        )}
      </section>

      {/* 进行中任务 */}
      <section>
        <h2 className="text-lg font-semibold text-gold-400 mb-3">进行中任务</h2>
        {board.activeQuests.length === 0 ? (
          <p className="text-parchment-dark/60">暂无进行中的任务</p>
        ) : (
          <div className="space-y-3">
            {board.activeQuests.map((quest) => (
              <QuestCard
                key={quest.id}
                quest={quest}
                rewardInfo={rewardInfo[quest.id]}
                showProgress
              >
                {quest.target > 0 && quest.progress >= quest.target && (
                  <form action={formAction}>
                    <input type="hidden" name="_action" value="complete" />
                    <input type="hidden" name="questId" value={quest.id} />
                    <button
                      type="submit"
                      disabled={isPending}
                      className="px-4 py-1.5 bg-green-600 text-white rounded hover:bg-green-500 disabled:opacity-50 text-sm font-medium transition-colors"
                    >
                      完成
                    </button>
                  </form>
                )}
              </QuestCard>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

// ---- 子组件 ----

interface QuestCardProps {
  readonly quest: QuestSummaryView;
  readonly rewardInfo?: RewardInfo;
  readonly showProgress?: boolean;
  readonly children: React.ReactNode;
}

function QuestCard({
  quest,
  rewardInfo,
  showProgress,
  children,
}: QuestCardProps) {
  const progressPct =
    quest.target > 0
      ? Math.min(100, Math.round((quest.progress / quest.target) * 100))
      : 0;

  return (
    <div className="bg-ocean-800 rounded-lg p-4 border border-ocean-700">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-white font-medium truncate">{quest.name}</h3>
            <span className="shrink-0 text-xs text-gold-500 px-1.5 py-0.5 border border-gold-500/40 rounded">
              {quest.type}
            </span>
          </div>
          <p className="text-sm text-parchment-dark/80 mt-1 line-clamp-2">
            {quest.description}
          </p>
        </div>
        <div className="shrink-0">{children}</div>
      </div>

      {showProgress && quest.target > 0 && (
        <div className="mt-3">
          <div className="flex justify-between text-xs text-parchment-dark/70 mb-1">
            <span>进度</span>
            <span>
              {quest.progress}/{quest.target}
            </span>
          </div>
          <div className="w-full bg-ocean-900 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gold-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {rewardInfo && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-parchment-dark/70 mt-3">
          <span>奖励:</span>
          {rewardInfo.gold > 0 && <span>{rewardInfo.gold} 金币</span>}
          {rewardInfo.exp > 0 && <span>{rewardInfo.exp} 经验</span>}
          {rewardInfo.itemNames.length > 0 && (
            <span>物品: {rewardInfo.itemNames.join(", ")}</span>
          )}
        </div>
      )}
    </div>
  );
}
