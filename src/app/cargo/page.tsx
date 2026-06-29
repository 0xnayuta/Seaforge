"use client";

import { useActionState } from "react";
import { CargoHold } from "../../components/CargoHold";
import { loadCargoView } from "./actions";

export default function CargoPage() {
  const [view, loadAction, isLoadPending] = useActionState(loadCargoView, null);

  if (!view) {
    return (
      <form
        action={loadAction}
        className="flex-1 flex items-center justify-center"
      >
        <button
          type="submit"
          disabled={isLoadPending}
          className="rounded-lg bg-gold-500 px-6 py-3 text-lg font-bold text-ocean-900 hover:bg-gold-400 transition-colors disabled:opacity-50"
        >
          {isLoadPending ? "加载中..." : "查看船舱"}
        </button>
      </form>
    );
  }

  return <CargoHold view={view} />;
}
