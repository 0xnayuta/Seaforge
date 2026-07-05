"use client";

import { useActionState } from "react";
import { performCombatAction } from "../app/actions/combat";
import type {
  CombatLogView,
  CombatParticipantView,
  PersonCombatView,
} from "../types/game-view";

interface CombatPanelProps {
  readonly combatView: PersonCombatView;
  readonly onAction?: unknown;
}

export function CombatPanel({ combatView, onAction }: CombatPanelProps) {
  const [_state, action, _pending] = useActionState(
    (onAction ?? performCombatAction) as (
      prev: unknown,
      formData: FormData,
    ) => Promise<unknown>,
    null,
  );

  const player = combatView.participants.find((p) => p.type === "player");
  const enemies = combatView.participants.filter((p) => p.type === "enemy");
  const currentTarget = enemies.find((e) => !e.isDead);

  return (
    <div className="space-y-4">
      {/* 战斗状态标题 */}
      <div className="rounded-lg border border-red-600 bg-red-900/30 px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="font-bold text-red-400">接舷战</span>
          <span className="text-xs text-parchment-dark">
            第 {combatView.round} 回合
            {combatView.isPlayerTurn ? " — 请选择行动" : " — 敌方行动中..."}
          </span>
        </div>
      </div>

      {/* 敌人列表 */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {enemies.map((enemy) => (
          <CombatantCard key={enemy.id} participant={enemy} />
        ))}
      </div>

      {/* 玩家状态 */}
      {player && <CombatantCard participant={player} isPlayer />}

      {/* 战报日志 */}
      <CombatLog log={combatView.logs} />

      {/* 玩家行动面板 */}
      {combatView.isPlayerTurn &&
        !combatView.status.includes("victory") &&
        !combatView.status.includes("defeat") && (
          <form action={action} className="space-y-3">
            <input
              type="hidden"
              name="targetId"
              value={currentTarget?.id ?? ""}
            />

            {/* 基础动作 */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="submit"
                name="action"
                value="attack"
                className="rounded-lg border border-gold-600 bg-gold-700/50 px-3 py-2 text-sm font-bold text-gold-300 hover:bg-gold-600/50 transition-colors"
              >
                普攻
              </button>
              <button
                type="submit"
                name="action"
                value="dodge"
                disabled={(player?.mp ?? 0) < 5}
                className="rounded-lg border border-blue-600 bg-blue-700/50 px-3 py-2 text-sm font-bold text-blue-300 hover:bg-blue-600/50 transition-colors disabled:opacity-40"
              >
                回避 (5 MP)
              </button>
              <button
                type="submit"
                name="action"
                value="parry"
                disabled={(player?.mp ?? 0) < 8}
                className="rounded-lg border border-purple-600 bg-purple-700/50 px-3 py-2 text-sm font-bold text-purple-300 hover:bg-purple-600/50 transition-colors disabled:opacity-40"
              >
                弹反 (8 MP)
              </button>
            </div>

            {/* 技能列表 */}
            {combatView.availableSkills.length > 0 && (
              <div>
                <p className="mb-1 text-xs text-parchment-dark">武器技能</p>
                <div className="grid grid-cols-2 gap-2">
                  {combatView.availableSkills.map((skill) => (
                    <button
                      key={skill.skillId}
                      type="submit"
                      name="skill_action"
                      value={`skill_${skill.skillId}`}
                      disabled={
                        (player?.mp ?? 0) < skill.mpCost ||
                        (!currentTarget && skill.type !== "heal")
                      }
                      className="rounded-lg border border-green-700 bg-green-800/40 p-2 text-left text-xs hover:bg-green-700/40 transition-colors disabled:opacity-40"
                    >
                      <span className="block font-semibold text-green-300">
                        {skill.name}
                      </span>
                      <span className="text-parchment-dark">
                        MP {skill.mpCost} |{" "}
                        {skill.type === "heal" ? "回复" : `${skill.power}x`}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </form>
        )}

      {/* 战斗结束状态 */}
      {combatView.status === "victory" && (
        <div className="rounded-lg border border-green-600 bg-green-900/30 p-4 text-center">
          <p className="font-bold text-green-400">战斗胜利！击退了登船海盗！</p>
          <p className="mt-1 text-sm text-parchment-dark">获得 50 经验值</p>
        </div>
      )}

      {combatView.status === "defeat" && (
        <div className="rounded-lg border border-red-600 bg-red-900/30 p-4 text-center">
          <p className="font-bold text-red-400">战斗失败…</p>
          <p className="mt-1 text-sm text-parchment-dark">
            损失了 30% 金币与全部货物，被遣返最近港口
          </p>
        </div>
      )}
    </div>
  );
}

function CombatantCard({
  participant,
  isPlayer,
}: {
  readonly participant: CombatParticipantView;
  readonly isPlayer?: boolean;
}) {
  const hpPercent =
    participant.maxHp > 0
      ? Math.round((participant.hp / participant.maxHp) * 100)
      : 0;

  const statusLabels = participant.statuses
    .filter((s) => s.duration > 0)
    .map((s) => `${s.label}(${s.duration})`);

  return (
    <div
      className={`rounded-lg border p-3 text-sm ${
        participant.isDead
          ? "border-gray-700 bg-gray-800/40 opacity-50"
          : isPlayer
            ? "border-blue-600 bg-blue-900/30"
            : "border-red-600 bg-red-900/30"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="font-bold text-parchment">
          {participant.name}
          {participant.isDead && " (已阵亡)"}
        </span>
        <span className="text-xs text-ocean-400">Lv.{participant.level}</span>
      </div>

      {!participant.isDead && (
        <>
          {/* HP 条 */}
          <div className="mt-2">
            <div className="flex justify-between text-xs">
              <span className="text-red-400">HP</span>
              <span className="text-parchment-dark">
                {participant.hp}/{participant.maxHp}
              </span>
            </div>
            <div className="mt-0.5 h-2 w-full overflow-hidden rounded-full bg-gray-700">
              <div
                className="h-full rounded-full bg-red-500 transition-all"
                style={{ width: `${hpPercent}%` }}
              />
            </div>
          </div>

          {/* MP 条 */}
          <div className="mt-1">
            <div className="flex justify-between text-xs">
              <span className="text-blue-400">MP</span>
              <span className="text-parchment-dark">
                {participant.mp}/{participant.maxMp}
              </span>
            </div>
            <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-700">
              <div
                className="h-full rounded-full bg-blue-500 transition-all"
                style={{
                  width: `${(participant.mp / participant.maxMp) * 100}%`,
                }}
              />
            </div>
          </div>

          {/* 状态效果 */}
          {statusLabels.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {statusLabels.map((label) => (
                <span
                  key={`status-${label}`}
                  className="rounded bg-yellow-700/50 px-1.5 py-0.5 text-xs text-yellow-300"
                >
                  {label}
                </span>
              ))}
            </div>
          )}

          {/* 回避/弹反标记 */}
          {participant.isDodging && (
            <span className="mt-1 inline-block rounded bg-blue-700/50 px-1.5 py-0.5 text-xs text-blue-300">
              回避姿态
            </span>
          )}
          {participant.isParrying && (
            <span className="mt-1 inline-block rounded bg-purple-700/50 px-1.5 py-0.5 text-xs text-purple-300">
              弹反姿态
            </span>
          )}

          {participant.weaponName && (
            <p className="mt-1 text-xs text-ocean-400">
              {participant.weaponName}
            </p>
          )}
        </>
      )}
    </div>
  );
}

function CombatLog({ log }: { readonly log: readonly CombatLogView[] }) {
  const recentLogs = log.slice(-8);

  return (
    <div className="max-h-40 overflow-y-auto rounded-lg border border-ocean-600 bg-ocean-800/60 p-3">
      <h4 className="mb-1 text-xs font-semibold text-gold-400">战斗日志</h4>
      <div className="space-y-0.5">
        {recentLogs.map((entry) => (
          <p
            key={`log-${entry.round}-${entry.message.slice(0, 40)}`}
            className="text-xs text-parchment-dark leading-relaxed"
          >
            {entry.message}
          </p>
        ))}
      </div>
    </div>
  );
}
