const authStatus = document.getElementById('auth-status')
const tripsList = document.getElementById('trips-list')
const logoutBtn = document.getElementById('logout-btn')
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
    if (window.location.origin && /^https?:\/\//i.test(window.location.origin) && /:8000$/i.test(window.location.origin)) {
        return window.location.origin
    }
    if (window.location.hostname) {
        return `${window.location.protocol}//${window.location.hostname}:8000`
    }
    return 'http://127.0.0.1:8000'
})()
const tripById = new Map()
const chatbotContext = {
    destination: '',
    days: '',
    budget: '',
    transport_type: '',
    origin: '',
    travelers: '',
}

function setAuthStatus(text) {
    if (authStatus) authStatus.textContent = text
}

function renderTrips(trips) {
    if (!tripsList) return
    tripById.clear()

    if (!trips.length) {
        tripsList.innerHTML = '<div class="muted">No trips saved yet. Go back and save your first trip.</div>'
        return
    }

    for (const trip of trips) {
        tripById.set(Number(trip.id), trip)
    }

    tripsList.innerHTML = trips.map(trip => {
        return `
            <div class="card-small trip-card">
                <div class="option-title">${trip.origin} → ${trip.destination}</div>
                <div class="muted">${trip.start_date} to ${trip.end_date} · ${trip.travelers} traveler(s)</div>
                <div class="muted" style="margin-top:6px">Total: $${Number(trip.total).toFixed(2)}</div>
                <div class="actions" style="margin-top:10px;">
                    <button class="btn primary" type="button" data-action="use_chat" data-trip-id="${trip.id}">Use this trip in chat</button>
                </div>
            </div>
        `
    }).join('')
}

function calculateTripDays(startDate, endDate) {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const millisecondsInDay = 24 * 60 * 60 * 1000
    const rawDays = Math.floor((end - start) / millisecondsInDay) + 1
    return String(Math.max(rawDays, 1))
}

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
        bubble.textContent = String(text || '')
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

function resetChatbotState() {
    chatbotContext.destination = ''
    chatbotContext.days = ''
    chatbotContext.budget = ''
    chatbotContext.transport_type = ''
    chatbotContext.origin = ''
    chatbotContext.travelers = ''
    if (chatbotMessages) chatbotMessages.innerHTML = ''
    addChatbotMessage('Hi! Use a saved trip card button to load context, then ask your question.')
    if (chatbotInputLabel) chatbotInputLabel.textContent = 'Ask anything about your trip'
}

function openChatbot() {
    if (!chatbotPanel || !chatbotToggle) return
    chatbotPanel.classList.remove('hidden')
    chatbotToggle.setAttribute('aria-expanded', 'true')
    chatbotInput?.focus()
}

function closeChatbot() {
    if (!chatbotPanel || !chatbotToggle) return
    chatbotPanel.classList.add('hidden')
    chatbotToggle.setAttribute('aria-expanded', 'false')
}

function applyTripContextToChat(trip) {
    chatbotContext.destination = String(trip.destination || '')
    chatbotContext.days = calculateTripDays(trip.start_date, trip.end_date)
    chatbotContext.budget = String(trip.total ?? '')
    chatbotContext.transport_type = String(trip.transport_type || '')
    chatbotContext.origin = String(trip.origin || '')
    chatbotContext.travelers = String(trip.travelers ?? '')

    if (chatbotMessages) chatbotMessages.innerHTML = ''
    addChatbotMessage(`Loaded saved trip: ${trip.origin} → ${trip.destination} (${chatbotContext.days} day(s)).`)
    addChatbotMessage('Ask anything and I will use this trip context.')
    openChatbot()
}

async function requestChatbotReply(message) {
    const payload = {
        message,
        context: {
            destination: chatbotContext.destination,
            days: chatbotContext.days,
            budget: chatbotContext.budget,
            transport_type: chatbotContext.transport_type,
            origin: chatbotContext.origin,
            travelers: chatbotContext.travelers,
        }
    }

    const response = await fetch(`${API_BASE}/api/v1/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
    })

    if (!response.ok) {
        throw new Error('I could not get a response right now. Please try again.')
    }

    return response.json()
}

function initChatbot() {
    if (!chatbotToggle || !chatbotPanel || !chatbotForm) return

    resetChatbotState()

    chatbotToggle.addEventListener('click', () => {
        const isHidden = chatbotPanel.classList.contains('hidden')
        if (isHidden) {
            openChatbot()
            return
        }
        closeChatbot()
    })

    chatbotClose?.addEventListener('click', closeChatbot)
    chatbotReset?.addEventListener('click', resetChatbotState)

    chatbotForm.addEventListener('submit', async (event) => {
        event.preventDefault()
        const value = String(chatbotInput?.value || '').trim()
        if (!value) return

        addChatbotMessage(value, 'user')
        if (chatbotInput) chatbotInput.value = ''
        if (chatbotInput) chatbotInput.disabled = true
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
            if (chatbotInput) {
                chatbotInput.disabled = false
                chatbotInput.focus()
            }
            if (chatbotSendBtn) chatbotSendBtn.disabled = false
        }
    })
}

function attachTripChatButtons() {
    tripsList?.addEventListener('click', (event) => {
        const target = event.target
        if (!(target instanceof HTMLElement)) return
        const button = target.closest('button[data-action="use_chat"][data-trip-id]')
        if (!button) return

        const tripId = Number(button.getAttribute('data-trip-id'))
        const trip = tripById.get(tripId)
        if (!trip) return
        applyTripContextToChat(trip)
    })
}

async function loadTrips() {
    try {
        const meRes = await fetch(`${API_BASE}/api/v1/auth/me`, { credentials: 'include' })
        if (!meRes.ok) {
            window.location.href = `${API_BASE}/login?next=/trips`
            return
        }
        const user = await meRes.json()
        setAuthStatus(`Signed in as ${user.email}`)

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

loadTrips()
initChatbot()
attachTripChatButtons()

logoutBtn?.addEventListener('click', async () => {
    await fetch(`${API_BASE}/api/v1/auth/logout`, { method: 'POST', credentials: 'include' })
    window.location.href = `${API_BASE}/`
})
