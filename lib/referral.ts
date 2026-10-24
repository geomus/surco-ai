import type { BcraSummary } from '@/lib/bcra'
import type { FarmProfile } from '@/lib/profile'
import type { Signals } from '@/lib/types'

export type ReferralKind = 'financing' | 'insurance'

export const REFERRAL_DESTINATIONS: Record<ReferralKind, string> = {
  financing: 'fyo (financiación contra cosecha)',
  insurance: 'Aseguradora, vía productor asesor de seguros matriculado',
}

export const REFERRAL_KIND_LABEL: Record<ReferralKind, string> = {
  financing: 'Carpeta de financiación',
  insurance: 'Solicitud de seguro',
}

export type ReferralSummary = {
  producer: string
  field: string
  stage: string
  weatherSource: string
  boardPrice: number
  contracts: FarmProfile['contracts']
  production: Signals['production']
  insurance: Signals['insurance']
  financing: Signals['financing']
  zones: Signals['zones']
  level: Signals['level']
  levelReasons: string[]
  bcra: BcraSummary | null
}

export type StoredReferral = {
  id: string
  case_id: string
  kind: ReferralKind
  destination: string
  summary: ReferralSummary
  created_at: string
}
