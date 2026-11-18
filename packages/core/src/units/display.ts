import { ML_PER_TSP, UNITS } from './tables'
import type { DisplayPrefs, FormattedQuantity, Quantity, UnitSystem } from './types'

const FRACTIONS: Array<[number, string]> = [
  [0, ''],
  [1 / 8, '⅛'],
  [1 / 4, '¼'],
  [1 / 3, '⅓'],
  [1 / 2, '½'],
  [2 / 3, '⅔'],
  [3 / 4, '¾'],
  [1, ''],
]

/** Round to the nearest kitchen fraction (⅛ ¼ ⅓ ½ ⅔ ¾). Returns the rounded value and its text. */
export function roundToFraction(x: number): { value: number; text: string } {
  const whole = Math.floor(x)
  const frac = x - whole
  let best = FRACTIONS[0]!
  let bestD = Infinity
  for (const f of FRACTIONS) {
    const d = Math.abs(f[0] - frac)
    if (d < bestD) {
      best = f
      bestD = d
    }
  }
  const value = whole + best[0]
  const w = Math.floor(value + 1e-9)
  const fracText = best[0] === 1 || best[0] === 0 ? '' : best[1]
  const text = w === 0 && fracText ? fracText : `${w}${fracText}`
  return { value, text }
}

function trimNumber(x: number, dp: number): string {
  return String(Number(x.toFixed(dp)))
}

function plural(label: string, value: number): string {
  if (value <= 1) return label
  return label === 'fl oz' ||
    label === 'oz' ||
    label === 'lb' ||
    label === 'tsp' ||
    label === 'tbsp'
    ? label
    : `${label}s`
}

function make(text: string, amount: number, unit: string, approx: boolean): FormattedQuantity {
  return { text: `${approx ? '~' : ''}${text}`, amount, unit, approx }
}

function fmtMetricWeight(g: number, approx: boolean): FormattedQuantity {
  let r: number
  if (g < 5) r = Math.round(g * 2) / 2
  else if (g < 20) r = Math.round(g)
  else r = Math.round(g / 5) * 5
  if (r >= 1000) {
    const kg = Math.round((g / 1000) * 100) / 100
    return make(`${trimNumber(kg, 2)} kg`, kg, 'kg', approx)
  }
  return make(`${trimNumber(r, 1)} g`, r, 'g', approx)
}

/** Teaspoons and tablespoons, used in metric kitchens too. Null at 4 tbsp (¼ cup, 60 ml) and above. */
function fmtSpoons(ml: number, approx: boolean): FormattedQuantity | null {
  const tsp = ml / ML_PER_TSP
  if (tsp < 3) {
    const f = roundToFraction(tsp)
    if (f.value === 0) return make('a pinch', 0, 'pinch', approx)
    if (f.value < 3) return make(`${f.text} tsp`, f.value, 'tsp', approx)
  }
  if (tsp < 12) {
    const f = roundToFraction(tsp / 3)
    if (f.value < 4) return make(`${f.text} tbsp`, f.value, 'tbsp', approx)
  }
  return null
}

function fmtMetricVolume(ml: number, approx: boolean): FormattedQuantity {
  const spoons = fmtSpoons(ml, approx)
  if (spoons) return spoons
  const r = Math.round(ml / 5) * 5
  if (r >= 1000) {
    const l = Math.round((ml / 1000) * 100) / 100
    return make(`${trimNumber(l, 2)} l`, l, 'l', approx)
  }
  return make(`${trimNumber(r, 1)} ml`, r, 'ml', approx)
}

function fmtUsWeight(g: number, approx: boolean): FormattedQuantity {
  const oz = g / UNITS.oz!.factor
  if (oz < 0.125) return fmtMetricWeight(g, approx)
  if (oz >= 16) {
    const f = roundToFraction(oz / 16)
    return make(`${f.text} lb`, f.value, 'lb', approx)
  }
  const f = roundToFraction(oz)
  if (f.value >= 16) return make('1 lb', 1, 'lb', approx)
  return make(`${f.text} oz`, f.value, 'oz', approx)
}

