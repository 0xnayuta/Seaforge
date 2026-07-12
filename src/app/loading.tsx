export default function Loading() {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center space-y-4">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-ocean-600 border-t-gold-500" />
        <p className="text-sm text-parchment-dark">加载中...</p>
      </div>
    </div>
  );
}
