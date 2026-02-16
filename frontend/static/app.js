const form = document.getElementById('quote-form')
const resultPanel = document.getElementById('result')
const summary = document.getElementById('summary')
const breakdown = document.getElementById('breakdown')
const submitBtn = document.getElementById('submit-btn')
const resetBtn = document.getElementById('reset-btn')
const newQuoteBtn = document.getElementById('new-quote')
const saveTripBtn = document.getElementById('save-trip')
const saveStatus = document.getElementById('save-status')
const loader = document.getElementById('loader')
const formError = document.getElementById('form-error')

const API_BASE = 'http://localhost:8000'
let lastQuotePayload = null
let lastQuoteResponse = null

function formatCurrency(v) { return '$' + Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }

function showLoader(show = true) {
    if (!loader) return
    loader.classList.toggle('hidden', !show)
    loader.setAttribute('aria-hidden', String(!show))
}

function clearResult() { breakdown.innerHTML = ''; summary.textContent = 'Quote'; resultPanel.classList.add('hidden'); document.getElementById('total').textContent = '—'; formError?.classList.add('hidden'); formError.textContent = '' }

resetBtn?.addEventListener('click', () => {
    form.reset()
    saveStatus?.classList.add('hidden')
    saveStatus.textContent = ''
    startDateWarning?.classList.add('hidden')
    endDateWarning?.classList.add('hidden')
    travelersWarning?.classList.add('hidden')
    clearResult()
})
newQuoteBtn?.addEventListener('click', () => { clearResult(); window.scrollTo({ top: 0, behavior: 'smooth' }) })

function showSaveStatus(message) {
    if (!saveStatus) return
    saveStatus.textContent = message
    saveStatus.classList.remove('hidden')
}

// Real-time traveler validation
const travelersInput = document.querySelector('input[name="travelers"]')
const travelersWarning = document.getElementById('traveler-warning')
if (travelersInput) {
    travelersInput.addEventListener('input', () => {
        const value = parseInt(travelersInput.value, 10)
        if (value > 20) {
            travelersWarning?.classList.remove('hidden')
            travelersInput.value = 20
        } else {
            travelersWarning?.classList.add('hidden')
        }
    })
}

// Real-time start date validation
const startDateInput = document.querySelector('input[name="start_date"]')
const startDateWarning = document.getElementById('start-date-warning')
const endDateInput = document.querySelector('input[name="end_date"]')
const endDateWarning = document.getElementById('end-date-warning')

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

setStartDateMin()
startDateInput?.addEventListener('input', validateStartDate)
setEndDateMin()
endDateInput?.addEventListener('input', validateEndDate)

function validateForm(fd) {
    const s = fd.get('start_date'), e = fd.get('end_date')
    if (!s || !e) return 'Start and end dates are required.'
    if (new Date(e) < new Date(s)) return 'End date must be the same or after start date.'
    if (!(fd.get('origin') && fd.get('destination'))) return 'Please enter both origin and destination.'
    return null
}

form.addEventListener('submit', async (e) => {
    e.preventDefault()
    formError?.classList.add('hidden')
    const fd = new FormData(form)
    if (!validateStartDate()) {
        return
    }
    if (!validateEndDate()) {
        return
    }
    const v = validateForm(fd)
    if (v) { formError.textContent = v; formError.classList.remove('hidden'); return }

    submitBtn.disabled = true
    submitBtn.textContent = 'Loading…'
    showLoader(true)

    const payload = { origin: fd.get('origin'), destination: fd.get('destination'), start_date: fd.get('start_date'), end_date: fd.get('end_date'), travelers: Number(fd.get('travelers') || 1) }
    lastQuotePayload = payload

    try {
        const res = await fetch(`${API_BASE}/api/v1/quote`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(payload) })
        if (!res.ok) {
            throw new Error('Please check your inputs and try again.')
        }
        const data = await res.json()
        renderResult(data)
        lastQuoteResponse = data
        resultPanel.classList.remove('hidden')
        document.getElementById('total').textContent = formatCurrency(data.breakdown.total)
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
    } catch (err) {
        formError.textContent = err.message || String(err)
        formError.classList.remove('hidden')
        resultPanel.classList.remove('hidden')
        summary.textContent = 'Error'
    } finally {
        submitBtn.disabled = false
        submitBtn.textContent = 'Get Estimate'
        showLoader(false)
    }
})

function fadeIn(el) { el.style.opacity = 0; el.style.transform = 'translateY(6px)'; requestAnimationFrame(() => { el.style.transition = 'opacity .28s ease,transform .28s ease'; el.style.opacity = 1; el.style.transform = 'translateY(0)' }) }

function renderResult(data) {
    summary.textContent = `${data.trip_days} day(s)`
    breakdown.innerHTML = ''

    // Transport
    const t = document.createElement('div'); t.className = 'card-small'; t.innerHTML = `<div class='option-title'>Transport</div>`
    data.breakdown.transport.forEach(opt => {
        const d = document.createElement('div'); d.style.marginBottom = '12px'
        d.innerHTML = `<div><strong>${opt.provider}</strong> — ${opt.transport_type}</div><div class='muted' style='margin-top:6px'>${opt.notes || ''}</div><div style='margin-top:8px;font-weight:700'>${formatCurrency(opt.price)}</div>`
        t.appendChild(d)
    })
    breakdown.appendChild(t); fadeIn(t)

    // Accommodation
    const a = document.createElement('div'); a.className = 'card-small';
    a.innerHTML = `<div class='option-title'>Accommodation</div><div>${data.breakdown.accommodation.nights} nights × ${formatCurrency(data.breakdown.accommodation.per_night)}</div><div style='margin-top:8px;font-weight:700'>${formatCurrency(data.breakdown.accommodation.total)}</div>`
    breakdown.appendChild(a); fadeIn(a)

    // Food & Misc
    const f = document.createElement('div'); f.className = 'card-small';
    f.innerHTML = `<div class='option-title'>Daily Costs</div><div>Food: ${formatCurrency(data.breakdown.food)}</div><div>Misc: ${formatCurrency(data.breakdown.misc)}</div>`
    breakdown.appendChild(f); fadeIn(f)
}

saveTripBtn?.addEventListener('click', async () => {
    if (!lastQuotePayload || !lastQuoteResponse) {
        showSaveStatus('Generate a quote before saving your trip.')
        return
    }

    try {
        const authRes = await fetch(`${API_BASE}/api/v1/auth/me`, { credentials: 'include' })
        if (!authRes.ok) {
            window.location.href = `${API_BASE}/login?next=/profile`
            return
        }

        const saveRes = await fetch(`${API_BASE}/api/v1/trips`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                ...lastQuotePayload,
                transport_type: 'any',
                breakdown: lastQuoteResponse.breakdown
            })
        })

        if (!saveRes.ok) {
            showSaveStatus('Could not save trip. Please try again.')
            return
        }

        window.location.href = `${API_BASE}/profile`
    } catch {
        showSaveStatus('Could not save trip. Please try again.')
    }
})

