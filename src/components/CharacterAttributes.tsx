"use client";

interface CharacterAttributesProps {
  readonly attributes: Record<string, number>;
  readonly attributePoints: number;
  readonly isPending: boolean;
  readonly blockedByVoyage: boolean;
  readonly onAllocate: (attribute: string) => void;
}

export function CharacterAttributes({
  attributes,
  attributePoints,
  isPending,
  blockedByVoyage,
  onAllocate,
}: CharacterAttributesProps) {
  return (
    <div className="rounded-lg border border-ocean-600 bg-ocean-800/80 p-4 space-y-3">
      <div className="flex justify-between items-center border-b border-ocean-750 pb-2">
        <h3 className="text-sm font-semibold text-gold-400">核心属性</h3>
        {attributePoints > 0 && (
          <span className="text-xs text-yellow-400">
            可用属性点: {attributePoints}
          </span>
        )}
      </div>

      <div className="space-y-2.5">
        {[
          {
            key: "str",
            label: "力量 (STR)",
            desc: "提升物理伤害与装备承重",
          },
          {
            key: "dex",
            label: "敏捷 (DEX)",
            desc: "提升攻击速度、暴击率与回避率",
          },
          {
            key: "int",
            label: "智力 (INT)",
            desc: "提升魔法威力与特殊炮弹威力",
          },
          {
            key: "fth",
            label: "信仰 (FTH)",
            desc: "提升魔法防御与船员士气",
          },
          {
            key: "arc",
            label: "感应 (ARC)",
            desc: "提升幸运、掉落率与商品议价能力",
          },
        ].map(({ key, label, desc }) => {
          const val = attributes[key as keyof typeof attributes];
          return (
            <div key={key} className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-parchment">
                  {label}
                </div>
                <div className="text-[10px] text-parchment-dark">{desc}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-parchment w-8 text-right">
                  {val}
                </span>
                <button
                  type="button"
                  disabled={
                    attributePoints <= 0 || isPending || blockedByVoyage
                  }
                  onClick={() => onAllocate(key)}
                  className="rounded bg-gold-500 hover:bg-gold-400 disabled:opacity-30 disabled:hover:bg-gold-500 w-6 h-6 flex items-center justify-center text-sm font-bold text-ocean-900 transition-colors"
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
