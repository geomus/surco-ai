import { RULES } from '@/config/rules'
import type { FarmProfile } from '@/lib/profile'
import type { FieldTask, Level, SaleSignal, Signals, TaskDay } from '@/lib/types'
import type { Weather } from '@/lib/weather'

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const round = (value: number, decimals = 0) => Math.round(value * 10 ** decimals) / 10 ** decimals
const pct = (value: number) => Math.round(value * 100)

export type Scenario = {
  extraSoldTons?: number
  extraRainMm?: number
  yieldDropPct?: number
}

function blockingReason(task: FieldTask, wind: number, temp: number, humidity: number, rain: number) {
  if (task === 'spray') {
    const r = RULES.spray
    if (rain > r.maxRainMmPerHour) return 'lluvia'
    if (wind > r.maxWindKmh) return 'viento fuerte'
    if (wind < r.minWindKmh) return 'calma (riesgo de inversión térmica)'
    if (temp > r.maxTemperatureC) return 'temperatura alta'
    if (humidity < r.minHumidityPct) return 'humedad baja'
    return null
  }
  const r = RULES.harvest
  if (rain > 0) return 'lluvia'
  if (wind > r.maxWindKmh) return 'viento fuerte'
  if (humidity > r.maxHumidityPct) return 'humedad alta'
  return null
}

export function taskWindows(weather: Weather, task: FieldTask): TaskDay[] {
  const r = task === 'spray' ? RULES.spray : RULES.harvest
  const days = new Map<string, { index: number; hour: number }[]>()
  weather.hourly.time.forEach((time, index) => {
    const [date, hh] = time.split('T')
    if (!days.has(date)) days.set(date, [])
    days.get(date)!.push({ index, hour: Number(hh.slice(0, 2)) })
  })

  return [...days.entries()].slice(0, RULES.forecastDays).map(([date, hours]) => {
    const h = weather.hourly
    let streak = 0
    let bestStreak = 0
    let maxWind = 0
    let dayRain = 0
    const reasons = new Map<string, number>()

    for (const { index, hour } of hours) {
      dayRain += h.precipitation[index] ?? 0
      if (hour < r.startHour || hour >= r.endHour) continue
      maxWind = Math.max(maxWind, h.wind_speed_10m[index])
      const reason = blockingReason(
        task,
        h.wind_speed_10m[index],
        h.temperature_2m[index],
        h.relative_humidity_2m[index],
        h.precipitation[index] ?? 0,
      )
      if (reason) {
        reasons.set(reason, (reasons.get(reason) ?? 0) + 1)
        streak = 0
      } else {
        streak += 1
        bestStreak = Math.max(bestStreak, streak)
      }
    }

    const rainBlocks = task === 'harvest' && dayRain > RULES.harvest.maxRainMmPerDay
    const suitable = bestStreak >= r.minConsecutiveHours && !rainBlocks
    const mainReason = [...reasons.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]

    return {
      date,
      suitable,
      suitableHours: bestStreak,
      reason: suitable
        ? `${bestStreak} h seguidas en condiciones`
        : rainBlocks
          ? 'lluvia en el día'
          : (mainReason ?? 'sin bloque suficiente'),
      maxWindKmh: round(maxWind),
      rainMm: round(dayRain, 1),
    }
  })
}

function raise(current: Level, to: Level): Level {
  const order: Level[] = ['green', 'yellow', 'red']
  return order.indexOf(to) > order.indexOf(current) ? to : current
}

