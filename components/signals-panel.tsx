'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { CoverageGauge } from '@/components/coverage-gauge'
import type { CaseId } from '@/components/farm-workspace'
import { FieldSketch } from '@/components/field-sketch'
import { Button } from '@/components/ui/button'
import { LEVEL_BG, LEVEL_LABEL, LEVEL_TEXT, formatDay, formatUsd } from '@/lib/format'
import type { FarmProfile } from '@/lib/profile'
import type { FieldTask, Signals } from '@/lib/types'
import { cn } from '@/lib/utils'

type SignalsResponse =
  | { signals: Signals; weatherSource: string; missing: [] }
  | { signals: null; weatherSource: null; missing: string[] }

async function fetchSignals([, body]: [string, string]): Promise<SignalsResponse> {
  const res = await fetch('/api/signals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })
  if (!res.ok) throw new Error('No se pudieron calcular las señales')
  return res.json()
}

type SignalsPanelProps = {
  caseId: CaseId
  profile: FarmProfile
  boardPrice: number
  busy: boolean
  onAsk: (text: string) => void
}

export function SignalsPanel({ caseId, profile, boardPrice, busy, onAsk }: SignalsPanelProps) {
  const [task, setTask] = useState<FieldTask>('spray')
  const body = JSON.stringify({ caseId, profile, boardPrice, task })
  const { data, error, isLoading } = useSWR(['/api/signals', body], fetchSignals, { keepPreviousData: true })

  if (error) {
    return (
      <p role="alert" className="rounded-lg border bg-card p-4 text-sm text-destructive">
        No se pudieron calcular las señales. Recargá la página.
      </p>
    )
  }
  if (!data) {
    return (
      <div className="flex min-h-96 items-center justify-center rounded-lg border bg-card text-sm text-muted-foreground">
        {isLoading ? 'Leyendo clima y satélite…' : null}
      </div>
    )
  }

  const { signals, weatherSource, missing } = data

  if (!signals) {
    return (
      <section
        aria-labelledby="pending-heading"
        className="flex min-h-96 flex-col justify-center gap-3 rounded-lg border border-dashed bg-card p-6"
      >
        <h2 id="pending-heading" className="text-sm font-semibold">
          El panel se arma mientras conversás
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Con estos datos MiCampo cruza clima, satélite y contratos:
        </p>
        <ul className="flex flex-col gap-1.5 text-sm">
          {missing.map((field) => (
            <li key={field} className="flex items-center gap-2">
              <span aria-hidden="true" className="size-2 rounded-full border border-muted-foreground" />
              {field}
            </li>
          ))}
        </ul>
      </section>
    )
  }

  return (
    <div className={cn('flex flex-col gap-4 transition-opacity', isLoading && 'opacity-70')}>
      <section aria-labelledby="level-heading" className="flex flex-col gap-4 rounded-lg border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span aria-hidden="true" className={cn('mt-1 size-3 shrink-0 rounded-full', LEVEL_BG[signals.level])} />
            <div>
              <h2 id="level-heading" className="text-lg font-semibold">
                Semáforo <span className={LEVEL_TEXT[signals.level]}>{LEVEL_LABEL[signals.level]}</span>
              </h2>
              <ul className="text-sm leading-relaxed text-muted-foreground">
                {signals.levelReasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => onAsk('Hacé el chequeo de mañana y avisame solo lo importante.')}
          >
            Simular aviso de mañana
          </Button>
        </div>

        <CoverageGauge production={signals.production} level={signals.level} />

        <div className="rounded-md bg-muted px-3 py-2 text-sm leading-relaxed">
          <span className="font-medium">Venta: </span>
          {signals.sale.explanation}
          <span className="block font-mono text-xs text-muted-foreground">
            Pizarra USD {signals.sale.boardPrice}/t · tus contratos promedian USD {signals.sale.averageContractPrice}/t
          </span>
        </div>
      </section>

      <section aria-labelledby="windows-heading" className="flex flex-col gap-3 rounded-lg border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="windows-heading" className="text-sm font-semibold">
            Cuándo entrar al lote
          </h2>
          <div role="radiogroup" aria-label="Labor" className="flex rounded-md border bg-background p-0.5 text-sm">
            {(['spray', 'harvest'] as const).map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={task === option}
                onClick={() => setTask(option)}
                className={cn(
                  'rounded px-2.5 py-1',
                  task === option ? 'bg-secondary font-medium' : 'text-muted-foreground',
                )}
              >
                {option === 'spray' ? 'Pulverizar' : 'Cosechar'}
              </button>
            ))}
          </div>
        </div>
        <ol className="grid grid-cols-7 gap-1.5">
          {signals.windows.days.map((day) => (
            <li
              key={day.date}
              title={day.reason}
              className={cn(
                'flex flex-col items-center gap-1 rounded-md border px-1 py-2 text-center',
                day.suitable ? 'border-primary/40 bg-primary/10' : 'bg-background',
              )}
            >
              <span className="text-xs capitalize text-muted-foreground">{formatDay(day.date)}</span>
              <span className={cn('text-sm font-semibold', day.suitable ? 'text-primary' : 'text-muted-foreground')}>
                {day.suitable ? 'Apto' : 'No'}
              </span>
              <span className="font-mono text-[11px] leading-tight text-muted-foreground">
                {day.suitable ? `${day.suitableHours} h` : day.reason}
              </span>
            </li>
          ))}
        </ol>
        <p className="font-mono text-xs text-muted-foreground">Fuente: {weatherSource}</p>
      </section>

      <section aria-labelledby="zones-heading" className="flex flex-col gap-3 rounded-lg border bg-card p-4">
        <h2 id="zones-heading" className="text-sm font-semibold">
          Qué recorrer primero
        </h2>
        <FieldSketch zones={signals.zones} />
        <p className="font-mono text-xs text-muted-foreground">
          Fuente: Sentinel-2, NDVI precalculado contra la misma quincena de años previos. Croquis, no a escala.
        </p>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <section aria-labelledby="insurance-heading" className="flex flex-col gap-2 rounded-lg border bg-card p-4">
          <h2 id="insurance-heading" className="text-sm font-semibold">
            Seguro · exposición{' '}
            <span className={LEVEL_TEXT[signals.insurance.exposure]}>{LEVEL_LABEL[signals.insurance.exposure]}</span>
          </h2>
          <ul className="flex-1 text-sm leading-relaxed text-muted-foreground">
            {signals.insurance.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => onAsk('¿Me conviene asegurar? Si sí, armame la solicitud de seguro.')}
            className="self-start"
          >
            Armar solicitud de seguro
          </Button>
        </section>

        <section aria-labelledby="financing-heading" className="flex flex-col gap-2 rounded-lg border bg-card p-4">
          <h2 id="financing-heading" className="text-sm font-semibold">
            Financiación · riesgo{' '}
            <span className={LEVEL_TEXT[signals.financing.level]}>{LEVEL_LABEL[signals.financing.level]}</span>
          </h2>
          <p className="font-mono text-sm">
            {formatUsd(signals.financing.pessimisticValueUsd)} pesimista ·{' '}
            {formatUsd(signals.financing.commitmentsUsd)} comprometido
          </p>
          <ul className="flex-1 text-sm leading-relaxed text-muted-foreground">
            {signals.financing.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
          <Button
            size="sm"
            disabled={busy}
            onClick={() => onAsk('Armame la carpeta para pedir financiación a fyo.')}
            className="self-start"
          >
            Armar carpeta para fyo
          </Button>
        </section>
      </div>
    </div>
  )
}
