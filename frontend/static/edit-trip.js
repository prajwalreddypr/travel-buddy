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

// Date validation elements
const startDateInput = document.querySelector('input[name="start_date"]')
const startDateWarning = document.getElementById('start-date-warning')
const endDateInput = document.querySelector('input[name="end_date"]')
const endDateWarning = document.getElementById('end-date-warning')

const API_BASE = 'http://localhost:8000'
let currentEstimate = null
let tripId = null
let selectedTransportOption = null

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

function formatCurrency(v) {
    return '$' + Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function updateTotalWithTransport(selectedOption) {
    if (!currentEstimate) return

    const accommodation = currentEstimate.breakdown.accommodation.total
    const food = currentEstimate.breakdown.food
    const misc = currentEstimate.breakdown.misc
    const transport = selectedOption.price

    const newTotal = transport + accommodation + food + misc
    totalDiv.textContent = formatCurrency(newTotal)
}

function getTodayDate() {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return today
}

function setStartDateMin() {
    if (!startDateInput) return
    const today = getTodayDate()
    startDateInput.min = today.toISOString().slice(0, 10)
}

function setEndDateMin() {
    if (!endDateInput) return
    if (startDateInput?.value) {
        endDateInput.min = startDateInput.value
    } else {
        endDateInput.min = getTodayDate().toISOString().slice(0, 10)
    }
}

function validateStartDate() {
    if (!startDateInput) return true
    const value = startDateInput.value
    if (!value) {
        startDateWarning?.classList.add('hidden')
        return true
    }
    const selected = new Date(value)
    selected.setHours(0, 0, 0, 0)
    const isValid = selected >= getTodayDate()
    startDateWarning?.classList.toggle('hidden', isValid)
    setEndDateMin()
    if (endDateInput?.value) {
        validateEndDate()
    }
    return isValid
}

function validateEndDate() {
    if (!endDateInput) return true
    const endValue = endDateInput.value
    const startValue = startDateInput?.value
    if (!endValue || !startValue) {
        endDateWarning?.classList.add('hidden')
        return true
    }
    const end = new Date(endValue)
    const start = new Date(startValue)
    end.setHours(0, 0, 0, 0)
    start.setHours(0, 0, 0, 0)
    const isValid = end >= start
    endDateWarning?.classList.toggle('hidden', isValid)
    return isValid
}

function formatBreakdown(breakdown) {
    let html = ''

    // Transport (interactive options)
    if (breakdown.transport && Array.isArray(breakdown.transport) && breakdown.transport.length > 0) {
        html += '<div class="transport-container">'
        html += '<div class="option-title" style="margin-bottom:12px">Transport</div>'
        html += '<div class="transport-options">'

        breakdown.transport.forEach(opt => {
            const isSelected = selectedTransportOption && selectedTransportOption.transport_type === opt.transport_type
            const selectedClass = isSelected ? ' selected' : ''
            html += `
                <div class="transport-option-card${selectedClass}" data-transport-type="${opt.transport_type}">
                    <div class="transport-option-header">
                        <div><strong>${opt.provider}</strong></div>
                        <div class="transport-price">${formatCurrency(opt.price)}</div>
                    </div>
                    <div class="muted" style="font-size:12px;margin-top:6px">${opt.transport_type}</div>
                    <div class="muted" style="font-size:12px;margin-top:4px">${opt.notes || ''}</div>
                </div>
            `
        })

        html += '</div></div>'
    }

    // Accommodation (object with total)
    if (breakdown.accommodation && breakdown.accommodation.total !== undefined) {
        html += `<div class="card-small"><div class="option-title">Accommodation</div><div class="muted">${breakdown.accommodation.nights} nights × ${formatCurrency(breakdown.accommodation.per_night)}</div><div style="margin-top:8px;font-weight:700">${formatCurrency(breakdown.accommodation.total)}</div></div>`
    }

    // Food & Misc
    if ((breakdown.food !== undefined && breakdown.food !== null) || (breakdown.misc !== undefined && breakdown.misc !== null)) {
        html += `<div class="card-small"><div class="option-title">Daily Costs</div><div>Food: ${formatCurrency(breakdown.food)}</div><div>Misc: ${formatCurrency(breakdown.misc)}</div></div>`
    }

    return html
}

function displayEstimate(estimate) {
    currentEstimate = estimate
    summaryDiv.textContent = `${estimate.origin} → ${estimate.destination}`
    metaDiv.textContent = `${estimate.travelers} traveler(s) · ${estimate.start_date} to ${estimate.end_date}`
    totalDiv.textContent = formatCurrency(estimate.total)
    breakdownDiv.innerHTML = formatBreakdown(estimate.breakdown)

    // Set transport option - either match the saved transport_type or use the first one
    if (estimate.breakdown.transport && estimate.breakdown.transport.length > 0) {
        // Try to find matching transport option based on saved transport_type
        if (estimate.transport_type && estimate.transport_type !== 'any') {
            const matching = estimate.breakdown.transport.find(opt => opt.transport_type === estimate.transport_type)
            if (matching) {
                selectedTransportOption = matching
            } else {
                selectedTransportOption = estimate.breakdown.transport[0]
            }
        } else {
            selectedTransportOption = estimate.breakdown.transport[0]
        }
    }

    // Add click listeners to transport option cards
    document.querySelectorAll('.transport-option-card').forEach(card => {
        card.style.cursor = 'pointer'
        card.addEventListener('click', function () {
            const transportType = this.dataset.transportType
            const transportOption = estimate.breakdown.transport.find(opt => opt.transport_type === transportType)

            if (transportOption) {
                // Update selected state
                document.querySelectorAll('.transport-option-card').forEach(c => c.classList.remove('selected'))
                this.classList.add('selected')

                // Update selected option and total
                selectedTransportOption = transportOption
                updateTotalWithTransport(transportOption)
            }
        })
    })

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
        const origin = formData.get('origin')?.trim()
        const destination = formData.get('destination')?.trim()
        const payload = {
            origin: origin,
            destination: destination,
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

        const quote = await res.json()
        hideError()

        // Merge form data with quote response to create complete estimate object
        const estimate = {
            origin: origin,
            destination: destination,
            start_date: payload.start_date,
            end_date: payload.end_date,
            travelers: payload.travelers,
            breakdown: quote.breakdown,
            total: quote.breakdown.total
        }

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
            transport_type: selectedTransportOption?.transport_type || 'any',
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

    // Validate dates before submitting
    if (!validateStartDate()) {
        return
    }
    if (!validateEndDate()) {
        return
    }

    const formData = new FormData(form)
    await getEstimate(formData)
})

newEstimateBtn.addEventListener('click', () => {
    resultPanel.classList.add('hidden')
})

saveChangesBtn.addEventListener('click', saveChanges)

// Initialize date validation
setStartDateMin()
startDateInput?.addEventListener('input', validateStartDate)
setEndDateMin()
endDateInput?.addEventListener('input', validateEndDate)

loadTrip()
