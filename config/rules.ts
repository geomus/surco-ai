// Every number the product shows comes from these parameters. They are
// deliberately explicit so an agronomist or fyo's risk team can audit and tune them.
export const RULES = {
  spray: {
    minWindKmh: 3,
    maxWindKmh: 15,
    maxTemperatureC: 28,
    minHumidityPct: 50,
    maxRainMmPerHour: 0,
    startHour: 7,
    endHour: 19,
    minConsecutiveHours: 3,
  },
  harvest: {
    maxWindKmh: 30,
    maxHumidityPct: 75,
    maxRainMmPerDay: 1,
    startHour: 10,
    endHour: 20,
    minConsecutiveHours: 5,
  },
  ndvi: {
    inspectThreshold: 0.9,
    minAnomaly: 0.6,
    maxAnomaly: 1.1,
    uncertainty: 0.15,
  },
  coverage: {
    red: 0.85,
    yellow: 0.6,
  },
  price: {
    alertAboveContract: 0.1,
  },
  insurance: {
    highRainMm14d: 60,
    mediumRainMm14d: 30,
  },
  forecastDays: 7,
} as const

export const DEFAULT_BOARD_PRICE_USD_T = 215
