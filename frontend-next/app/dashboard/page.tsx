'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'

export default function DashboardPage() {
  const { user, loading, logout } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) router.replace('/login')
  }, [loading, user, router])

  if (loading || !user) return null

  const initials = user.full_name
    ? user.full_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : user.email[0].toUpperCase()

  const isOnboarded = !!user.passport_nationality

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="text-xl font-bold">✈️ Travel Buddy</div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-semibold">
              {initials}
            </div>
            <Button variant="ghost" size="sm" onClick={logout}>Sign Out</Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-6">
        {/* Welcome */}
        <div>
          <h1 className="text-2xl font-bold">
            Welcome{user.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}! 👋
          </h1>
          <p className="text-muted-foreground mt-1">Your travel dashboard</p>
        </div>

        {/* Onboarding nudge */}
        {!isOnboarded && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-center justify-between gap-4">
            <div>
              <div className="font-semibold text-amber-900">Complete your traveller profile</div>
              <p className="text-sm text-amber-700 mt-0.5">
                Add your passport and preferences to unlock personalised destination recommendations.
              </p>
            </div>
            <Button
              onClick={() => router.push('/onboarding')}
              className="bg-amber-500 hover:bg-amber-600 shrink-0"
            >
              Set up now →
            </Button>
          </div>
        )}

        {/* Profile summary */}
        {isOnboarded && (
          <div className="bg-white rounded-xl border border-gray-100 p-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Passport</div>
              <div className="font-semibold mt-1">{user.passport_nationality}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Flying from</div>
              <div className="font-semibold mt-1">{user.home_city}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Travel style</div>
              <div className="font-semibold mt-1 capitalize">{user.travel_style}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Max budget</div>
              <div className="font-semibold mt-1">€{user.budget_eur?.toLocaleString()}</div>
            </div>
          </div>
        )}

        {/* Coming soon */}
        <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-muted-foreground">
          <div className="text-4xl mb-3">🗺️</div>
          <div className="font-medium">Destination discovery coming soon</div>
          <p className="text-sm mt-1">
            We&apos;ll show you the best places you can travel to based on your passport and budget.
          </p>
        </div>
      </main>
    </div>
  )
}
