"use client";

interface CharacterCombatStatsProps {
  readonly panelStats: {
    readonly hp: number;
    readonly atk: number;
    readonly def: number;
    readonly mag: number;
    readonly mdf: number;
    readonly spd: number;
    readonly luk: number;
    readonly equipLoad: number;
  };
}

export function CharacterCombatStats({
  panelStats,
}: CharacterCombatStatsProps) {
  return (
    <div className="rounded-lg border border-ocean-600 bg-ocean-800/80 p-4 space-y-3">
      <h3 className="text-sm font-semibold text-gold-400 border-b border-ocean-750 pb-2">
        战斗面板
      </h3>
      <div className="grid grid-cols-2 gap-3 text-sm">
        {[
          { label: "生命值 (HP)", value: panelStats.hp },
          { label: "物理攻击 (ATK)", value: panelStats.atk },
          { label: "物理防御 (DEF)", value: panelStats.def },
          { label: "魔法攻击 (MAG)", value: panelStats.mag },
          { label: "魔法防御 (MDF)", value: panelStats.mdf },
          { label: "行动速度 (SPD)", value: panelStats.spd },
          { label: "幸运值 (LUK)", value: panelStats.luk },
          { label: "最大承载 (LOAD)", value: panelStats.equipLoad },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="rounded border border-ocean-750 bg-ocean-900/20 p-2"
          >
            <div className="text-xs text-parchment-dark">{label}</div>
            <div className="text-base font-bold text-parchment mt-0.5">
              {value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
