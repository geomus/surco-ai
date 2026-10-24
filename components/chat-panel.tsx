'use client'

import { ArrowUp, Square } from 'lucide-react'
import { useState } from 'react'
import type { CaseId } from '@/components/farm-workspace'
import { ReferralCard } from '@/components/referral-card'
import { Button } from '@/components/ui/button'
import type { FarmAgentMessage } from '@/lib/agent'
import type { FarmProfile } from '@/lib/profile'
import { cn } from '@/lib/utils'

const TOOL_LABELS: Record<string, string> = {
  'tool-updateProfile': 'Actualizó el legajo',
  'tool-fieldWindows': 'Revisó el pronóstico hora por hora',
  'tool-zonesToInspect': 'Comparó el NDVI de cada zona',
  'tool-coverageAndSale': 'Calculó cobertura y venta',
  'tool-insuranceExposure': 'Evaluó exposición climática',
  'tool-dailyCheck': 'Hizo el chequeo de mañana',
  'tool-prepareReferral': 'Armó la carpeta',
}

const SCRATCH_SUGGESTIONS = [
  'Tengo 150 ha de trigo en Ataliva, Santa Fe, en llenado de grano. Vendí 360 t a 190 USD para diciembre y el jueves 22 me cayó granizo.',
  'Soy de Pergamino y tengo 120 ha de trigo',
]

const CASE_SUGGESTIONS = [
  '¿Puedo pulverizar mañana?',
  '¿Me conviene vender más?',
  '¿Y si llueve 200 mm en noviembre?',
  '¿Qué zonas tengo que recorrer?',
  'Armame la carpeta para pedir financiación a fyo',
]

type ChatPanelProps = {
  caseId: CaseId
  profile: FarmProfile
  boardPrice: number
  messages: FarmAgentMessage[]
  busy: boolean
  error: Error | undefined
  onAsk: (text: string) => void
  onStop: () => void
}

export function ChatPanel({ caseId, profile, boardPrice, messages, busy, error, onAsk, onStop }: ChatPanelProps) {
  const [input, setInput] = useState('')

  const submit = () => {
    if (!input.trim() || busy) return
    onAsk(input)
    setInput('')
  }

  return (
    <section
      aria-label="Conversación con MiCampo"
      className="flex min-h-[32rem] flex-col rounded-lg border bg-card lg:sticky lg:top-4 lg:h-[calc(100dvh-8rem)]"
    >
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold">Hablale como a tu agrónomo</h2>
          <p className="text-xs text-muted-foreground">
            {profile.location
              ? `${profile.alias} · ${profile.hectares} ha de ${profile.crop || '…'} · ${profile.location}`
              : 'Legajo vacío: contale tu campo'}
          </p>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4" aria-live="polite">
        {messages.length === 0 ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Contale en tus palabras qué tenés sembrado y qué vendiste. MiCampo cruza clima, satélite y tus contratos y
              te dice qué hacer, con la fuente de cada número.
            </p>
            <div className="flex flex-wrap gap-2">
              {(caseId === 'scratch' ? SCRATCH_SUGGESTIONS : CASE_SUGGESTIONS).map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => onAsk(suggestion)}
                  className="rounded-md border bg-background px-3 py-1.5 text-left text-sm transition-colors hover:border-primary hover:text-primary"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={cn('flex flex-col gap-2', message.role === 'user' ? 'items-end' : 'items-start')}
            >
              {message.parts.map((part, index) => {
                const key = `${message.id}-${index}`
                if (part.type === 'text') {
                  return (
                    <p
                      key={key}
                      className={cn(
                        'max-w-[90%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm leading-relaxed',
                        message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-background',
                      )}
                    >
                      {part.text}
                    </p>
                  )
                }
                if (
                  part.type === 'tool-prepareReferral' &&
                  part.state === 'output-available' &&
                  'requiresConsent' in part.output
                ) {
                  return (
                    <ReferralCard
                      key={key}
                      draft={part.output}
                      caseId={caseId}
                      profile={profile}
                      boardPrice={boardPrice}
                    />
                  )
                }
                if (part.type in TOOL_LABELS && 'state' in part) {
                  const done = part.state === 'output-available'
                  return (
                    <span
                      key={key}
                      className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground"
                    >
                      <span
                        aria-hidden="true"
                        className={cn('size-1.5 rounded-full', done ? 'bg-primary' : 'animate-pulse bg-accent')}
                      />
                      {TOOL_LABELS[part.type]}
                      {done ? '' : '…'}
                    </span>
                  )
                }
                return null
              })}
            </div>
          ))
        )}
        {busy && messages.at(-1)?.role === 'user' && (
          <span className="font-mono text-xs text-muted-foreground">Pensando…</span>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            No pude responder. Probá de nuevo en un momento.
          </p>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
        className="flex items-end gap-2 border-t p-3"
      >
        <label htmlFor="chat-input" className="sr-only">
          Mensaje para MiCampo
        </label>
        <textarea
          id="chat-input"
          rows={2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.nativeEvent.isComposing || e.keyCode === 229) return
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              submit()
            }
          }}
          placeholder="Ej: vendí 100 t más a 200 dólares"
          className="flex-1 resize-none rounded-md border bg-background px-3 py-2 text-sm leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        {busy ? (
          <Button type="button" size="icon" variant="outline" onClick={onStop} aria-label="Detener respuesta">
            <Square className="size-4" />
          </Button>
        ) : (
          <Button type="submit" size="icon" disabled={!input.trim()} aria-label="Enviar mensaje">
            <ArrowUp className="size-4" />
          </Button>
        )}
      </form>
    </section>
  )
}
