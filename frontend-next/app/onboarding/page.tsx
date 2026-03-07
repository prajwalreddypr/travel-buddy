
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { COUNTRIES } from '@/lib/countries'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Slider } from '@/components/ui/slider'

// ── Step indicators ────────────────────────────────────────────────────────────

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex gap-2 justify-center mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-2 rounded-full transition-all duration-300 ${
            i === current ? 'w-8 bg-blue-600' : i < current ? 'w-2 bg-blue-300' : 'w-2 bg-gray-200'
          }`}
        />
      ))}
    </div>
  )
}

// ── Searchable country picker ─────────────────────────────────────────────────

function CountryPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (name: string) => void
}) {
  const [query, setQuery] = useState(value)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const filtered = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 8)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function select(name: string) {
    setQuery(name)
    onChange(name)
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <Input
        placeholder="Search country…"
        value={query}
        onChange={e => {
          setQuery(e.target.value)
          onChange('')
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        className="text-base"
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
          {filtered.map(c => (
            <li
              key={c.code}
              className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-blue-50 text-sm"
              onMouseDown={() => select(c.name)}
            >
              <span className="text-xl">{c.flag}</span>
              <span>{c.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ── Visa checkbox card ────────────────────────────────────────────────────────

function VisaCard({
  label,
  description,
  checked,
  onToggle,
}: {
  label: string
  description: string
  checked: boolean
  onToggle: (v: boolean) => void
}) {
  return (
    <label
      className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
        checked ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <Checkbox
        checked={checked}
        onCheckedChange={onToggle}
        className="mt-0.5"
      />
      <div>
        <div className="font-medium text-sm">{label}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{description}</div>
      </div>
    </label>
  )
}

// ── Style option card ─────────────────────────────────────────────────────────

function StyleCard({
  emoji,
  label,
  description,
  selected,
  onClick,
}: {
  emoji: string
  label: string
  description: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-2 p-5 rounded-xl border-2 transition-all text-center ${
        selected
          ? 'border-blue-500 bg-blue-50 shadow-sm'
          : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <span className="text-3xl">{emoji}</span>
      <div className="font-semibold text-sm">{label}</div>
      <div className="text-xs text-muted-foreground leading-snug">{description}</div>
    </button>
  )
}

// ── Main onboarding page ──────────────────────────────────────────────────────

interface FormState {
  passport_nationality: string
  home_city: string
  has_schengen_visa: boolean
  has_us_visa: boolean
  has_uk_visa: boolean
  has_uae_visa: boolean
  travel_style: 'budget' | 'mid' | 'luxury' | ''
  budget_eur: number
  group_type: 'solo' | 'couple' | 'family' | ''
}

const INITIAL: FormState = {
  passport_nationality: '',
  home_city: '',
  has_schengen_visa: false,
  has_us_visa: false,
  has_uk_visa: false,
  has_uae_visa: false,
  travel_style: '',
  budget_eur: 1000,
  group_type: '',
}

export default function OnboardingPage() {
  const router = useRouter()
  const { user, loading, refresh } = useAuth()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<FormState>(INITIAL)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!loading && !user) router.replace('/login')
  }, [loading, user, router])

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function canProceed(): boolean {
    if (step === 0) return form.passport_nationality.trim().length > 0
    if (step === 1) return form.home_city.trim().length > 0
    if (step === 2) return form.travel_style !== '' && form.group_type !== ''
    return true
  }

  async function handleFinish() {
    setSaving(true)
    setError('')
    try {
      await api.patch('/v1/auth/me', {
        passport_nationality: form.passport_nationality,
        home_city: form.home_city,
        has_schengen_visa: form.has_schengen_visa,
        has_us_visa: form.has_us_visa,
        travel_style: form.travel_style,
        budget_eur: form.budget_eur,
      })
      await refresh()
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save. Please try again.')
      setSaving(false)
    }
  }

  if (loading) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-3xl font-bold mb-1">✈️ Travel Buddy</div>
          <p className="text-muted-foreground text-sm">
            Let&apos;s personalise your experience — takes 60 seconds
          </p>
        </div>

        <StepDots current={step} total={3} />

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">

          {/* ── STEP 0: Passport ─────────────────────────────── */}
          {step === 0 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold">What passport do you travel on?</h2>
                <p className="text-muted-foreground text-sm mt-1">
                  This helps us filter destinations you can actually visit without a full visa application.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Passport nationality</Label>
                <CountryPicker
                  value={form.passport_nationality}
                  onChange={v => set('passport_nationality', v)}
                />
              </div>

              {form.passport_nationality && (
                <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                  <span className="text-2xl">
                    {COUNTRIES.find(c => c.name === form.passport_nationality)?.flag ?? '🌍'}
                  </span>
                  <div className="text-sm">
                    <span className="font-medium">{form.passport_nationality}</span> passport selected
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 1: Home city + Visas ────────────────────── */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold">Where do you fly from?</h2>
                <p className="text-muted-foreground text-sm mt-1">
                  Your home city is used to estimate flight costs and find the cheapest destinations from your airport.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="home-city">Home city</Label>
                <Input
                  id="home-city"
                  placeholder="e.g. Amsterdam, Mumbai, Dubai…"
                  value={form.home_city}
                  onChange={e => set('home_city', e.target.value)}
                  className="text-base"
                />
              </div>

              <div className="space-y-3">
                <Label>Do you already hold any of these visas?</Label>
                <p className="text-xs text-muted-foreground -mt-1">
                  Having these opens up many more destinations without extra paperwork.
                </p>
                <VisaCard
                  label="Schengen visa (valid)"
                  description="Covers 27 European countries — Germany, France, Italy, Spain and more"
                  checked={form.has_schengen_visa}
                  onToggle={v => set('has_schengen_visa', !!v)}
                />
                <VisaCard
                  label="US visa (valid)"
                  description="Unlocks US entry and helps with transit through the US"
                  checked={form.has_us_visa}
                  onToggle={v => set('has_us_visa', !!v)}
                />
                <VisaCard
                  label="UK visa (valid)"
                  description="Covers England, Scotland, Wales and Northern Ireland"
                  checked={form.has_uk_visa}
                  onToggle={v => set('has_uk_visa', !!v)}
                />
                <VisaCard
                  label="UAE visa (valid)"
                  description="Dubai, Abu Dhabi — also useful as a hub for layovers"
                  checked={form.has_uae_visa}
                  onToggle={v => set('has_uae_visa', !!v)}
                />
              </div>
            </div>
          )}

          {/* ── STEP 2: Travel style + budget ───────────────── */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold">How do you like to travel?</h2>
                <p className="text-muted-foreground text-sm mt-1">
                  We&apos;ll use this to calibrate destination costs and itinerary suggestions.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Usually travelling as</Label>
                <div className="grid grid-cols-3 gap-3">
                  {(
                    [
                      { val: 'solo', emoji: '🧳', label: 'Solo', desc: 'Just me' },
                      { val: 'couple', emoji: '💑', label: 'Couple', desc: 'Me + 1' },
                      { val: 'family', emoji: '👨‍👩‍👧', label: 'Family / Group', desc: '3 or more' },
                    ] as const
                  ).map(o => (
                    <StyleCard
                      key={o.val}
                      emoji={o.emoji}
                      label={o.label}
                      description={o.desc}
                      selected={form.group_type === o.val}
                      onClick={() => set('group_type', o.val)}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Travel style</Label>
                <div className="grid grid-cols-3 gap-3">
                  {(
                    [
                      { val: 'budget', emoji: '🎒', label: 'Budget', desc: 'Hostels, street food, local transport' },
                      { val: 'mid', emoji: '🏨', label: 'Mid-range', desc: '3-star hotels, casual dining' },
                      { val: 'luxury', emoji: '✨', label: 'Luxury', desc: '5-star, fine dining, business class' },
                    ] as const
                  ).map(o => (
                    <StyleCard
                      key={o.val}
                      emoji={o.emoji}
                      label={o.label}
                      description={o.desc}
                      selected={form.travel_style === o.val}
                      onClick={() => set('travel_style', o.val)}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label>Max budget per trip</Label>
                  <span className="text-lg font-bold text-blue-600">€{form.budget_eur.toLocaleString()}</span>
                </div>
                <Slider
                  min={200}
                  max={10000}
                  step={100}
                  value={[form.budget_eur]}
                  onValueChange={([v]) => set('budget_eur', v)}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>€200</span>
                  <span>€10,000+</span>
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded px-3 py-2 mt-4">
              {error}
            </p>
          )}

          {/* Navigation */}
          <div className="flex justify-between items-center mt-8">
            {step > 0 ? (
              <Button variant="ghost" onClick={() => setStep(s => s - 1)}>
                ← Back
              </Button>
            ) : (
              <div />
            )}

            {step < 2 ? (
              <Button
                onClick={() => setStep(s => s + 1)}
                disabled={!canProceed()}
              >
                Continue →
              </Button>
            ) : (
              <Button
                onClick={handleFinish}
                disabled={saving || !canProceed()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {saving ? 'Saving…' : "Let's go! 🚀"}
              </Button>
            )}
          </div>

          {/* Skip */}
          <p className="text-center text-xs text-muted-foreground mt-4">
            <button
              type="button"
              className="hover:underline"
              onClick={() => router.push('/dashboard')}
            >
              Skip for now — I&apos;ll set this up later
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
