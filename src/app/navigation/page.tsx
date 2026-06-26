"use client";
import { useActionState } from "react";
import { NavigationPanel } from "../../components/NavigationPanel";
import type { NavigationView } from "../../types/game-view";
import { loadNavigationView } from "./actions";

export default function NavigationPage() {
  const [view, loadAction, isLoading] = useActionState<NavigationView | null>(
    loadNavigationView,
    null,
  );

  if (!view) {
    return (
      <form
        action={loadAction}
        className="flex-1 flex items-center justify-center"
      >
        <button
          type="submit"
          disabled={isLoading}
          className="rounded-lg bg-gold-500 px-6 py-3 text-lg font-bold text-ocean-900 hover:bg-gold-400 transition-colors disabled:opacity-50"
        >
          {isLoading ? "加载中..." : "打开航海图"}
        </button>
      </form>
    );
  }

  return <NavigationPanel view={view} />;
}
