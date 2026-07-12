"use client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  readonly reset: () => void;
}) {
  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="rounded-lg border border-red-500 bg-red-500/10 p-6 text-center max-w-md">
        <h2 className="text-lg font-bold text-red-400">出错了</h2>
        <p className="mt-2 text-sm text-parchment-dark">
          {error.message || "发生了意外错误"}
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-4 rounded bg-gold-500 px-4 py-2 font-bold text-ocean-900 hover:bg-gold-400 transition-colors"
        >
          重试
        </button>
      </div>
    </div>
  );
}
