import { LEVEL_BG, LEVEL_TEXT, formatPct, formatTons } from '@/lib/format'
import type { Level, Signals } from '@/lib/types'
import { cn } from '@/lib/utils'

type CoverageGaugeProps = { production: Signals['production']; level: Level }

export function CoverageGauge({ production, level }: CoverageGaugeProps) {
  const { pessimisticT, expectedT, optimisticT, soldT, coverage } = production
  const scale = Math.max(optimisticT, soldT) * 1.08 || 1
  const at = (tons: number) => `${Math.min(100, (tons / scale) * 100)}%`

  return (
    <figure className="flex flex-col gap-3">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="text-sm leading-relaxed">
          Vendiste <span className={cn('font-semibold', LEVEL_TEXT[level])}>{formatPct(coverage)}</span> de lo que
          probablemente coseches
        </span>
        <span className="font-mono text-xs text-muted-foreground">
          rinde de referencia × anomalía NDVI ± 15%
        </span>
      </figcaption>

      <div
        className="relative h-14"
        role="img"
        aria-label={`Vendido ${formatTons(soldT)}. Cosecha probable entre ${formatTons(pessimisticT)} y ${formatTons(optimisticT)}, central ${formatTons(expectedT)}.`}
      >
        <div className="absolute inset-x-0 top-5 h-4 rounded-sm bg-muted" />
        <div
          className="absolute top-5 h-4 bg-primary/25"
          style={{ left: at(pessimisticT), width: `calc(${at(optimisticT)} - ${at(pessimisticT)})` }}
        />
        <div className="absolute top-4 h-6 w-0.5 bg-primary" style={{ left: at(expectedT) }} />
        <div
          className={cn('absolute top-5 h-4 rounded-l-sm opacity-80', LEVEL_BG[level])}
          style={{ left: 0, width: at(soldT), maskImage: 'linear-gradient(90deg, transparent, black 30%)' }}
        />
        <div className={cn('absolute top-2 h-10 w-1 -translate-x-1/2 rounded-full', LEVEL_BG[level])} style={{ left: at(soldT) }} />
        <span
          className="absolute top-0 -translate-x-1/2 -translate-y-1 font-mono text-[11px] font-medium"
          style={{ left: at(soldT) }}
        >
          vendido
        </span>
      </div>

      <dl className="grid grid-cols-4 gap-2 font-mono text-sm">
        <div>
          <dt className="font-sans text-xs text-muted-foreground">Vendido</dt>
          <dd className={cn('font-medium', LEVEL_TEXT[level])}>{formatTons(soldT)}</dd>
        </div>
        <div>
          <dt className="font-sans text-xs text-muted-foreground">Pesimista</dt>
          <dd>{formatTons(pessimisticT)}</dd>
        </div>
        <div>
          <dt className="font-sans text-xs text-muted-foreground">Probable</dt>
          <dd className="font-medium">{formatTons(expectedT)}</dd>
        </div>
        <div>
          <dt className="font-sans text-xs text-muted-foreground">Optimista</dt>
          <dd>{formatTons(optimisticT)}</dd>
        </div>
      </dl>
    </figure>
  )
}
