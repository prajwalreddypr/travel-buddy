const authStatus = document.getElementById('auth-status')
const profileEmail = document.getElementById('profile-email')
const tripsList = document.getElementById('trips-list')
const logoutBtn = document.getElementById('logout-btn')
const planTripBtn = document.getElementById('plan-trip-btn')
const aiGlobalStatus = document.getElementById('ai-global-status')

const API_BASE = window.location.origin && /^https?:\/\//i.test(window.location.origin)
    ? window.location.origin
    : 'http://127.0.0.1:8000'
const CHAT_PREFILL_STORAGE_KEY = 'travelBuddyChatPrefill'
const tripById = new Map()

function setAuthStatus(text) {
    if (authStatus) authStatus.textContent = text
}

function setAiGlobalStatus(text) {
    if (aiGlobalStatus) aiGlobalStatus.textContent = text
}

function calculateTripDays(startDate, endDate) {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const millisecondsInDay = 24 * 60 * 60 * 1000
    const rawDays = Math.floor((end - start) / millisecondsInDay) + 1
    return String(Math.max(rawDays, 1))
}

function saveTripPrefillToStorage(trip, introText = '') {
    const payload = {
        introText,
        context: {
            destination: String(trip.destination || ''),
            days: calculateTripDays(trip.start_date, trip.end_date),
            budget: String(trip.total ?? ''),
            transport_type: String(trip.transport_type || ''),
            origin: String(trip.origin || ''),
            travelers: String(trip.travelers ?? ''),
        }
    }
    window.localStorage.setItem(CHAT_PREFILL_STORAGE_KEY, JSON.stringify(payload))
}

function renderTrips(trips) {
    if (!tripsList) return
    tripById.clear()

    if (!trips.length) {
        tripsList.innerHTML = '<div class="muted">No trips saved yet. Click "Plan New Trip" to get started.</div>'
        return
    }

    for (const trip of trips) {
        tripById.set(Number(trip.id), trip)
    }

    tripsList.innerHTML = trips.map(trip => {
        return `
            <div class="trip-card-vertical" data-trip-id="${trip.id}">
                <div class="trip-card-header">
                    <div class="option-title">${trip.origin} → ${trip.destination}</div>
                    <div class="trip-total">$${Number(trip.total).toFixed(2)}</div>
                </div>
                <div class="muted">${trip.start_date} to ${trip.end_date}</div>
                <div class="muted" style="margin-top:4px">${trip.travelers} traveler(s)</div>

                <div class="trip-card-actions">
                    <a class="btn ghost trip-action-btn" href="${API_BASE}/edit-trip?id=${trip.id}">Edit</a>
                    <button class="btn primary trip-action-btn" type="button" data-action="use_chat" data-trip-id="${trip.id}">Use this saved trip in chat</button>
                </div>

                <div class="trip-ai-actions">
                    <button class="btn ghost trip-action-btn" type="button" data-action="improve_itinerary" data-trip-id="${trip.id}">Improve itinerary</button>
                    <button class="btn ghost trip-action-btn" type="button" data-action="reduce_budget_15" data-trip-id="${trip.id}">Reduce budget by 15%</button>
                    <button class="btn ghost trip-action-btn" type="button" data-action="family_friendly" data-trip-id="${trip.id}">Family-friendly version</button>
                </div>

                <div id="trip-ai-output-${trip.id}" class="trip-ai-output hidden" aria-live="polite"></div>
            </div>
        `
    }).join('')
}

async function runTripAiAction(tripId, action) {
    const output = document.getElementById(`trip-ai-output-${tripId}`)
    const button = tripsList?.querySelector(`button[data-action="${action}"][data-trip-id="${tripId}"]`)

    if (button) button.disabled = true
    if (output) {
        output.classList.remove('hidden')
        output.textContent = 'Generating AI response…'
    }

    try {
        const res = await fetch(`${API_BASE}/api/v1/chat/from-trip/${tripId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ action })
        })

        if (!res.ok) {
            throw new Error('Could not generate AI response for this trip.')
        }

        const data = await res.json()
        if (output) {
            output.textContent = data.reply || 'No response generated.'
        }
        setAiGlobalStatus('AI response generated successfully.')
    } catch (err) {
        if (output) {
            output.textContent = err.message || 'Something went wrong while generating AI response.'
        }
        setAiGlobalStatus('AI response failed. Please try again.')
    } finally {
        if (button) button.disabled = false
    }
}

function attachTripActions() {
    if (!tripsList) return

    tripsList.addEventListener('click', async (event) => {
        const target = event.target
        if (!(target instanceof HTMLElement)) return

        const actionButton = target.closest('button[data-action][data-trip-id]')
        if (!actionButton) return

        const tripId = Number(actionButton.getAttribute('data-trip-id'))
        const action = actionButton.getAttribute('data-action') || ''
        const trip = tripById.get(tripId)
        if (!trip) return

        if (action === 'use_chat') {
            saveTripPrefillToStorage(
                trip,
                `Loaded your saved trip (${trip.origin} → ${trip.destination}). Ask anything about this plan.`
            )
            window.location.href = `${API_BASE}/`
            return
        }

        if (action === 'improve_itinerary' || action === 'reduce_budget_15' || action === 'family_friendly') {
            await runTripAiAction(tripId, action)
        }
    })
}

async function loadProfile() {
    try {
        const meRes = await fetch(`${API_BASE}/api/v1/auth/me`, { credentials: 'include' })
        if (!meRes.ok) {
            window.location.href = `${API_BASE}/login?next=/profile`
            return
        }
        const user = await meRes.json()
        setAuthStatus(`Signed in as ${user.email}`)
        if (profileEmail) {
            profileEmail.textContent = `Email: ${user.email}`
        }

        const tripsRes = await fetch(`${API_BASE}/api/v1/trips`, { credentials: 'include' })
        if (!tripsRes.ok) {
            renderTrips([])
            return
        }
        const trips = await tripsRes.json()
        renderTrips(trips)
    } catch {
        renderTrips([])
    }
}

logoutBtn?.addEventListener('click', async () => {
    await fetch(`${API_BASE}/api/v1/auth/logout`, { method: 'POST', credentials: 'include' })
    window.location.href = `${API_BASE}/`
})

planTripBtn?.addEventListener('click', () => {
    window.location.href = `${API_BASE}/`
})

loadProfile()
attachTripActions()
