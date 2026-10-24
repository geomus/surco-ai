import type { ZoneSignal } from '@/lib/types'
import { cn } from '@/lib/utils'

export function FieldSketch({ zones }: { zones: ZoneSignal[] }) {
  const ordered = [...zones].sort((a, b) => a.anomaly - b.anomaly)
  const rank = new Map(ordered.filter((z) => z.inspect).map((z, i) => [z.id, i + 1]))

  return (
    <ul className="grid grid-cols-2 gap-1 rounded-md border-2 border-dashed border-border p-1">
      {zones.map((zone) => {
        const drop = Math.round((1 - zone.anomaly) * 100)
        const order = rank.get(zone.id)
        return (
          <li
            key={zone.id}
            className={cn(
              'flex min-h-24 flex-col justify-between gap-2 rounded-sm p-3',
              zone.inspect
                ? zone.anomaly < 0.8
                  ? 'bg-destructive/15'
                  : 'bg-accent/25'
                : 'bg-primary/10',
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-sm font-medium">{zone.name}</span>
              {order && (
                <span className="rounded-sm bg-foreground px-1.5 py-0.5 font-mono text-[11px] text-background">
                  recorrer {order}º
                </span>
              )}
            </div>
            <div className="flex items-baseline justify-between gap-2 font-mono text-xs text-muted-foreground">
              <span>{zone.hectares} ha</span>
              <span className={cn(zone.inspect && 'font-medium text-foreground')}>
                NDVI {zone.ndviCurrent.toFixed(2)} ({drop > 0 ? `−${drop}` : `+${Math.abs(drop)}`}% vs. historia)
              </span>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
