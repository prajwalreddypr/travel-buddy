import { type VisaType, type Destination } from './destinations'

export interface VisaResult {
  type: VisaType
  label: string
  color: 'green' | 'amber' | 'red' | 'blue' | 'gray'
  note: string
}

/**
 * Resolves the effective visa requirement for a traveller at a specific destination.
 * Takes into account:
 *  - passport nationality (currently optimised for Indian & EU passports)
 *  - existing Schengen visa (unlocks Schengen-area travel for Indian passport)
 *  - existing US visa (unlocks UAE visa-on-arrival, Mexico entry)
 *  - existing UK visa (unlocks UAE visa-on-arrival)
 */
export function resolveVisa(
  passportNationality: string | null | undefined,
  hasSchengenVisa: boolean | null | undefined,
  hasUsVisa: boolean | null | undefined,
  hasUkVisa: boolean | null | undefined,
  destination: Destination,
): VisaResult {
  const isIndian = passportNationality === 'IN' || passportNationality === 'India'
  const isEu = isEuPassport(passportNationality)

  // Pick base visa type for this passport
  let base: VisaType = isIndian
    ? destination.visaForIndianPassport
    : isEu
    ? destination.visaForEuPassport
    : destination.visaForIndianPassport // fallback: use Indian rules for unknown passports

  // ── Special overrides ────────────────────────────────────────────────────

  // Schengen area: if user already holds a valid Schengen visa treat it as accessible
  if (base === 'schengen') {
    if (hasSchengenVisa) {
      return {
        type: 'visa-free',
        label: 'Accessible (Schengen visa)',
        color: 'green',
        note: 'Your existing Schengen visa covers this destination.',
      }
    }
    return {
      type: 'schengen',
      label: 'Schengen visa required',
      color: 'blue',
      note: 'You need a Schengen visa to enter. Apply via the embassy of your primary destination.',
    }
  }

  // UAE: US or UK visa holders get visa-on-arrival
  if (destination.slug === 'dubai' || destination.country === 'United Arab Emirates') {
    if (isIndian && (hasUsVisa || hasUkVisa)) {
      return {
        type: 'visa-on-arrival',
        label: 'Visa on arrival (US/UK visa)',
        color: 'green',
        note: 'Indian passport holders with a valid US or UK visa can get a UAE visa on arrival.',
      }
    }
  }

  // Mexico: US visa holders can enter without separate Mexican visa
  if (destination.slug === 'mexico-city' || destination.country === 'Mexico') {
    if (isIndian && hasUsVisa) {
      return {
        type: 'visa-free',
        label: 'No visa needed (US visa)',
        color: 'green',
        note: 'Indian passport holders with a valid US visa do not need a separate Mexican visa.',
      }
    }
  }

  return visaResultFromType(base, destination.visaNote)
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function visaResultFromType(type: VisaType, customNote?: string): VisaResult {
  switch (type) {
    case 'visa-free':
      return {
        type,
        label: 'Visa free',
        color: 'green',
        note: customNote ?? 'No visa needed — just show up with a valid passport.',
      }
    case 'visa-on-arrival':
      return {
        type,
        label: 'Visa on arrival',
        color: 'green',
        note: customNote ?? 'You can get a visa on arrival at the airport. Bring passport photos and fee (usually USD 25–50).',
      }
    case 'e-visa':
      return {
        type,
        label: 'e-Visa required',
        color: 'amber',
        note: customNote ?? 'Apply online before travel — typically takes 3–7 days and costs USD 20–50.',
      }
    case 'check-required':
      return {
        type,
        label: 'Check requirements',
        color: 'amber',
        note: customNote ?? 'Visa rules for your passport are complex or change frequently. Verify with the official embassy.',
      }
    case 'visa-required':
      return {
        type,
        label: 'Visa required',
        color: 'red',
        note: customNote ?? 'You need to apply for a visa in advance. Check the embassy website for requirements and processing time.',
      }
    case 'schengen':
      return {
        type,
        label: 'Schengen visa required',
        color: 'blue',
        note: customNote ?? 'Apply for a Schengen visa via the embassy of your primary destination country.',
      }
    default:
      return { type, label: 'Unknown', color: 'gray', note: 'Verify entry requirements before travel.' }
  }
}

/** Very small set — extend as needed */
const EU_CODES = new Set([
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR',
  'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK',
  'SI', 'ES', 'SE',
  // Non-EU Schengen members
  'IS', 'LI', 'NO', 'CH',
  // UK (post-Brexit but still visa-free to most)
  'GB',
])

function isEuPassport(code: string | null | undefined): boolean {
  if (!code) return false
  return EU_CODES.has(code.toUpperCase())
}

/** Badge variant helper for UI components */
export function visaColorToVariant(color: VisaResult['color']): string {
  switch (color) {
    case 'green': return 'bg-green-100 text-green-800'
    case 'amber': return 'bg-amber-100 text-amber-800'
    case 'red':   return 'bg-red-100 text-red-800'
    case 'blue':  return 'bg-blue-100 text-blue-800'
    default:      return 'bg-gray-100 text-gray-700'
  }
}