function fmtUsVolume(ml: number, approx: boolean): FormattedQuantity {
  const spoons = fmtSpoons(ml, approx)
  if (spoons) return spoons
  const tsp = ml / ML_PER_TSP
  const cups = tsp / 48
  if (cups >= 4) {
    const q = cups / 4
    if (Math.abs(q - Math.round(q * 2) / 2) < 0.02) {
      const f = roundToFraction(q)
      return make(`${f.text} ${plural('quart', f.value)}`, f.value, 'quart', approx)
    }
  }
  const f = roundToFraction(cups)
  return make(`${f.text} ${plural('cup', f.value)}`, f.value, 'cup', approx)
}

function fmtCount(n: number, approx: boolean): FormattedQuantity {
  const f = roundToFraction(n)
  return make(f.text === '' ? '0' : f.text, f.value, '', approx)
}

/** Format a canonical quantity for a unit system (no category overrides, no density). */
export function formatInSystem(q: Quantity, system: UnitSystem): FormattedQuantity {
  if (q.unit === 'piece') return fmtCount(q.amount, q.approx)
  if (q.unit === 'g')
    return system === 'metric'
      ? fmtMetricWeight(q.amount, q.approx)
      : fmtUsWeight(q.amount, q.approx)
  return system === 'metric' ? fmtMetricVolume(q.amount, q.approx) : fmtUsVolume(q.amount, q.approx)
}

/**
 * Solid fats (butter, margarine) are measured by weight or by the spoon, never in ml. g/ml when the catalog has
 * none: the kitchen convention for butter (1 cup = 227 g, a stick = 113 g).
 */
const FAT_DENSITY = 0.959

/**
 * Format a quantity for display per the user's preference: a system plus per-category overrides
 * (flour/sugar in grams, liquids in cups). `density` (g/ml) lets an override show weight as volume or vice
 * versa; such results are marked approximate ("~"). Without an override, the `fat` category shows metric
 * volumes of ¼ cup and more in grams.
 */
export function formatQuantity(
  q: Quantity,
  prefs: DisplayPrefs,
  opts: { category?: string; density?: number | null } = {},
): FormattedQuantity {
  const ov = opts.category ? prefs.overrides?.[opts.category] : undefined
  const system = ov?.system ?? prefs.system
  let cur = q
  if (ov?.dimension && q.unit !== 'piece' && opts.density && opts.density > 0) {
    if (ov.dimension === 'weight' && q.unit === 'ml')
      cur = { amount: q.amount * opts.density, unit: 'g', approx: true }
    else if (ov.dimension === 'volume' && q.unit === 'g')
      cur = { amount: q.amount / opts.density, unit: 'ml', approx: true }
  } else if (
    !ov?.dimension &&
    opts.category === 'fat' &&
    system === 'metric' &&
    q.unit === 'ml' &&
    !fmtSpoons(q.amount, q.approx)
  ) {
    const density = opts.density && opts.density > 0 ? opts.density : FAT_DENSITY
    cur = { amount: q.amount * density, unit: 'g', approx: true }
  }
  return formatInSystem(cur, system)
}

const TEMP_RE =
  /(-?\d+(?:\.\d+)?)(?:\s*(?:-|–|to)\s*(\d+(?:\.\d+)?))?(?:\s*°\s*|\s*degrees?\s+)(C|F|Celsius|Fahrenheit)\b/gi

/**
 * Rewrite oven and oil temperatures in free text ("350°F", "175-180 °C", "400 degrees F") into the given system. Celsius is
 * rounded to 5 degrees, Fahrenheit to 25 above 200 °F (oven dials) and to 5 below.
 */
export function convertTemperatures(text: string, system: UnitSystem): string {
  const target = system === 'metric' ? 'C' : 'F'
  const conv = (n: number) => {
    if (target === 'C') return Math.round(((n - 32) * 5) / 9 / 5) * 5
    const f = (n * 9) / 5 + 32
    return f > 200 ? Math.round(f / 25) * 25 : Math.round(f / 5) * 5
  }
  return text.replace(TEMP_RE, (m, a: string, b: string | undefined, unit: string) => {
    if (unit[0]!.toUpperCase() === target) return m
    const lo = conv(Number(a))
    return `${lo}${b !== undefined ? `–${conv(Number(b))}` : ''}°${target}`
  })
}
