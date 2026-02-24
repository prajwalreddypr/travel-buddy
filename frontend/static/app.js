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
const chatbotToggle = document.getElementById('chatbot-toggle')
const chatbotPanel = document.getElementById('chatbot-panel')
const chatbotClose = document.getElementById('chatbot-close')
const chatbotForm = document.getElementById('chatbot-form')
const chatbotMessages = document.getElementById('chatbot-messages')
const chatbotInput = document.getElementById('chatbot-input')
const chatbotInputLabel = document.getElementById('chatbot-input-label')
const chatbotReset = document.getElementById('chatbot-reset')
const chatbotSendBtn = chatbotForm?.querySelector('button[type="submit"]')

if (window.location.port === '8000' && window.location.hostname === 'localhost') {
    const target = `http://127.0.0.1:8000${window.location.pathname}${window.location.search}${window.location.hash}`
    window.location.replace(target)
}

const API_BASE = (() => {
    const explicit = window.TRAVEL_BUDDY_API_BASE
    if (typeof explicit === 'string' && explicit.trim()) {
        return explicit.trim().replace(/\/$/, '')
    }

    const origin = window.location.origin
    if (origin && /^https?:\/\//i.test(origin) && /:8000$/i.test(origin)) {
        return origin
    }

    if (window.location.hostname) {
        return `${window.location.protocol}//${window.location.hostname}:8000`
    }

    return 'http://127.0.0.1:8000'
})()

const ALTERNATE_API_BASE = (() => {
    const host = window.location.hostname
    if (host === 'localhost') {
        return `${window.location.protocol}//127.0.0.1:8000`
    }
    if (host === '127.0.0.1') {
        return `${window.location.protocol}//localhost:8000`
    }
    return ''
})()
let lastQuotePayload = null
let lastQuoteResponse = null
let selectedTransportOption = null
let calculatedTotal = null
const chatbotIntake = {
    destination: '',
    days: '',
    budget: '',
    transport_type: '',
    origin: '',
    travelers: '',
    step: 'destination'
}
const CHAT_PREFILL_STORAGE_KEY = 'travelBuddyChatPrefill'
let chatbotContextHydrated = false

function formatBotReply(text) {
    let output = String(text || '').trim()
    if (!output) return ''

    output = output.replace(/\r\n/g, '\n')
    output = output.replace(/\*\*(.*?)\*\*/g, '$1')

    output = output.replace(/\s(\d{1,2}\.\s)/g, '\n$1')
    output = output.replace(/\s-\s+/g, '\n- ')
    output = output.replace(/\n{3,}/g, '\n\n')

    return output
}

