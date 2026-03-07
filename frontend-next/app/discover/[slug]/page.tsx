'use client'

import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { getDestinationBySlug } from '@/lib/destinations'
import { resolveVisa, visaColorToVariant } from '@/lib/visaLogic'
import { apiFetch } from '@/lib/api'

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default function DestinationDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const { user } = useAuth()
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const destination = getDestinationBySlug(slug)

  if (!destination) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-gray-500">
        <p className="text-5xl">🌍</p>
        <p className="font-semibold text-lg">Destination not found</p>
        <Link href="/discover" className="text-indigo-600 hover:underline text-sm">← Back to discover</Link>
      </div>
    )
  }

  const visa = resolveVisa(
    user?.passport_nationality,
    user?.has_schengen_visa,
    user?.has_us_visa,
    null,
    destination,
  )

  async function handleSaveTrip() {
    if (!user) {
      router.push('/login')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await apiFetch('/api/v1/trips', {
        method: 'POST',
        body: JSON.stringify({
          destination_name: `${destination!.city}, ${destination!.country}`,
          destination_flag: destination!.flag,
          notes: destination!.description,
        }),
      })
      setSaved(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save trip')
    } finally {
      setSaving(false)
    }
  }

  const currentMonth = new Date().getMonth() + 1
  const isGoodMonth = destination.bestMonths.includes(currentMonth)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Back nav */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <Link href="/discover" className="text-sm text-gray-500 hover:text-gray-800">
            ← Back to discover
          </Link>
        </div>
      </div>

      {/* Hero */}
      <div className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white">
        <div className="max-w-4xl mx-auto px-4 py-12 flex gap-6 items-center">
          <div className="text-7xl">{destination.coverEmoji}</div>
          <div>
            <p className="text-indigo-200 text-sm font-medium uppercase tracking-wide">
              {destination.region}
            </p>
            <h1 className="text-4xl font-bold mt-1">
              {destination.flag} {destination.city}
            </h1>
            <p className="text-indigo-100 text-lg mt-1">{destination.country}</p>
            <p className="text-indigo-50 mt-3 max-w-xl">{destination.description}</p>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-4xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* ── Left column ── */}
        <div className="md:col-span-2 space-y-6">

          {/* Highlights */}
          <section className="bg-white rounded-xl border p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Highlights</h2>
            <ul className="space-y-2">
              {destination.highlights.map(h => (
                <li key={h} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-indigo-500 mt-0.5">✦</span>
                  {h}
                </li>
              ))}
            </ul>
          </section>

          {/* Best time to visit */}
          <section className="bg-white rounded-xl border p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Best time to visit</h2>
            <div className="flex gap-1 flex-wrap">
              {MONTH_NAMES.map((m, i) => {
                const month = i + 1
                const good = destination.bestMonths.includes(month)
                const now = month === currentMonth
                return (
                  <span
                    key={m}
                    className={`text-xs px-2 py-1 rounded font-medium border ${
                      good
                        ? now
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        : 'bg-gray-50 text-gray-400 border-gray-200'
                    }`}
                  >
                    {m}
                    {now && good && ' ✓'}
                  </span>
                )
              })}
            </div>
            {isGoodMonth ? (
              <p className="text-sm text-green-700 mt-2">✓ Great time to go right now!</p>
            ) : (
              <p className="text-sm text-amber-700 mt-2">
                Not peak season now — check the highlighted months for best weather.
              </p>
            )}
          </section>

          {/* Tags */}
          <section className="bg-white rounded-xl border p-5">
            <h2 className="font-semibold text-gray-900 mb-3">What to expect</h2>
            <div className="flex flex-wrap gap-2">
              {destination.tags.map(t => (
                <span key={t} className="bg-indigo-50 text-indigo-700 text-sm px-3 py-1 rounded-full capitalize">
                  {t}
                </span>
              ))}
            </div>
          </section>
        </div>

        {/* ── Right sidebar ── */}
        <div className="space-y-4">

          {/* Save trip card */}
          <div className="bg-white rounded-xl border p-5">
            <div className="text-center mb-4">
              <p className="text-2xl font-bold text-gray-900">~€{destination.avgDailyEur}</p>
              <p className="text-xs text-gray-500">average per day</p>
            </div>
            <div className="text-center mb-4">
              <p className="text-sm text-gray-500">
                ✈️ ~{destination.flightHoursFromEurope}h from Europe
              </p>
            </div>

            {saved ? (
              <div className="text-center py-3">
                <p className="text-green-700 font-medium text-sm">✓ Saved to your trips!</p>
                <Link href="/dashboard" className="text-indigo-600 text-xs hover:underline mt-1 block">
                  View in dashboard →
                </Link>
              </div>
            ) : (
              <button
                onClick={handleSaveTrip}
                disabled={saving}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
              >
                {saving ? 'Saving…' : '+ Save this trip'}
              </button>
            )}
            {error && <p className="text-xs text-red-600 mt-2 text-center">{error}</p>}
            {!user && (
              <p className="text-xs text-gray-400 text-center mt-2">
                <Link href="/login" className="text-indigo-500 hover:underline">Log in</Link> to save trips
              </p>
            )}
          </div>

          {/* Visa panel */}
          <div className="bg-white rounded-xl border p-5">
            <h3 className="font-semibold text-gray-900 mb-3 text-sm">Entry requirements</h3>
            {!user?.passport_nationality ? (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${visaColorToVariant(visa.color)}`}>
                    {visa.label} (Indian passport)
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">{visa.note}</p>
                <Link href="/onboarding" className="text-xs text-indigo-600 hover:underline mt-2 block">
                  Add your passport for personalised info →
                </Link>
              </div>
            ) : (
              <div>
                <p className="text-xs text-gray-500 mb-2">
                  For your {user.passport_nationality} passport:
                </p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${visaColorToVariant(visa.color)}`}>
                  {visa.label}
                </span>
                <p className="text-xs text-gray-600 mt-2 leading-relaxed">{visa.note}</p>
              </div>
            )}
          </div>

          {/* Travel style badge */}
          <div className="bg-white rounded-xl border p-4">
            <p className="text-xs text-gray-500 mb-1">Travel style</p>
            <p className="font-medium text-gray-800 capitalize">{destination.travelStyle}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
