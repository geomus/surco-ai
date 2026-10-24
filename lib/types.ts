import type { Zone } from '@/lib/profile'

export type Level = 'green' | 'yellow' | 'red'
export type FieldTask = 'spray' | 'harvest'
export type WeatherSource = 'live' | 'cache'

export type TaskDay = {
  date: string
  suitable: boolean
  suitableHours: number
  reason: string
  maxWindKmh: number
  rainMm: number
}

export type ZoneSignal = Zone & { anomaly: number; inspect: boolean }

export type SaleSignal = 'stop_selling' | 'price_part' | 'stagger'

export type Signals = {
  level: Level
  levelReasons: string[]
  windows: { task: FieldTask; days: TaskDay[]; source: { origin: WeatherSource; date: string } }
  zones: ZoneSignal[]
  production: {
    weightedAnomaly: number
    expectedT: number
    pessimisticT: number
    optimisticT: number
    soldT: number
    coverage: number
    pessimisticCoverage: number
  }
  sale: {
    boardPrice: number
    averageContractPrice: number
    priceAlert: boolean
    signal: SaleSignal
    explanation: string
  }
  insurance: { exposure: Level; rainNext14dMm: number; reasons: string[] }
  financing: {
    level: Level
    pessimisticValueUsd: number
    commitmentsUsd: number
    marginUsd: number
    reasons: string[]
  }
}