function renderBotMessageContent(container, text) {
    const formatted = formatBotReply(text)
    if (!formatted) return

    const lines = formatted.split('\n').map((line) => line.trimEnd())
    let activeList = null
    let activeListType = ''

    function flushList() {
        if (activeList) {
            container.appendChild(activeList)
            activeList = null
            activeListType = ''
        }
    }

    for (const rawLine of lines) {
        const line = rawLine.trim()

        if (!line) {
            flushList()
            continue
        }

        const headingMatch = line.match(/^#{1,6}\s+(.+)$/)
        if (headingMatch) {
            flushList()
            const heading = document.createElement('div')
            heading.className = 'chatbot-msg-heading'
            heading.textContent = headingMatch[1].trim()
            container.appendChild(heading)
            continue
        }

        const orderedMatch = line.match(/^\d+\.\s+(.+)$/)
        if (orderedMatch) {
            if (activeListType !== 'ol') {
                flushList()
                activeList = document.createElement('ol')
                activeList.className = 'chatbot-msg-list ordered'
                activeListType = 'ol'
            }
            const item = document.createElement('li')
            item.textContent = orderedMatch[1].trim()
            activeList.appendChild(item)
            continue
        }

        const unorderedMatch = line.match(/^[-*•]\s+(.+)$/)
        if (unorderedMatch) {
            if (activeListType !== 'ul') {
                flushList()
                activeList = document.createElement('ul')
                activeList.className = 'chatbot-msg-list unordered'
                activeListType = 'ul'
            }
            const item = document.createElement('li')
            item.textContent = unorderedMatch[1].trim()
            activeList.appendChild(item)
            continue
        }

        flushList()
        const paragraph = document.createElement('p')
        paragraph.className = 'chatbot-msg-paragraph'
        paragraph.textContent = line
        container.appendChild(paragraph)
    }

    flushList()
}

function addChatbotMessage(text, role = 'bot') {
    if (!chatbotMessages) return
    const bubble = document.createElement('div')
    bubble.className = `chatbot-bubble ${role}`
    if (role === 'bot') {
        renderBotMessageContent(bubble, text)
    } else {
        bubble.textContent = String(text)
    }
    chatbotMessages.appendChild(bubble)
    chatbotMessages.scrollTop = chatbotMessages.scrollHeight
}

function showChatbotThinking() {
    if (!chatbotMessages) return null
    const bubble = document.createElement('div')
    bubble.className = 'chatbot-bubble bot thinking'
    bubble.textContent = 'Thinking…'
    chatbotMessages.appendChild(bubble)
    chatbotMessages.scrollTop = chatbotMessages.scrollHeight
    return bubble
}

function removeChatbotThinking(bubble) {
    if (!bubble || !bubble.parentNode) return
    bubble.parentNode.removeChild(bubble)
}

function setChatbotInputForStep() {
    if (!chatbotInput || !chatbotInputLabel || !chatbotSendBtn) return

    if (chatbotIntake.step === 'destination') {
        chatbotInputLabel.textContent = 'Where do you want to travel?'
        chatbotInput.type = 'text'
        chatbotInput.placeholder = 'e.g. Tokyo'
        chatbotInput.min = ''
        chatbotInput.value = chatbotIntake.destination || ''
        chatbotInput.disabled = false
        chatbotSendBtn.disabled = false
        chatbotSendBtn.textContent = 'Send'
        return
    }

    if (chatbotIntake.step === 'days') {
        chatbotInputLabel.textContent = 'How many days is your trip?'
        chatbotInput.type = 'number'
        chatbotInput.placeholder = 'e.g. 5'
        chatbotInput.min = '1'
        chatbotInput.value = chatbotIntake.days || ''
        chatbotInput.disabled = false
        chatbotSendBtn.disabled = false
        chatbotSendBtn.textContent = 'Send'
        return
    }

    chatbotInputLabel.textContent = 'Ask anything about your trip'
    chatbotInput.value = ''
    chatbotInput.placeholder = 'e.g. Is 5 days enough for Tokyo?'
    chatbotInput.type = 'text'
    chatbotInput.min = ''
    chatbotInput.disabled = false
    chatbotSendBtn.disabled = false
    chatbotSendBtn.textContent = 'Send'
}

function tryExtractDayCorrection(message) {
    const text = String(message || '').trim()
    if (!text) return null

    const lower = text.toLowerCase()
    const hasCorrectionIntent = /\b(meant|instead|not|correction|correct)\b/.test(lower)
    const mentionsDays = /\bdays?\b/.test(lower)
    if (!hasCorrectionIntent || !mentionsDays) return null

    const rangeMatch = text.match(/(\d+)\s*(?:to|-)\s*(\d+)\s*days?/i)
    if (rangeMatch) {
        return `${rangeMatch[1]}-${rangeMatch[2]}`
    }

    const singleMatch = text.match(/(\d+)\s*days?/i)
    if (singleMatch) {
        return singleMatch[1]
    }

    return null
}

async function requestChatbotReply(message) {
    const payload = {
        message,
        context: {
            destination: chatbotIntake.destination || '',
            days: chatbotIntake.days || '',
            budget: chatbotIntake.budget || '',
            transport_type: chatbotIntake.transport_type || '',
            origin: chatbotIntake.origin || '',
            travelers: chatbotIntake.travelers || ''
        }
    }

    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), 45000)
    let response

    try {
        response = await fetch(`${API_BASE}/api/v1/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(payload),
            signal: controller.signal
        })
    } catch (err) {
        if (err && err.name === 'AbortError') {
            throw new Error('Chat request timed out. Please try again.')
        }
        throw new Error('I could not connect to the chatbot right now. Please try again.')
    } finally {
        window.clearTimeout(timeoutId)
    }

    if (!response.ok) {
        let detail = 'I could not get a response right now. Please try again.'
        try {
            const data = await response.json()
            if (data && typeof data.detail === 'string' && data.detail.trim()) {
                detail = data.detail.trim()
            }
        } catch {
            detail = `Chat request failed (${response.status}). Please try again.`
        }
        throw new Error(detail)
    }

    return response.json()
}

function applyChatbotTripContext(context, introText) {
    if (!context || typeof context !== 'object') return false

    const destination = String(context.destination || '').trim()
    const days = String(context.days || '').trim()
    if (!destination || !days) return false

    chatbotIntake.destination = destination
    chatbotIntake.days = days
    chatbotIntake.budget = String(context.budget || '').trim()
    chatbotIntake.transport_type = String(context.transport_type || '').trim()
    chatbotIntake.origin = String(context.origin || '').trim()
    chatbotIntake.travelers = String(context.travelers || '').trim()
    chatbotIntake.step = 'done'

    window.chatbotIntake = {
        destination: chatbotIntake.destination,
        days: chatbotIntake.days,
        budget: chatbotIntake.budget,
        transport_type: chatbotIntake.transport_type,
        origin: chatbotIntake.origin,
        travelers: chatbotIntake.travelers
    }

    if (chatbotMessages) {
        chatbotMessages.innerHTML = ''
        addChatbotMessage(
            introText || `Loaded your saved trip to ${destination} for ${days} day(s). Ask anything about this trip.`
        )
    }

    setChatbotInputForStep()
    return true
}

function extractPrefillContextFromStorage() {
    const raw = window.localStorage.getItem(CHAT_PREFILL_STORAGE_KEY)
    if (!raw) return null

    try {
        const parsed = JSON.parse(raw)
        window.localStorage.removeItem(CHAT_PREFILL_STORAGE_KEY)
        return parsed
    } catch {
        window.localStorage.removeItem(CHAT_PREFILL_STORAGE_KEY)
        return null
    }
}

function calculateTripDays(startDate, endDate) {
    if (!startDate || !endDate) return ''
    const start = new Date(startDate)
    const end = new Date(endDate)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return ''
    const millisecondsInDay = 24 * 60 * 60 * 1000
    const rawDays = Math.floor((end - start) / millisecondsInDay) + 1
    return String(Math.max(rawDays, 1))
}

function buildContextFromTrip(trip) {
    return {
        destination: String(trip.destination || ''),
        days: calculateTripDays(trip.start_date, trip.end_date),
        budget: String(trip.total ?? ''),
        transport_type: String(trip.transport_type || ''),
        origin: String(trip.origin || ''),
        travelers: String(trip.travelers ?? ''),
    }
}

function getChatTripIdFromQuery() {
    const params = new URLSearchParams(window.location.search)
    const value = params.get('chat_trip_id')
    if (!value) return null
    const parsed = Number(value)
    if (!Number.isInteger(parsed) || parsed < 1) return null
    return parsed
}

async function fetchTripByIdForChat(baseUrl, tripId) {
    const response = await fetch(`${baseUrl}/api/v1/trips/${tripId}`, { credentials: 'include' })
    if (!response.ok) {
        throw new Error(`trip_fetch_failed_${response.status}`)
    }
    return response.json()
}

async function hydrateFromTripQueryParam() {
    const tripId = getChatTripIdFromQuery()
    if (!tripId) return false

    try {
        const trip = await fetchTripByIdForChat(API_BASE, tripId)
        return applyChatbotTripContext(
            buildContextFromTrip(trip),
            `Loaded saved trip (${trip.origin} → ${trip.destination}). Ask anything about this plan.`
        )
    } catch (err) {
        if (ALTERNATE_API_BASE && String(err.message || '').includes('trip_fetch_failed_401')) {
            const pathAndQuery = `${window.location.pathname}${window.location.search}`
            window.location.href = `${ALTERNATE_API_BASE}${pathAndQuery}`
            return true
        }
        return false
    }
}

async function hydrateChatbotContextFromSavedTrips() {
    if (chatbotContextHydrated) return
    chatbotContextHydrated = true

    const hydratedFromQuery = await hydrateFromTripQueryParam()
    if (hydratedFromQuery) {
        return
    }

    const prefill = extractPrefillContextFromStorage()
    if (prefill && applyChatbotTripContext(prefill.context || prefill, prefill.introText)) {
        return
    }

    if (chatbotIntake.destination && chatbotIntake.days) {
        return
    }

    try {
        const meRes = await fetch(`${API_BASE}/api/v1/auth/me`, { credentials: 'include' })
        if (!meRes.ok) return

        const tripsRes = await fetch(`${API_BASE}/api/v1/trips`, { credentials: 'include' })
        if (!tripsRes.ok) return

        const trips = await tripsRes.json()
        if (!Array.isArray(trips) || !trips.length) return

        const latest = trips[0]
        applyChatbotTripContext(
            {
                destination: latest.destination,
                days: calculateTripDays(latest.start_date, latest.end_date),
                budget: String(latest.total ?? ''),
                transport_type: String(latest.transport_type || ''),
                origin: String(latest.origin || ''),
                travelers: String(latest.travelers ?? ''),
            },
            `Loaded your latest saved trip (${latest.origin} → ${latest.destination}). Ask anything about this plan.`
        )
    } catch {
        // Ignore hydration failures and keep manual intake flow.
    }
}

function resetChatbotConversation() {
    chatbotIntake.destination = ''
    chatbotIntake.days = ''
    chatbotIntake.budget = ''
    chatbotIntake.transport_type = ''
    chatbotIntake.origin = ''
    chatbotIntake.travelers = ''
    chatbotIntake.step = 'destination'
    window.chatbotIntake = {
        destination: '',
        days: '',
        budget: '',
        transport_type: '',
        origin: '',
        travelers: ''
    }

    if (chatbotMessages) chatbotMessages.innerHTML = ''
    addChatbotMessage('Hi! I can collect a couple of trip details to get started, then answer your travel questions.')
    addChatbotMessage('Where do you want to travel?')
    setChatbotInputForStep()
    chatbotInput?.focus()
}

async function openChatbot() {
    if (!chatbotPanel || !chatbotToggle) return
    chatbotPanel.classList.remove('hidden')
    chatbotToggle.setAttribute('aria-expanded', 'true')
    await hydrateChatbotContextFromSavedTrips()
    chatbotInput?.focus()
}

function closeChatbot() {
    if (!chatbotPanel || !chatbotToggle) return
    chatbotPanel.classList.add('hidden')
    chatbotToggle.setAttribute('aria-expanded', 'false')
}

function initChatbot() {
    if (!chatbotToggle || !chatbotPanel || !chatbotForm) return

    resetChatbotConversation()

    chatbotToggle.addEventListener('click', () => {
        const isHidden = chatbotPanel.classList.contains('hidden')
        if (isHidden) {
            openChatbot()
            return
        }
        closeChatbot()
    })

    chatbotClose?.addEventListener('click', closeChatbot)
    chatbotReset?.addEventListener('click', resetChatbotConversation)

    chatbotForm.addEventListener('submit', async (event) => {
        event.preventDefault()
        const raw = chatbotInput?.value ?? ''
        const value = String(raw).trim()
        if (!value) return

        if (chatbotIntake.step === 'destination') {
            chatbotIntake.destination = value
            addChatbotMessage(value, 'user')
            chatbotIntake.step = 'days'
            addChatbotMessage('Nice choice. How many days are you planning to travel?')
            setChatbotInputForStep()
            chatbotInput?.focus()
            return
        }

        if (chatbotIntake.step === 'days') {
            const days = Number(value)
            if (!Number.isInteger(days) || days < 1) {
                addChatbotMessage('Please enter a valid number of days (minimum 1).')
                return
            }

            chatbotIntake.days = String(days)
            addChatbotMessage(String(days), 'user')
            chatbotIntake.step = 'done'
            window.chatbotIntake = {
                destination: chatbotIntake.destination,
                days: chatbotIntake.days,
                budget: chatbotIntake.budget,
                transport_type: chatbotIntake.transport_type,
                origin: chatbotIntake.origin,
                travelers: chatbotIntake.travelers
            }
            addChatbotMessage('Perfect. I saved your destination and trip length. Ask me anything about your trip.')
            setChatbotInputForStep()
            chatbotInput?.focus()
            return
        }

        const correctedDays = tryExtractDayCorrection(value)
        if (correctedDays) {
            chatbotIntake.days = correctedDays
            window.chatbotIntake = {
                destination: chatbotIntake.destination,
                days: chatbotIntake.days,
                budget: chatbotIntake.budget,
                transport_type: chatbotIntake.transport_type,
                origin: chatbotIntake.origin,
                travelers: chatbotIntake.travelers
            }
            addChatbotMessage(value, 'user')
            addChatbotMessage(`Updated trip length to ${correctedDays} day(s). Now ask your question.`)
            chatbotInput.value = ''
            chatbotInput.focus()
            return
        }

        addChatbotMessage(value, 'user')
        chatbotInput.value = ''
        chatbotInput.disabled = true
        if (chatbotSendBtn) chatbotSendBtn.disabled = true
        const thinkingBubble = showChatbotThinking()

        try {
            const data = await requestChatbotReply(value)
            removeChatbotThinking(thinkingBubble)
            addChatbotMessage(data.reply || 'I could not generate a response.')
        } catch (err) {
            removeChatbotThinking(thinkingBubble)
            addChatbotMessage(err.message || 'Something went wrong while getting a response.')
        } finally {
            removeChatbotThinking(thinkingBubble)
            chatbotInput.disabled = false
            if (chatbotSendBtn) chatbotSendBtn.disabled = false
            chatbotInput.focus()
        }
    })
}

initChatbot()

function formatCurrency(v) { return '$' + Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }

function showLoader(show = true) {
    if (!loader) return
    loader.classList.toggle('hidden', !show)
    loader.setAttribute('aria-hidden', String(!show))
}

function clearResult() { breakdown.innerHTML = ''; summary.textContent = 'Quote'; resultPanel.classList.add('hidden'); document.getElementById('total').textContent = '—'; formError?.classList.add('hidden'); formError.textContent = ''; selectedTransportOption = null; calculatedTotal = null }

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

function updateTotalWithTransport(selectedOption) {
    if (!lastQuoteResponse) return

    const accommodation = lastQuoteResponse.breakdown.accommodation.total
    const food = lastQuoteResponse.breakdown.food
    const misc = lastQuoteResponse.breakdown.misc
    const transport = selectedOption.price

    const newTotal = transport + accommodation + food + misc
    calculatedTotal = newTotal
    document.getElementById('total').textContent = formatCurrency(newTotal)
}

function renderResult(data) {
    summary.textContent = `${data.trip_days} day(s)`
    breakdown.innerHTML = ''

    // Set first transport option as default if not already selected
    if (!selectedTransportOption && data.breakdown.transport.length > 0) {
        selectedTransportOption = data.breakdown.transport[0]
    }

    // Calculate the correct initial total based on selected transport
    if (selectedTransportOption && data.breakdown.transport.length > 0) {
        const transport = selectedTransportOption.price
        const accommodation = data.breakdown.accommodation.total
        const food = data.breakdown.food
        const misc = data.breakdown.misc
        calculatedTotal = transport + accommodation + food + misc
    } else {
        calculatedTotal = data.breakdown.total
    }

    // Transport (clickable options)
    const t = document.createElement('div'); t.className = 'transport-container'
    const transportTitle = document.createElement('div'); transportTitle.className = 'option-title'; transportTitle.textContent = 'Transport'; transportTitle.style.marginBottom = '12px'
    t.appendChild(transportTitle)

    const transportOptions = document.createElement('div'); transportOptions.className = 'transport-options'
    data.breakdown.transport.forEach(opt => {
        const optionCard = document.createElement('div')
        optionCard.className = 'transport-option-card'
        if (selectedTransportOption && selectedTransportOption.transport_type === opt.transport_type) {
            optionCard.classList.add('selected')
        }
        optionCard.innerHTML = `
            <div class="transport-option-header">
                <div><strong>${opt.provider}</strong></div>
                <div class="transport-price">${formatCurrency(opt.price)}</div>
            </div>
            <div class="muted" style="font-size:12px;margin-top:6px">${opt.transport_type}</div>
            <div class="muted" style="font-size:12px;margin-top:4px">${opt.notes || ''}</div>
        `
        optionCard.style.cursor = 'pointer'
        optionCard.addEventListener('click', () => {
            // Update selected option
            document.querySelectorAll('.transport-option-card').forEach(card => card.classList.remove('selected'))
            optionCard.classList.add('selected')
            selectedTransportOption = opt
            updateTotalWithTransport(opt)
        })
        transportOptions.appendChild(optionCard)
    })
    t.appendChild(transportOptions)
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

        // Create a breakdown with the correct calculated total
        const breakdownToSave = {
            ...lastQuoteResponse.breakdown,
            total: calculatedTotal || lastQuoteResponse.breakdown.total
        }

        const saveRes = await fetch(`${API_BASE}/api/v1/trips`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                ...lastQuotePayload,
                transport_type: selectedTransportOption?.transport_type || 'any',
                breakdown: breakdownToSave
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

