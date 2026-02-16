const authForm = document.getElementById('auth-form')
const authStatus = document.getElementById('auth-status')
const authError = document.getElementById('auth-error')
const loginBtn = document.getElementById('login-btn')
const registerBtn = document.getElementById('register-btn')

const API_BASE = 'http://localhost:8000'

function setAuthState(user) {
    if (user) {
        authStatus.textContent = `Signed in as ${user.email}`
    } else {
        authStatus.textContent = 'Not signed in'
    }
}

function getAuthPayload() {
    const fd = new FormData(authForm)
    return {
        email: String(fd.get('email') || '').trim(),
        password: String(fd.get('password') || '')
    }
}

async function getErrorMessage(res, fallback) {
    try {
        const data = await res.json()
        return data.detail || fallback
    } catch {
        return fallback
    }
}

function getNextUrl() {
    const params = new URLSearchParams(window.location.search)
    return params.get('next') || '/profile'
}

authForm?.addEventListener('submit', async (e) => {
    e.preventDefault()
    authError?.classList.add('hidden')
    try {
        const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(getAuthPayload())
        })
        if (!res.ok) {
            const msg = await getErrorMessage(res, 'Invalid email or password.')
            throw new Error(msg)
        }
        const user = await res.json()
        setAuthState(user)
        window.location.href = getNextUrl()
    } catch (err) {
        authError.textContent = err.message || 'Login failed.'
        authError.classList.remove('hidden')
    }
})

registerBtn?.addEventListener('click', async () => {
    authError?.classList.add('hidden')
    try {
        const res = await fetch(`${API_BASE}/api/v1/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(getAuthPayload())
        })
        if (!res.ok) {
            const msg = await getErrorMessage(res, 'Unable to register. Check your details.')
            throw new Error(msg)
        }
        const user = await res.json()
        setAuthState(user)
        window.location.href = getNextUrl()
    } catch (err) {
        authError.textContent = err.message || 'Registration failed.'
        authError.classList.remove('hidden')
    }
})

setAuthState(null)
