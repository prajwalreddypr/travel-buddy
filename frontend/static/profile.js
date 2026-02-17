const authStatus = document.getElementById('auth-status')
const profileEmail = document.getElementById('profile-email')
const tripsList = document.getElementById('trips-list')
const logoutBtn = document.getElementById('logout-btn')
const planTripBtn = document.getElementById('plan-trip-btn')

const API_BASE = 'http://localhost:8000'

function setAuthStatus(text) {
    if (authStatus) authStatus.textContent = text
}

function renderTrips(trips) {
    if (!tripsList) return
    if (!trips.length) {
        tripsList.innerHTML = '<div class="muted">No trips saved yet. Click "Plan New Trip" to get started.</div>'
        return
    }

    tripsList.innerHTML = trips.map(trip => {
        return `
            <a href="${API_BASE}/edit-trip?id=${trip.id}" style="text-decoration: none; color: inherit;">
                <div class="trip-card-vertical" style="cursor: pointer; transition: all 0.2s ease;">
                    <div class="trip-card-header">
                        <div class="option-title">${trip.origin} → ${trip.destination}</div>
                        <div class="trip-total">$${Number(trip.total).toFixed(2)}</div>
                    </div>
                    <div class="muted">${trip.start_date} to ${trip.end_date}</div>
                    <div class="muted" style="margin-top:4px">${trip.travelers} traveler(s)</div>
                </div>
            </a>
        `
    }).join('')
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
