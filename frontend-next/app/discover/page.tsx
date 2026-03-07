'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { DESTINATIONS, type Region, type TravelStyle, type Tag, type Destination } from '@/lib/destinations'
import { resolveVisa, visaColorToVariant } from '@/lib/visaLogic'

const REGIONS: Region[] = ['Europe', 'Asia', 'Middle East', 'Africa', 'Americas', 'Oceania']
const STYLES: { value: TravelStyle | 'all'; label: string }[] = [
  { value: 'all', label: 'All budgets' },
  { value: 'budget', label: 'Budget' },
  { value: 'mid', label: 'Mid-range' },
  { value: 'luxury', label: 'Luxury' },
]
const VISA_FILTERS = [
  { value: 'all', label: 'Any visa' },
  { value: 'easy', label: 'Easy entry' },   // visa-free + visa-on-arrival + e-visa
  { value: 'visa-free', label: 'Visa free' },
]

export default function DiscoverPage() {
  const { user } = useAuth()

  const [search, setSearch] = useState('')
  const [selectedRegions, setSelectedRegions] = useState<Region[]>([])
  const [style, setStyle] = useState<TravelStyle | 'all'>('all')
  const [visaFilter, setVisaFilter] = useState<'all' | 'easy' | 'visa-free'>('all')
  const [selectedTags, setSelectedTags] = useState<Tag[]>([])
  const [maxBudget, setMaxBudget] = useState<number>(500)
  const [budgetEnabled, setBudgetEnabled] = useState(false)

  const ALL_TAGS: Tag[] = ['beach', 'city', 'culture', 'nature', 'adventure', 'food', 'history', 'nightlife', 'romance', 'family']

  function toggleRegion(r: Region) {
    setSelectedRegions(prev =>
      prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]
    )
  }

  function toggleTag(t: Tag) {
    setSelectedTags(prev =>
      prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]
    )
  }

  const filtered = useMemo(() => {
    return DESTINATIONS.filter(d => {
      // Search
      if (search) {
        const q = search.toLowerCase()
        if (!d.city.toLowerCase().includes(q) && !d.country.toLowerCase().includes(q)) return false
      }
      // Region
      if (selectedRegions.length > 0 && !selectedRegions.includes(d.region)) return false
      // Style
      if (style !== 'all' && d.travelStyle !== style) return false
      // Budget
      if (budgetEnabled && d.avgDailyEur > maxBudget) return false
      // Tags
      if (selectedTags.length > 0 && !selectedTags.some(t => d.tags.includes(t))) return false
      // Visa filter
      if (visaFilter !== 'all') {
        const visa = user
          ? resolveVisa(user.passport_nationality, user.has_schengen_visa, user.has_us_visa, null, d).type
          : d.visaForIndianPassport
        if (visaFilter === 'visa-free' && visa !== 'visa-free') return false
        if (visaFilter === 'easy' && !['visa-free', 'visa-on-arrival', 'e-visa'].includes(visa)) return false
      }
      return true
    })
  }, [search, selectedRegions, style, budgetEnabled, maxBudget, selectedTags, visaFilter, user])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-gray-500 hover:text-gray-800 text-sm">← Dashboard</Link>
            <span className="text-gray-300">|</span>
            <h1 className="font-semibold text-gray-900">Discover destinations</h1>
          </div>
          <span className="text-sm text-gray-500">{filtered.length} destinations</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 flex gap-6">
        {/* ── Sidebar filters ── */}
        <aside className="w-56 flex-shrink-0 space-y-6">
          {/* Search */}
          <div>
            <input
              type="text"
              placeholder="Search city or country…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          {/* Regions */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Region</p>
            <div className="space-y-1">
              {REGIONS.map(r => (
                <label key={r} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 hover:text-gray-900">
                  <input
                    type="checkbox"
                    checked={selectedRegions.includes(r)}
                    onChange={() => toggleRegion(r)}
                    className="accent-indigo-600"
                  />
                  {r}
                </label>
              ))}
            </div>
          </div>

          {/* Visa */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Entry</p>
            <div className="space-y-1">
              {VISA_FILTERS.map(f => (
                <label key={f.value} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                  <input
                    type="radio"
                    name="visa"
                    value={f.value}
                    checked={visaFilter === f.value}
                    onChange={() => setVisaFilter(f.value as typeof visaFilter)}
                    className="accent-indigo-600"
                  />
                  {f.label}
                </label>
              ))}
            </div>
            {!user?.passport_nationality && (
              <p className="text-xs text-amber-600 mt-1">
                <Link href="/onboarding" className="underline">Add your passport</Link> for personalised visa info.
              </p>
            )}
          </div>

          {/* Travel style */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Travel style</p>
            <div className="space-y-1">
              {STYLES.map(s => (
                <label key={s.value} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                  <input
                    type="radio"
                    name="style"
                    value={s.value}
                    checked={style === s.value}
                    onChange={() => setStyle(s.value as typeof style)}
                    className="accent-indigo-600"
                  />
                  {s.label}
                </label>
              ))}
            </div>
          </div>

          {/* Daily budget cap */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 font-medium mb-2">
              <input
                type="checkbox"
                checked={budgetEnabled}
                onChange={e => setBudgetEnabled(e.target.checked)}
                className="accent-indigo-600"
              />
              Max daily budget
            </label>
            {budgetEnabled && (
              <div className="space-y-1">
                <input
                  type="range"
                  min={30}
                  max={500}
                  step={10}
                  value={maxBudget}
                  onChange={e => setMaxBudget(Number(e.target.value))}
                  className="w-full accent-indigo-600"
                />
                <p className="text-xs text-gray-600">Up to €{maxBudget}/day</p>
              </div>
            )}
          </div>

          {/* Tags */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Vibe</p>
            <div className="flex flex-wrap gap-1">
              {ALL_TAGS.map(t => (
                <button
                  key={t}
                  onClick={() => toggleTag(t)}
                  className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                    selectedTags.includes(t)
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Clear all */}
          {(selectedRegions.length > 0 || style !== 'all' || visaFilter !== 'all' || selectedTags.length > 0 || search || budgetEnabled) && (
            <button
              onClick={() => { setSelectedRegions([]); setStyle('all'); setVisaFilter('all'); setSelectedTags([]); setSearch(''); setBudgetEnabled(false) }}
              className="text-xs text-indigo-600 hover:underline"
            >
              Clear all filters
            </button>
          )}
        </aside>

        {/* ── Destination grid ── */}
        <main className="flex-1">
          {filtered.length === 0 ? (
            <div className="text-center py-24 text-gray-500">
              <p className="text-4xl mb-3">🌍</p>
              <p className="font-medium">No destinations match your filters.</p>
              <p className="text-sm mt-1">Try broadening your search.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(d => (
                <DestinationCard key={d.slug} destination={d} user={user} />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

function DestinationCard({ destination: d, user }: { destination: Destination; user: ReturnType<typeof useAuth>['user'] }) {
  const visa = resolveVisa(
    user?.passport_nationality,
    user?.has_schengen_visa,
    user?.has_us_visa,
    null,
    d,
  )

  return (
    <Link href={`/discover/${d.slug}`} className="group block bg-white rounded-xl border hover:shadow-md transition-shadow overflow-hidden">
      {/* Cover */}
      <div className="h-28 bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center text-5xl">
        {d.coverEmoji}
      </div>

      {/* Body */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors">
              {d.flag} {d.city}
            </p>
            <p className="text-xs text-gray-500">{d.country} · {d.region}</p>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${visaColorToVariant(visa.color)}`}>
            {visa.label}
          </span>
        </div>

        <p className="text-sm text-gray-600 mt-2 line-clamp-2">{d.description}</p>

        <div className="flex items-center justify-between mt-3">
          <span className="text-sm font-medium text-gray-700">~€{d.avgDailyEur}/day</span>
          <div className="flex gap-1">
            {d.tags.slice(0, 3).map(t => (
              <span key={t} className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Link>
  )
}
