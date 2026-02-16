const form = document.getElementById('edit-form')
const resultPanel = document.getElementById('result')
const breakdownDiv = document.getElementById('breakdown')
const totalDiv = document.getElementById('total')
const summaryDiv = document.getElementById('summary')
const metaDiv = document.getElementById('meta')
const submitBtn = document.getElementById('submit-btn')
const newEstimateBtn = document.getElementById('new-estimate')
const saveChangesBtn = document.getElementById('save-changes')
const saveStatus = document.getElementById('save-status')
const formError = document.getElementById('form-error')
const loader = document.getElementById('loader')

const API_BASE = 'http://localhost:8000'
let currentEstimate = null
let tripId = null

function getURLParam(name) {
    const params = new URLSearchParams(window.location.search)
    return params.get(name)
}

function showLoader() {
    loader.classList.remove('hidden')
}

function hideLoader() {
    loader.classList.add('hidden')
}

function showError(message) {
    formError.textContent = message
    formError.classList.remove('hidden')
}

function hideError() {
    formError.classList.add('hidden')
    formError.textContent = ''
}

function formatBreakdown(breakdown) {
    const categories = [
        { key: 'transport', label: 'Transport' },
        { key: 'accommodation', label: 'Accommodation' },
        { key: 'food', label: 'Food' },
        { key: 'misc', label: 'Misc' }
    ]

    return categories
        .filter(cat => breakdown[cat.key] !== undefined && breakdown[cat.key] !== null)
        .map(cat => {
            const value = breakdown[cat.key]
            const amount = typeof value === 'object' && value.total ? value.total : value
            return `<div class="card-small"><div class="option-title">${cat.label}</div><div class="muted">$${Number(amount).toFixed(2)}</div></div>`
        })
        .join('')
}

function displayEstimate(estimate) {
    currentEstimate = estimate
    summaryDiv.textContent = `${estimate.origin} → ${estimate.destination}`
    metaDiv.textContent = `${estimate.travelers} traveler(s) · ${estimate.start_date} to ${estimate.end_date}`
    totalDiv.textContent = `$${Number(estimate.total).toFixed(2)}`
    breakdownDiv.innerHTML = formatBreakdown(estimate.breakdown)
    resultPanel.classList.remove('hidden')
}

async function populateForm(trip) {
    form.elements['origin'].value = trip.origin
    form.elements['destination'].value = trip.destination
    form.elements['start_date'].value = trip.start_date
    form.elements['end_date'].value = trip.end_date
    form.elements['travelers'].value = trip.travelers
}

async function loadTrip() {
    tripId = getURLParam('id')
    if (!tripId) {
        showError('Trip ID not provided')
        return
    }

    try {
        showLoader()
        const res = await fetch(`${API_BASE}/api/v1/trips/${tripId}`, { credentials: 'include' })
        if (!res.ok) {
            if (res.status === 404) {
                showError('Trip not found')
            } else {
                showError('Failed to load trip')
            }
            return
        }
        const trip = await res.json()
        await populateForm(trip)
        displayEstimate(trip)
    } catch (err) {
        showError('Error loading trip: ' + err.message)
    } finally {
        hideLoader()
    }
}

async function getEstimate(formData) {
    try {
        showLoader()
        const payload = {
            origin: formData.get('origin'),
            destination: formData.get('destination'),
            start_date: formData.get('start_date'),
            end_date: formData.get('end_date'),
            travelers: parseInt(formData.get('travelers'))
        }

        const res = await fetch(`${API_BASE}/api/v1/quote`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })

        if (!res.ok) {
            const error = await res.json()
            showError(error.detail || 'Failed to get estimate')
            return
        }

        const estimate = await res.json()
        hideError()
        displayEstimate(estimate)
    } catch (err) {
        showError('Error: ' + err.message)
    } finally {
        hideLoader()
    }
}

async function saveChanges() {
    if (!currentEstimate) {
        showError('No estimate to save')
        return
    }

    try {
        showLoader()
        const updatePayload = {
            origin: currentEstimate.origin,
            destination: currentEstimate.destination,
            start_date: currentEstimate.start_date,
            end_date: currentEstimate.end_date,
            travelers: currentEstimate.travelers,
            transport_type: 'any',
            breakdown: currentEstimate.breakdown
        }

        const res = await fetch(`${API_BASE}/api/v1/trips/${tripId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(updatePayload)
        })

        if (!res.ok) {
            const error = await res.json()
            showError(error.detail || 'Failed to save trip')
            return
        }

        saveStatus.textContent = 'Trip updated successfully!'
        saveStatus.classList.remove('hidden')
        setTimeout(() => {
            saveStatus.classList.add('hidden')
        }, 3000)
    } catch (err) {
        showError('Error saving: ' + err.message)
    } finally {
        hideLoader()
    }
}

form.addEventListener('submit', async (e) => {
    e.preventDefault()
    hideError()
    const formData = new FormData(form)
    await getEstimate(formData)
})

newEstimateBtn.addEventListener('click', () => {
    resultPanel.classList.add('hidden')
})

saveChangesBtn.addEventListener('click', saveChanges)

loadTrip()
