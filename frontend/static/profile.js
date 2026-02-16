const authStatus = document.getElementById('auth-status')
const profileEmail = document.getElementById('profile-email')
const tripsList = document.getElementById('trips-list')
const logoutBtn = document.getElementById('logout-btn')

const API_BASE = 'http://localhost:8000'

function setAuthStatus(text) {
    if (authStatus) authStatus.textContent = text
}

function renderTrips(trips) {
    if (!tripsList) return
    if (!trips.length) {
        tripsList.innerHTML = '<div class="muted">No trips saved yet. Go back and save your first trip.</div>'
        return
    }

    tripsList.innerHTML = trips.map(trip => {
        return `
            <div class="card-small trip-card">
                <div class="option-title">${trip.origin} → ${trip.destination}</div>
                <div class="muted">${trip.start_date} to ${trip.end_date} · ${trip.travelers} traveler(s)</div>
                <div class="muted" style="margin-top:6px">Total: $${Number(trip.total).toFixed(2)}</div>
            </div>
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

loadProfile()
