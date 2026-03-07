import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
      <header className="px-6 py-4 flex justify-between items-center max-w-5xl mx-auto w-full">
        <div className="text-xl font-bold">✈️ Travel Buddy</div>
        <div className="flex gap-3">
          <Button variant="ghost" asChild><Link href="/login">Log in</Link></Button>
          <Button asChild><Link href="/signup">Sign up free</Link></Button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 gap-8">
        <div className="max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 text-sm font-medium px-4 py-1.5 rounded-full">
            🌍 Passport-aware travel planning
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight leading-tight">
            Find trips that are actually
            <span className="text-blue-600"> possible for you</span>
          </h1>
          <p className="text-lg text-muted-foreground">
            Skyscanner shows prices. Travel Buddy shows what you can actually visit —
            filtered by your passport, budget, and existing visas.
          </p>
        </div>

        <div className="flex gap-4">
          <Button size="lg" asChild>
            <Link href="/signup">Get started — it is free</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
        </div>

        <div className="flex gap-8 text-sm text-muted-foreground">
          <span>✅ Visa filtering by passport</span>
          <span>✅ Budget-first discovery</span>
          <span>✅ AI itinerary builder</span>
        </div>
      </main>
    </div>
  )
}
