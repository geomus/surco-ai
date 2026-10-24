'use client'

import { ExternalLink } from 'lucide-react'
import { useState } from 'react'
import type { CaseId } from '@/components/farm-workspace'
import { Button } from '@/components/ui/button'
import type { FarmAgentMessage } from '@/lib/agent'
import { LEVEL_LABEL, LEVEL_TEXT, formatPct, formatTons, formatUsd } from '@/lib/format'
import type { FarmProfile } from '@/lib/profile'

type ReferralDraft = Exclude<
  Extract<FarmAgentMessage['parts'][number], { type: 'tool-prepareReferral'; state: 'output-available' }>['output'],
  { missing: string[] }
>

type ReferralCardProps = { draft: ReferralDraft; caseId: CaseId; profile: FarmProfile; boardPrice: number }

export function ReferralCard({ draft, caseId, profile, boardPrice }: ReferralCardProps) {
  const [consent, setConsent] = useState(false)
  const [cuit, setCuit] = useState('')
  const [state, setState] = useState<{ status: 'idle' | 'sending' } | { status: 'sent'; id: string } | { status: 'error'; message: string }>(
    { status: 'idle' },
  )
  const isFinancing = draft.kind === 'financing'

  const share = async () => {
    setState({ status: 'sending' })
    const res = await fetch('/api/referrals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caseId,
        kind: draft.kind,
        profile,
        boardPrice,
        consent: true,
        cuit: isFinancing && cuit.trim() ? cuit : undefined,
      }),
    }).catch(() => null)
    const data = res ? await res.json().catch(() => ({})) : {}
    if (res?.ok && data.id) setState({ status: 'sent', id: data.id })
    else setState({ status: 'error', message: data.error ?? 'No se pudo compartir' })
  }

  return (
    <article className="flex w-full flex-col gap-3 rounded-lg border-2 border-primary/30 bg-background p-4">
      <header className="flex flex-col gap-0.5">
        <span className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
          {isFinancing ? 'Carpeta de financiación' : 'Solicitud de seguro'}
        </span>
        <h3 className="text-sm font-semibold">Para: {draft.destination}</h3>
        <p className="text-xs text-muted-foreground">{draft.field}</p>
      </header>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">Producción probable</dt>
          <dd className="font-mono">{formatTons(draft.production.expectedT)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Cobertura</dt>
          <dd className="font-mono">{formatPct(draft.production.coverage)}</dd>
        </div>
        {isFinancing ? (
          <>
            <div>
              <dt className="text-xs text-muted-foreground">Valor pesimista</dt>
              <dd className="font-mono">{formatUsd(draft.financing.pessimisticValueUsd)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Riesgo de entrega</dt>
              <dd className={`font-medium ${LEVEL_TEXT[draft.financing.level]}`}>{LEVEL_LABEL[draft.financing.level]}</dd>
            </div>
          </>
        ) : (
          <>
            <div>
              <dt className="text-xs text-muted-foreground">Lluvia 14 días</dt>
              <dd className="font-mono">{draft.insurance.rainNext14dMm} mm</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Exposición</dt>
              <dd className={`font-medium ${LEVEL_TEXT[draft.insurance.exposure]}`}>
                {LEVEL_LABEL[draft.insurance.exposure]}
              </dd>
            </div>
          </>
        )}
      </dl>

      {state.status === 'sent' ? (
        <div className="flex flex-col gap-2 rounded-md bg-muted p-3 text-sm">
          <p>Compartida. Queda registrado tu consentimiento y la fecha.</p>
          <a
            href={`/referral/${state.id}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 font-medium text-primary underline-offset-4 hover:underline"
          >
            Ver e imprimir la carpeta <ExternalLink className="size-3.5" aria-hidden="true" />
          </a>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {isFinancing && (
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs text-muted-foreground">
                CUIT (opcional): suma tu situación en la Central de Deudores del BCRA
              </span>
              <input
                value={cuit}
                onChange={(e) => setCuit(e.target.value)}
                inputMode="numeric"
                placeholder="20-12345678-9"
                className="rounded-md border bg-card px-3 py-1.5 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
          )}
          <label className="flex items-start gap-2 text-sm leading-relaxed">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-1 accent-primary"
            />
            <span>
              Revisé los datos y autorizo compartir esta carpeta con {draft.destination}. MiCampo no contrata ni vende
              nada en mi nombre.
            </span>
          </label>
          {state.status === 'error' && (
            <p role="alert" className="text-sm text-destructive">
              {state.message}
            </p>
          )}
          <Button onClick={share} disabled={!consent || state.status === 'sending'} className="self-start">
            {state.status === 'sending' ? 'Compartiendo…' : 'Compartir carpeta'}
          </Button>
        </div>
      )}
    </article>
  )
}
