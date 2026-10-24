'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useMemo, useState } from 'react'
import { BrandLogo } from '@/components/brand-logo'
import { ChatPanel } from '@/components/chat-panel'
import { FieldHero } from '@/components/field-hero'
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
      <header className="bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3">
          <BrandLogo tone="light" />

          <div className="flex flex-wrap items-center gap-3">
            <div
              role="radiogroup"
              aria-label="Caso de demostración"
              className="flex flex-wrap rounded-full bg-primary-foreground/10 p-1"
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
                    'rounded-full px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-60',
                    demoCase.id === caseId
                      ? 'bg-card text-primary shadow-sm'
                      : 'text-primary-foreground/75 hover:text-primary-foreground',
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

      <FieldHero />


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
      <span className="text-primary-foreground/75">Pizarra Rosario</span>
      <span className="flex items-center rounded-full bg-card px-3 text-foreground">
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
