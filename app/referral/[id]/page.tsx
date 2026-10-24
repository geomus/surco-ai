import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { z } from 'zod'
import { BrandLogo } from '@/components/brand-logo'
import { PrintButton } from '@/app/referral/[id]/print-button'
import {
  LEVEL_LABEL,
  LEVEL_TEXT,
  formatArs,
  formatDateTime,
  formatPct,
  formatTons,
  formatUsd,
} from '@/lib/format'
import { REFERRAL_KIND_LABEL, type ReferralKind, type ReferralSummary } from '@/lib/referral'
import { getAdminClient } from '@/lib/supabase/admin'

// Every link names a producer and `referrals` has no public policy, so the page
// is rendered per request, never prerendered, and kept out of search engines.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Carpeta · MiCampo',
  robots: { index: false, follow: false },
}

const paramsSchema = z.object({ id: z.uuid() })

type ReferralRow = {
  id: string
  kind: ReferralKind
  destination: string
  summary: ReferralSummary
  created_at: string
}

export default async function ReferralPage({ params }: { params: Promise<{ id: string }> }) {
  const parsed = paramsSchema.safeParse(await params)
  if (!parsed.success) notFound()

  const { data, error } = await getAdminClient()
    .from('referrals')
    .select('id, kind, destination, summary, created_at')
    .eq('id', parsed.data.id)
    .maybeSingle<ReferralRow>()

  // A database failure must not be shown as "no existe": only an empty result is a 404.
  if (error) throw new Error(`No se pudo leer la derivación: ${error.message}`)
  if (!data) notFound()

  const { id, kind, destination, summary, created_at: createdAt } = data
  const { production, insurance, financing, zones, contracts, bcra } = summary
  const isFinancing = kind === 'financing'
  const issuedAt = formatDateTime(createdAt)

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 bg-card p-6 text-card-foreground sm:my-8 sm:rounded-lg sm:border sm:p-10 print:my-0 print:max-w-none print:border-0 print:p-0">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <BrandLogo className="mb-3" />
          <h1 className="text-xl font-semibold">{REFERRAL_KIND_LABEL[kind]}</h1>
          <p className="text-sm">
            Para: <span className="font-medium">{destination}</span>
          </p>
          <p className="font-mono text-xs text-muted-foreground">
            Emitida el {issuedAt} · ID {id}
          </p>
        </div>
        <PrintButton />
      </header>

      <p className="rounded-md border border-primary/30 bg-muted p-3 text-sm leading-relaxed">
        El productor revisó estos datos y autorizó compartirlos con {destination} el {issuedAt}. Los números se
        recalcularon en el servidor al emitir la carpeta.
      </p>

      <Section title="Productor y lote" source="Declarado por el productor">
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Productor" value={summary.producer} />
          <Field label="Lote" value={summary.field} />
          <Field label="Etapa" value={summary.stage || 'No informada'} />
        </dl>
      </Section>

      <Section title="Semáforo general" source="Motor de reglas de MiCampo">
        <p className={`text-lg font-semibold ${LEVEL_TEXT[summary.level]}`}>{LEVEL_LABEL[summary.level]}</p>
        <Reasons items={summary.levelReasons} />
      </Section>

      <Section title="Producción y cobertura" source="Calculado · rinde de referencia supuesto">
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Producción probable" value={formatTons(production.expectedT)} />
          <Field label="Escenario pesimista" value={formatTons(production.pessimisticT)} />
          <Field label="Escenario optimista" value={formatTons(production.optimisticT)} />
          <Field label="Ya vendido" value={formatTons(production.soldT)} />
          <Field label="Cobertura" value={formatPct(production.coverage)} />
          <Field label="Cobertura pesimista" value={formatPct(production.pessimisticCoverage)} />
          <Field label="NDVI vs. histórico" value={formatPct(production.weightedAnomaly)} />
        </dl>
      </Section>

      <Section title="Contratos de venta" source="Declarados por el productor">
        {contracts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin contratos registrados.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="py-1 font-normal">Entrega</th>
                <th className="py-1 text-right font-normal">Toneladas</th>
                <th className="py-1 text-right font-normal">Precio</th>
                <th className="py-1 text-right font-normal">Total</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((contract, index) => (
                <tr key={`${contract.delivery}-${index}`} className="border-b last:border-0">
                  <td className="py-1.5">{contract.delivery}</td>
                  <td className="py-1.5 text-right font-mono">{formatTons(contract.tons)}</td>
                  <td className="py-1.5 text-right font-mono">{formatUsd(contract.priceUsdT)}/t</td>
                  <td className="py-1.5 text-right font-mono">{formatUsd(contract.tons * contract.priceUsdT)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          Pizarra de referencia usada en el cálculo: {formatUsd(summary.boardPrice)}/t (cargada a mano).
        </p>
      </Section>

      {isFinancing ? (
        <Section title="Capacidad de financiación" source="Motor de reglas de MiCampo">
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Field label="Valor pesimista" value={formatUsd(financing.pessimisticValueUsd)} />
            <Field label="Compromisos" value={formatUsd(financing.commitmentsUsd)} />
            <Field label="Margen" value={formatUsd(financing.marginUsd)} />
            <Field
              label="Riesgo de entrega"
              value={LEVEL_LABEL[financing.level]}
              className={`text-sm font-medium ${LEVEL_TEXT[financing.level]}`}
            />
          </dl>
          <Reasons items={financing.reasons} />
        </Section>
      ) : (
        <Section title="Exposición climática" source="Pronóstico real · NDVI ilustrativo">
          <dl className="grid grid-cols-2 gap-3">
            <Field
              label="Exposición"
              value={LEVEL_LABEL[insurance.exposure]}
              className={`text-sm font-medium ${LEVEL_TEXT[insurance.exposure]}`}
            />
            <Field label="Lluvia pronosticada (14 días)" value={`${insurance.rainNext14dMm} mm`} />
          </dl>
          <Reasons items={insurance.reasons} />
        </Section>
      )}

      {zones.length > 0 && (
        <Section title="Zonas del lote" source="NDVI ilustrativo">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="py-1 font-normal">Zona</th>
                <th className="py-1 text-right font-normal">Hectáreas</th>
                <th className="py-1 text-right font-normal">NDVI actual</th>
                <th className="py-1 text-right font-normal">NDVI histórico</th>
                <th className="py-1 text-right font-normal">vs. histórico</th>
                <th className="py-1 text-right font-normal">Recorrer</th>
              </tr>
            </thead>
            <tbody>
              {zones.map((zone) => (
                <tr key={zone.id} className="border-b last:border-0">
                  <td className="py-1.5">{zone.name}</td>
                  <td className="py-1.5 text-right font-mono">{zone.hectares}</td>
                  <td className="py-1.5 text-right font-mono">{zone.ndviCurrent.toFixed(2)}</td>
                  <td className="py-1.5 text-right font-mono">{zone.ndviBaseline.toFixed(2)}</td>
                  <td className="py-1.5 text-right font-mono">{formatPct(zone.anomaly)}</td>
                  <td className={`py-1.5 text-right ${zone.inspect ? LEVEL_TEXT.yellow : 'text-muted-foreground'}`}>
                    {zone.inspect ? 'Sí' : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {bcra && (
        <Section title="Central de Deudores del BCRA" source="Real · consultado con consentimiento">
          {bcra.status === 'ok' ? (
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Field label="Período" value={bcra.period} />
              <Field label="Entidades informantes" value={String(bcra.entities)} />
              <Field label="Peor situación" value={`${bcra.worstSituation} de 6`} />
              <Field label="Deuda informada" value={formatArs(bcra.totalAmountThousandsArs * 1000)} />
            </dl>
          ) : (
            <p className="text-sm">
              {bcra.status === 'no_debts'
                ? 'Sin deudas informadas en la Central de Deudores.'
                : 'No se pudo consultar la Central de Deudores al emitir esta carpeta.'}
            </p>
          )}
        </Section>
      )}

      <Section title="Origen de los datos" source="Qué es real y qué es ilustrativo">
        <Reasons
          items={[
            `Pronóstico y ventanas de trabajo: real (${summary.weatherSource}).`,
            'Localidad del lote: geocodificación real de Open-Meteo.',
            'NDVI por zona: ilustrativo, precargado en el caso de demostración.',
            'Precio de pizarra: cargado a mano. Verificar contra la Bolsa de Comercio de Rosario.',
            'Rinde de referencia: supuesto, hasta integrar los rindes del MAGyP por departamento.',
            'Hectáreas, etapa y contratos: declarados por el productor, sin verificar contra terceros.',
            ...(bcra ? ['Deudas: dato real de la API pública de la Central de Deudores del BCRA.'] : []),
          ]}
        />
      </Section>

      <footer className="border-t pt-4 text-xs leading-relaxed text-muted-foreground">
        MiCampo explica lo que dicen los datos: no contrata, no vende y no recomienda operaciones concretas. Esta
        carpeta no es una cotización de seguro ni una aprobación de crédito; la decisión es de la entidad receptora.
        No constituye asesoramiento financiero.
      </footer>
    </main>
  )
}

function Section({ title, source, children }: { title: string; source: string; children: React.ReactNode }) {
  return (
    <section className="break-inside-avoid border-t pt-4">
      <header className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-sm font-semibold tracking-wide uppercase">{title}</h2>
        <span className="font-mono text-[0.65rem] tracking-wide text-muted-foreground uppercase">{source}</span>
      </header>
      {children}
    </section>
  )
}

function Field({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={className ?? 'font-mono text-sm'}>{value}</dd>
    </div>
  )
}

function Reasons({ items }: { items: string[] }) {
  return (
    <ul className="mt-2 flex flex-col gap-1 text-sm">
      {items.map((item, index) => (
        <li key={`${index}-${item}`} className="flex gap-2">
          <span aria-hidden="true" className="text-muted-foreground">
            ·
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}
