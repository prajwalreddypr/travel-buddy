const authStatus = document.getElementById('auth-status')
const profileEmail = document.getElementById('profile-email')
const tripsList = document.getElementById('trips-list')
const logoutBtn = document.getElementById('logout-btn')
const planTripBtn = document.getElementById('plan-trip-btn')
const aiGlobalStatus = document.getElementById('ai-global-status')
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
const CHAT_PREFILL_STORAGE_KEY = 'travelBuddyChatPrefill'
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

function clearChatbotMessages() {
    if (!chatbotMessages) return
    chatbotMessages.innerHTML = ''
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

function resetChatbotState() {
    chatbotContext.destination = ''
    chatbotContext.days = ''
    chatbotContext.budget = ''
    chatbotContext.transport_type = ''
    chatbotContext.origin = ''
    chatbotContext.travelers = ''
    clearChatbotMessages()
    addChatbotMessage('Hi! Load a saved trip using the "Use this saved trip in chat" button, then ask your questions.')
    if (chatbotInputLabel) {
        chatbotInputLabel.textContent = 'Ask anything about your trip'
    }
}

function applyTripContextToChat(trip) {
    const context = {
        destination: String(trip.destination || ''),
        days: calculateTripDays(trip.start_date, trip.end_date),
        budget: String(trip.total ?? ''),
        transport_type: String(trip.transport_type || ''),
        origin: String(trip.origin || ''),
        travelers: String(trip.travelers ?? ''),
    }

    chatbotContext.destination = context.destination
    chatbotContext.days = context.days
    chatbotContext.budget = context.budget
    chatbotContext.transport_type = context.transport_type
    chatbotContext.origin = context.origin
    chatbotContext.travelers = context.travelers

    clearChatbotMessages()
    addChatbotMessage(`Loaded saved trip: ${trip.origin} → ${trip.destination} (${context.days} day(s), ${trip.travelers} traveler(s)).`)
    addChatbotMessage('Great, now ask anything and I will answer using this trip context.')
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
        let detail = 'I could not get a response right now. Please try again.'
        try {
            const data = await response.json()
            if (data && typeof data.detail === 'string' && data.detail.trim()) {
                detail = data.detail.trim()
            }
        } catch {
            // fallback detail
        }
        throw new Error(detail)
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
                    <a class="btn ghost trip-action-btn" href="/edit-trip?id=${trip.id}">Edit</a>
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
            applyTripContextToChat(trip)
            setAiGlobalStatus('Saved trip loaded into chatbot on this page.')
            return
        }

        if (action === 'improve_itinerary' || action === 'reduce_budget_15' || action === 'family_friendly') {
            await runTripAiAction(tripId, action)
        }
    })
}

async function loadProfile() {
    try {
        let meRes = await fetch(`${API_BASE}/api/v1/auth/me`, { credentials: 'include' })
        if (!meRes.ok && ALTERNATE_API_BASE) {
            const altMeRes = await fetch(`${ALTERNATE_API_BASE}/api/v1/auth/me`, { credentials: 'include' })
            if (altMeRes.ok) {
                window.location.href = `${ALTERNATE_API_BASE}/profile`
                return
            }
        }
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
    window.location.href = '/'
})

planTripBtn?.addEventListener('click', () => {
    window.location.href = '/'
})

loadProfile()
attachTripActions()
initChatbot()
