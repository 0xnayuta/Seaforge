"use client"

interface QuantityInputProps {
  value: number
  min?: number
  max?: number
  onChange: (v: number) => void
}

/** 带 -/+ 按钮的数量选择器 */
export function QuantityInput({
  value,
  min = 1,
  max,
  onChange,
}: QuantityInputProps) {
  const atMin = value <= min
  const atMax = max !== undefined && value >= max

  return (
    <div className="flex items-center justify-center gap-2">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={atMin}
        className="rounded bg-ocean-700 px-3 py-1 text-sm hover:bg-ocean-600 disabled:opacity-30"
      >
        -
      </button>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => {
          const raw = Number(e.target.value)
          if (isNaN(raw)) return
          const clamped = max !== undefined
            ? Math.min(max, Math.max(min, raw))
            : Math.max(min, raw)
          onChange(clamped)
        }}
        className="w-20 rounded bg-ocean-900 border border-ocean-600 px-3 py-1 text-center text-sm text-parchment"
      />
      <button
        type="button"
        onClick={() => {
          const next = value + 1
          onChange(max !== undefined ? Math.min(max, next) : next)
        }}
        disabled={atMax}
        className="rounded bg-ocean-700 px-3 py-1 text-sm hover:bg-ocean-600 disabled:opacity-30"
      >
        +
      </button>
    </div>
  )
}
