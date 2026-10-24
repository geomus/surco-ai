'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useMemo, useState } from 'react'
import { ChatPanel } from '@/components/chat-panel'
import { SignalsPanel } from '@/components/signals-panel'
import type { FarmAgentMessage } from '@/lib/agent'
import type { DemoCase } from '@/lib/cases'
import type { FarmProfile } from '@/lib/profile'
import { cn } from '@/lib/utils'

export type CaseId = 'scratch' | 'green' | 'yellow' | 'red'

const transport = new DefaultChatTransport<FarmAgentMessage>({ api: '/api/chat' })

// The server resolves location and zones, so the latest tool output is the source of truth.
function deriveProfile(base: FarmProfile, messages: FarmAgentMessage[]) {
  let profile = base
  for (const message of messages) {
    for (const part of message.parts) {
      if (part.type === 'tool-updateProfile' && part.state === 'output-available') {
        profile = part.output.profile
      }
    }
  }
  return profile
}

export function FarmWorkspace({ cases, defaultBoardPrice }: { cases: DemoCase[]; defaultBoardPrice: number }) {
  const [caseId, setCaseId] = useState<CaseId>('scratch')
  const [boardPrice, setBoardPrice] = useState(defaultBoardPrice)
  const { messages, sendMessage, status, error, stop } = useChat<FarmAgentMessage>({ id: caseId, transport })

  const baseProfile = cases.find((c) => c.id === caseId)!.profile
  const profile = useMemo(() => deriveProfile(baseProfile, messages), [baseProfile, messages])
  const busy = status === 'submitted' || status === 'streaming'

  const ask = (text: string) => {
    if (busy || !text.trim()) return
    sendMessage({ text }, { body: { caseId, profile, boardPrice } })
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-baseline gap-3">
            <span className="text-xl font-bold tracking-tight text-primary">MiCampo</span>
            <span className="hidden text-sm text-muted-foreground sm:inline">El legajo único del productor</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div
              role="radiogroup"
              aria-label="Caso de demostración"
              className="flex flex-wrap rounded-md border bg-background p-0.5"
            >
              {cases.map((demoCase) => (
                <button
                  key={demoCase.id}
                  type="button"
                  role="radio"
                  aria-checked={demoCase.id === caseId}
                  disabled={busy}
                  onClick={() => setCaseId(demoCase.id as CaseId)}
                  className={cn(
                    'rounded px-3 py-1.5 text-sm transition-colors disabled:opacity-60',
                    demoCase.id === caseId
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {demoCase.name}
                </button>
              ))}
            </div>
            <BoardPriceInput key={boardPrice} value={boardPrice} onCommit={setBoardPrice} />
          </div>
        </div>
      </header>

      <p className="border-b bg-muted px-4 py-1.5 text-center text-xs leading-relaxed text-muted-foreground">
        Real: ubicación y pronóstico (Open-Meteo). Ilustrativo: productores, contratos y NDVI precalculado. Precio
        pizarra cargado a mano.
      </p>

      <main className="mx-auto grid w-full max-w-7xl flex-1 gap-4 p-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <ChatPanel
          caseId={caseId}
          profile={profile}
          boardPrice={boardPrice}
          messages={messages}
          busy={busy}
          error={error}
          onAsk={ask}
          onStop={stop}
        />
        <SignalsPanel caseId={caseId} profile={profile} boardPrice={boardPrice} busy={busy} onAsk={ask} />
      </main>
    </div>
  )
}

function BoardPriceInput({ value, onCommit }: { value: number; onCommit: (value: number) => void }) {
  const [draft, setDraft] = useState(String(value))
  const commit = () => {
    const parsed = Number(draft.replace(',', '.'))
    if (parsed > 0 && parsed <= 2000) onCommit(parsed)
    else setDraft(String(value))
  }
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">Pizarra Rosario</span>
      <span className="flex items-center rounded-md border bg-background px-2">
        <span className="font-mono text-xs text-muted-foreground">USD/t</span>
        <input
          inputMode="decimal"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && commit()}
          className="w-14 bg-transparent px-1.5 py-1.5 text-right font-mono outline-none"
          aria-label="Precio pizarra Rosario en USD por tonelada, cargado a mano"
        />
      </span>
    </label>
  )
}
