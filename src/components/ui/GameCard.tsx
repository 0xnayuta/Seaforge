interface GameCardProps {
  readonly title?: string
  readonly children: React.ReactNode
  readonly className?: string
}

export function GameCard({ title, children, className = "" }: GameCardProps) {
  return (
    <div
      className={`rounded-lg border border-ocean-600 bg-ocean-800/80 p-4 ${className}`}
    >
      {title && (
        <h2 className="mb-3 text-lg font-semibold text-gold-400">{title}</h2>
      )}
      {children}
    </div>
  )
}
