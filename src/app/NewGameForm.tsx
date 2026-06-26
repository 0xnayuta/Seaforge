"use client"

import { createNewGame } from "./actions/new-game"

/** 无存档时显示的"开始航海"按钮 */
export function NewGameForm() {
  return (
    <form action={createNewGame} className="flex-1 flex items-center justify-center">
      <button
        type="submit"
        className="rounded-lg bg-gold-500 px-6 py-3 text-lg font-bold text-ocean-900 hover:bg-gold-400 transition-colors"
      >
        开始航海
      </button>
    </form>
  )
}