export function computeSignals(
  profile: FarmProfile,
  weather: Weather,
  boardPrice: number,
  task: FieldTask = 'spray',
  scenario: Scenario = {},
): Signals {
  const zones = profile.zones.map((zone) => {
    const anomaly = round(zone.ndviCurrent / zone.ndviBaseline, 2)
    return { ...zone, anomaly, inspect: anomaly < RULES.ndvi.inspectThreshold }
  })

  const totalHa = zones.reduce((sum, z) => sum + z.hectares, 0) || profile.hectares
  const weightedAnomaly = round(zones.reduce((sum, z) => sum + z.anomaly * z.hectares, 0) / totalHa || 1, 2)

  const rain14d = round(
    weather.daily.precipitation_sum.reduce((sum, v) => sum + (v ?? 0), 0) + (scenario.extraRainMm ?? 0),
    1,
  )
  const dropFactor = 1 - (scenario.yieldDropPct ?? 0) / 100
  const harvestRainFactor = (scenario.extraRainMm ?? 0) > 100 ? 0.92 : 1

  const expectedT = round(
    profile.hectares *
      profile.referenceYieldTHa *
      clamp(weightedAnomaly, RULES.ndvi.minAnomaly, RULES.ndvi.maxAnomaly) *
      dropFactor *
      harvestRainFactor,
  )
  const pessimisticT = round(expectedT * (1 - RULES.ndvi.uncertainty))
  const optimisticT = round(expectedT * (1 + RULES.ndvi.uncertainty))
  const contractTons = profile.contracts.reduce((sum, c) => sum + c.tons, 0)
  const soldT = contractTons + (scenario.extraSoldTons ?? 0)
  const coverage = expectedT > 0 ? round(soldT / expectedT, 2) : 0
  const pessimisticCoverage = pessimisticT > 0 ? round(soldT / pessimisticT, 2) : 0

  const commitmentsUsd = round(profile.contracts.reduce((sum, c) => sum + c.tons * c.priceUsdT, 0))
  const averageContractPrice = contractTons ? round(commitmentsUsd / contractTons) : 0
  const priceAlert =
    averageContractPrice > 0 && boardPrice > averageContractPrice * (1 + RULES.price.alertAboveContract)

  let saleSignal: SaleSignal = 'stagger'
  let saleExplanation = 'Cobertura moderada: conviene escalonar ventas chicas en lugar de una grande.'
  if (coverage >= RULES.coverage.red) {
    saleSignal = 'stop_selling'
    saleExplanation = `Ya comprometiste el ${pct(coverage)}% de lo que probablemente coseches. Vender más te expone a no poder entregar.`
  } else if (coverage < RULES.coverage.yellow && boardPrice >= averageContractPrice) {
    saleSignal = 'price_part'
    saleExplanation = `Tenés margen (cobertura ${pct(coverage)}%) y la pizarra está igual o por encima de tus contratos: podrías fijar una parte.`
  }

  const insuranceReasons: string[] = []
  let exposure: Level = 'green'
  if (profile.recentHail) {
    exposure = 'red'
    insuranceReasons.push(profile.eventNote ?? 'Granizo reciente en la zona')
  }
  if (rain14d >= RULES.insurance.highRainMm14d) {
    exposure = 'red'
    insuranceReasons.push(`${rain14d} mm pronosticados en 14 días (exceso hídrico, año Niño)`)
  } else if (rain14d >= RULES.insurance.mediumRainMm14d) {
    exposure = raise(exposure, 'yellow')
    insuranceReasons.push(`${rain14d} mm pronosticados en 14 días`)
  }
  if (zones.some((z) => z.inspect)) {
    exposure = raise(exposure, 'yellow')
    insuranceReasons.push('Zonas con vegetación por debajo de su historial')
  }
  if (profile.eventNote && !profile.recentHail) insuranceReasons.push(profile.eventNote)
  if (insuranceReasons.length === 0) insuranceReasons.push('Sin eventos ni pronóstico adverso relevante')

  const pessimisticValueUsd = round(pessimisticT * boardPrice)
  const financingReasons: string[] = []
  let financingLevel: Level = 'green'
  if (pessimisticCoverage > 1) {
    financingLevel = 'red'
    financingReasons.push('En el escenario pesimista no alcanza para entregar lo vendido')
  } else if (pessimisticCoverage > RULES.coverage.red) {
    financingLevel = 'yellow'
    financingReasons.push('Margen de entrega ajustado en el escenario pesimista')
  } else {
    financingReasons.push('La producción pesimista cubre los compromisos con margen')
  }
  if (exposure === 'red') {
    financingLevel = raise(financingLevel, 'yellow')
    financingReasons.push('Exposición climática alta: conviene seguro o warrant como garantía')
  }

  const levelReasons: string[] = []
  let level: Level = 'green'
  if (coverage > RULES.coverage.red) {
    level = 'red'
    levelReasons.push(`Cobertura ${pct(coverage)}% (umbral rojo ${pct(RULES.coverage.red)}%)`)
  } else if (coverage >= RULES.coverage.yellow) {
    level = 'yellow'
    levelReasons.push(`Cobertura ${pct(coverage)}% (umbral amarillo ${pct(RULES.coverage.yellow)}%)`)
  }
  if (exposure === 'red') {
    level = raise(level, 'yellow')
    levelReasons.push('Exposición climática alta')
  }
  if (priceAlert) {
    level = raise(level, 'yellow')
    levelReasons.push(`El mercado supera tus contratos en más de ${pct(RULES.price.alertAboveContract)}%`)
  }
  if (levelReasons.length === 0) levelReasons.push('Cobertura holgada y sin alertas')

  return {
    level,
    levelReasons,
    windows: {
      task,
      days: taskWindows(weather, task),
      source: { origin: weather.origin, date: weather.date },
    },
    zones,
    production: { weightedAnomaly, expectedT, pessimisticT, optimisticT, soldT, coverage, pessimisticCoverage },
    sale: { boardPrice, averageContractPrice, priceAlert, signal: saleSignal, explanation: saleExplanation },
    insurance: { exposure, rainNext14dMm: rain14d, reasons: insuranceReasons },
    financing: {
      level: financingLevel,
      pessimisticValueUsd,
      commitmentsUsd,
      marginUsd: pessimisticValueUsd - commitmentsUsd,
      reasons: financingReasons,
    },
  }
}
