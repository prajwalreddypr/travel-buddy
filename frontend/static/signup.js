/* ── Country data ─────────────────────────────────────────────────────────── */
const COUNTRIES = [
  { name: 'Afghanistan', iso: 'AF', dial: '+93' },
  { name: 'Albania', iso: 'AL', dial: '+355' },
  { name: 'Algeria', iso: 'DZ', dial: '+213' },
  { name: 'Andorra', iso: 'AD', dial: '+376' },
  { name: 'Angola', iso: 'AO', dial: '+244' },
  { name: 'Argentina', iso: 'AR', dial: '+54' },
  { name: 'Armenia', iso: 'AM', dial: '+374' },
  { name: 'Australia', iso: 'AU', dial: '+61' },
  { name: 'Austria', iso: 'AT', dial: '+43' },
  { name: 'Azerbaijan', iso: 'AZ', dial: '+994' },
  { name: 'Bahamas', iso: 'BS', dial: '+1' },
  { name: 'Bahrain', iso: 'BH', dial: '+973' },
  { name: 'Bangladesh', iso: 'BD', dial: '+880' },
  { name: 'Barbados', iso: 'BB', dial: '+1246' },
  { name: 'Belarus', iso: 'BY', dial: '+375' },
  { name: 'Belgium', iso: 'BE', dial: '+32' },
  { name: 'Belize', iso: 'BZ', dial: '+501' },
  { name: 'Benin', iso: 'BJ', dial: '+229' },
  { name: 'Bhutan', iso: 'BT', dial: '+975' },
  { name: 'Bolivia', iso: 'BO', dial: '+591' },
  { name: 'Bosnia & Herzegovina', iso: 'BA', dial: '+387' },
  { name: 'Botswana', iso: 'BW', dial: '+267' },
  { name: 'Brazil', iso: 'BR', dial: '+55' },
  { name: 'Brunei', iso: 'BN', dial: '+673' },
  { name: 'Bulgaria', iso: 'BG', dial: '+359' },
  { name: 'Burkina Faso', iso: 'BF', dial: '+226' },
  { name: 'Burundi', iso: 'BI', dial: '+257' },
  { name: 'Cambodia', iso: 'KH', dial: '+855' },
  { name: 'Cameroon', iso: 'CM', dial: '+237' },
  { name: 'Canada', iso: 'CA', dial: '+1' },
  { name: 'Cape Verde', iso: 'CV', dial: '+238' },
  { name: 'Central African Rep.', iso: 'CF', dial: '+236' },
  { name: 'Chad', iso: 'TD', dial: '+235' },
  { name: 'Chile', iso: 'CL', dial: '+56' },
  { name: 'China', iso: 'CN', dial: '+86' },
  { name: 'Colombia', iso: 'CO', dial: '+57' },
  { name: 'Comoros', iso: 'KM', dial: '+269' },
  { name: 'Congo (Republic)', iso: 'CG', dial: '+242' },
  { name: 'Congo (DRC)', iso: 'CD', dial: '+243' },
  { name: 'Costa Rica', iso: 'CR', dial: '+506' },
  { name: 'Croatia', iso: 'HR', dial: '+385' },
  { name: 'Cuba', iso: 'CU', dial: '+53' },
  { name: 'Cyprus', iso: 'CY', dial: '+357' },
  { name: 'Czech Republic', iso: 'CZ', dial: '+420' },
  { name: 'Denmark', iso: 'DK', dial: '+45' },
  { name: 'Djibouti', iso: 'DJ', dial: '+253' },
  { name: 'Dominican Republic', iso: 'DO', dial: '+1809' },
  { name: 'Ecuador', iso: 'EC', dial: '+593' },
  { name: 'Egypt', iso: 'EG', dial: '+20' },
  { name: 'El Salvador', iso: 'SV', dial: '+503' },
  { name: 'Equatorial Guinea', iso: 'GQ', dial: '+240' },
  { name: 'Eritrea', iso: 'ER', dial: '+291' },
  { name: 'Estonia', iso: 'EE', dial: '+372' },
  { name: 'Eswatini', iso: 'SZ', dial: '+268' },
  { name: 'Ethiopia', iso: 'ET', dial: '+251' },
  { name: 'Fiji', iso: 'FJ', dial: '+679' },
  { name: 'Finland', iso: 'FI', dial: '+358' },
  { name: 'France', iso: 'FR', dial: '+33' },
  { name: 'Gabon', iso: 'GA', dial: '+241' },
  { name: 'Gambia', iso: 'GM', dial: '+220' },
  { name: 'Georgia', iso: 'GE', dial: '+995' },
  { name: 'Germany', iso: 'DE', dial: '+49' },
  { name: 'Ghana', iso: 'GH', dial: '+233' },
  { name: 'Greece', iso: 'GR', dial: '+30' },
  { name: 'Guatemala', iso: 'GT', dial: '+502' },
  { name: 'Guinea', iso: 'GN', dial: '+224' },
  { name: 'Guinea-Bissau', iso: 'GW', dial: '+245' },
  { name: 'Guyana', iso: 'GY', dial: '+592' },
  { name: 'Haiti', iso: 'HT', dial: '+509' },
  { name: 'Honduras', iso: 'HN', dial: '+504' },
  { name: 'Hungary', iso: 'HU', dial: '+36' },
  { name: 'Iceland', iso: 'IS', dial: '+354' },
  { name: 'India', iso: 'IN', dial: '+91' },
  { name: 'Indonesia', iso: 'ID', dial: '+62' },
  { name: 'Iran', iso: 'IR', dial: '+98' },
  { name: 'Iraq', iso: 'IQ', dial: '+964' },
  { name: 'Ireland', iso: 'IE', dial: '+353' },
  { name: 'Israel', iso: 'IL', dial: '+972' },
  { name: 'Italy', iso: 'IT', dial: '+39' },
  { name: 'Jamaica', iso: 'JM', dial: '+1876' },
  { name: 'Japan', iso: 'JP', dial: '+81' },
  { name: 'Jordan', iso: 'JO', dial: '+962' },
  { name: 'Kazakhstan', iso: 'KZ', dial: '+7' },
  { name: 'Kenya', iso: 'KE', dial: '+254' },
  { name: 'Kuwait', iso: 'KW', dial: '+965' },
  { name: 'Kyrgyzstan', iso: 'KG', dial: '+996' },
  { name: 'Laos', iso: 'LA', dial: '+856' },
  { name: 'Latvia', iso: 'LV', dial: '+371' },
  { name: 'Lebanon', iso: 'LB', dial: '+961' },
  { name: 'Lesotho', iso: 'LS', dial: '+266' },
  { name: 'Liberia', iso: 'LR', dial: '+231' },
  { name: 'Libya', iso: 'LY', dial: '+218' },
  { name: 'Liechtenstein', iso: 'LI', dial: '+423' },
  { name: 'Lithuania', iso: 'LT', dial: '+370' },
  { name: 'Luxembourg', iso: 'LU', dial: '+352' },
  { name: 'Madagascar', iso: 'MG', dial: '+261' },
  { name: 'Malawi', iso: 'MW', dial: '+265' },
  { name: 'Malaysia', iso: 'MY', dial: '+60' },
  { name: 'Maldives', iso: 'MV', dial: '+960' },
  { name: 'Mali', iso: 'ML', dial: '+223' },
  { name: 'Malta', iso: 'MT', dial: '+356' },
  { name: 'Mauritania', iso: 'MR', dial: '+222' },
  { name: 'Mauritius', iso: 'MU', dial: '+230' },
  { name: 'Mexico', iso: 'MX', dial: '+52' },
  { name: 'Moldova', iso: 'MD', dial: '+373' },
  { name: 'Monaco', iso: 'MC', dial: '+377' },
  { name: 'Mongolia', iso: 'MN', dial: '+976' },
  { name: 'Montenegro', iso: 'ME', dial: '+382' },
  { name: 'Morocco', iso: 'MA', dial: '+212' },
  { name: 'Mozambique', iso: 'MZ', dial: '+258' },
  { name: 'Myanmar', iso: 'MM', dial: '+95' },
  { name: 'Namibia', iso: 'NA', dial: '+264' },
  { name: 'Nepal', iso: 'NP', dial: '+977' },
  { name: 'Netherlands', iso: 'NL', dial: '+31' },
  { name: 'New Zealand', iso: 'NZ', dial: '+64' },
  { name: 'Nicaragua', iso: 'NI', dial: '+505' },
  { name: 'Niger', iso: 'NE', dial: '+227' },
  { name: 'Nigeria', iso: 'NG', dial: '+234' },
  { name: 'North Korea', iso: 'KP', dial: '+850' },
  { name: 'North Macedonia', iso: 'MK', dial: '+389' },
  { name: 'Norway', iso: 'NO', dial: '+47' },
  { name: 'Oman', iso: 'OM', dial: '+968' },
  { name: 'Pakistan', iso: 'PK', dial: '+92' },
  { name: 'Palestine', iso: 'PS', dial: '+970' },
  { name: 'Panama', iso: 'PA', dial: '+507' },
  { name: 'Papua New Guinea', iso: 'PG', dial: '+675' },
  { name: 'Paraguay', iso: 'PY', dial: '+595' },
  { name: 'Peru', iso: 'PE', dial: '+51' },
  { name: 'Philippines', iso: 'PH', dial: '+63' },
  { name: 'Poland', iso: 'PL', dial: '+48' },
  { name: 'Portugal', iso: 'PT', dial: '+351' },
  { name: 'Qatar', iso: 'QA', dial: '+974' },
  { name: 'Romania', iso: 'RO', dial: '+40' },
  { name: 'Russia', iso: 'RU', dial: '+7' },
  { name: 'Rwanda', iso: 'RW', dial: '+250' },
  { name: 'Saudi Arabia', iso: 'SA', dial: '+966' },
  { name: 'Senegal', iso: 'SN', dial: '+221' },
  { name: 'Serbia', iso: 'RS', dial: '+381' },
  { name: 'Seychelles', iso: 'SC', dial: '+248' },
  { name: 'Sierra Leone', iso: 'SL', dial: '+232' },
  { name: 'Singapore', iso: 'SG', dial: '+65' },
  { name: 'Slovakia', iso: 'SK', dial: '+421' },
  { name: 'Slovenia', iso: 'SI', dial: '+386' },
  { name: 'Somalia', iso: 'SO', dial: '+252' },
  { name: 'South Africa', iso: 'ZA', dial: '+27' },
  { name: 'South Korea', iso: 'KR', dial: '+82' },
  { name: 'South Sudan', iso: 'SS', dial: '+211' },
  { name: 'Spain', iso: 'ES', dial: '+34' },
  { name: 'Sri Lanka', iso: 'LK', dial: '+94' },
  { name: 'Sudan', iso: 'SD', dial: '+249' },
  { name: 'Suriname', iso: 'SR', dial: '+597' },
  { name: 'Sweden', iso: 'SE', dial: '+46' },
  { name: 'Switzerland', iso: 'CH', dial: '+41' },
  { name: 'Syria', iso: 'SY', dial: '+963' },
  { name: 'Taiwan', iso: 'TW', dial: '+886' },
  { name: 'Tajikistan', iso: 'TJ', dial: '+992' },
  { name: 'Tanzania', iso: 'TZ', dial: '+255' },
  { name: 'Thailand', iso: 'TH', dial: '+66' },
  { name: 'Timor-Leste', iso: 'TL', dial: '+670' },
  { name: 'Togo', iso: 'TG', dial: '+228' },
  { name: 'Trinidad & Tobago', iso: 'TT', dial: '+1868' },
  { name: 'Tunisia', iso: 'TN', dial: '+216' },
  { name: 'Turkey', iso: 'TR', dial: '+90' },
  { name: 'Turkmenistan', iso: 'TM', dial: '+993' },
  { name: 'Uganda', iso: 'UG', dial: '+256' },
  { name: 'Ukraine', iso: 'UA', dial: '+380' },
  { name: 'United Arab Emirates', iso: 'AE', dial: '+971' },
  { name: 'United Kingdom', iso: 'GB', dial: '+44' },
  { name: 'United States', iso: 'US', dial: '+1' },
  { name: 'Uruguay', iso: 'UY', dial: '+598' },
  { name: 'Uzbekistan', iso: 'UZ', dial: '+998' },
  { name: 'Venezuela', iso: 'VE', dial: '+58' },
  { name: 'Vietnam', iso: 'VN', dial: '+84' },
  { name: 'Yemen', iso: 'YE', dial: '+967' },
  { name: 'Zambia', iso: 'ZM', dial: '+260' },
  { name: 'Zimbabwe', iso: 'ZW', dial: '+263' },
]

/* ── Helpers ──────────────────────────────────────────────────────────────── */
const FLAG_CDN = 'https://flagcdn.com'

// Use SVG format — no width param needed, infinite resolution, always valid URL
// PNG valid widths are only: 20, 40, 80, 160, 320 — w24/w48 do NOT exist (404)
function flagImg(iso, size = 20, eager = false) {
  const code = iso.toLowerCase()
  const loading = eager ? '' : 'loading="lazy"'
  return `<img src="${FLAG_CDN}/${code}.svg" alt="${iso}" width="${size}" height="${Math.round(size * 0.75)}" style="object-fit:cover" ${loading}/>`
}

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

/* ── DOM refs ─────────────────────────────────────────────────────────────── */
const signupForm    = document.getElementById('signup-form')
const signupBtn     = document.getElementById('signup-btn')
const signupError   = document.getElementById('signup-error')
const phonePickerEl = document.getElementById('phone-picker')
const countryBtn    = document.getElementById('phone-country-btn')
const flagEl        = document.getElementById('phone-flag')
const dialEl        = document.getElementById('phone-dial')
const dropdown      = document.getElementById('phone-dropdown')
const searchInput   = document.getElementById('phone-search')
const phoneList     = document.getElementById('phone-list')
const phoneNumber   = document.getElementById('phone-number')

/* ── Phone picker state ───────────────────────────────────────────────────── */
let selectedCountry = COUNTRIES.find(c => c.iso === 'US') || COUNTRIES[0]

function renderFlag(country) {
  if (flagEl) flagEl.innerHTML = flagImg(country.iso, 24, true)  // 24px, eager load
  if (dialEl) dialEl.textContent = country.dial
}

function renderList(filter) {
  if (!phoneList) return
  const q = (filter || '').toLowerCase().trim()
  const filtered = q
    ? COUNTRIES.filter(c => c.name.toLowerCase().includes(q) || c.dial.includes(q))
    : COUNTRIES

  phoneList.innerHTML = filtered.map(c => `
    <li class="phone-list-item${c.iso === selectedCountry.iso ? ' selected' : ''}"
        role="option"
        aria-selected="${c.iso === selectedCountry.iso}"
        data-iso="${c.iso}">
      <span class="pli-flag">${flagImg(c.iso, 20)}</span>
      <span class="pli-name">${c.name}</span>
      <span class="pli-dial">${c.dial}</span>
    </li>
  `).join('')
}

function openDropdown() {
  if (!dropdown || !countryBtn) return
  dropdown.classList.remove('hidden')
  countryBtn.setAttribute('aria-expanded', 'true')
  if (searchInput) {
    searchInput.value = ''
    renderList('')
    searchInput.focus()
  }
}

function closeDropdown() {
  if (!dropdown || !countryBtn) return
  dropdown.classList.add('hidden')
  countryBtn.setAttribute('aria-expanded', 'false')
}

function selectCountry(iso) {
  const country = COUNTRIES.find(c => c.iso === iso)
  if (!country) return
  selectedCountry = country
  renderFlag(country)
  closeDropdown()
  if (phoneNumber) phoneNumber.focus()
}

function initPhonePicker() {
  if (!phonePickerEl) return

  renderFlag(selectedCountry)
  renderList('')

  countryBtn?.addEventListener('click', (e) => {
    e.stopPropagation()
    const isOpen = !dropdown.classList.contains('hidden')
    if (isOpen) {
      closeDropdown()
    } else {
      openDropdown()
    }
  })

  searchInput?.addEventListener('input', () => {
    renderList(searchInput.value)
  })

  // Keyboard: Escape closes dropdown
  phonePickerEl.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDropdown()
  })

  // Click on a country item
  phoneList?.addEventListener('click', (e) => {
    const item = e.target.closest('[data-iso]')
    if (item) selectCountry(item.dataset.iso)
  })

  // Close when clicking outside
  document.addEventListener('click', (e) => {
    if (phonePickerEl && !phonePickerEl.contains(e.target)) {
      closeDropdown()
    }
  })
}

/* ── Form error helpers ───────────────────────────────────────────────────── */
function showError(msg) {
  if (!signupError) return
  signupError.textContent = msg
  signupError.classList.remove('hidden')
}

function hideError() {
  signupError?.classList.add('hidden')
}

async function getErrorMessage(res, fallback) {
  try {
    const data = await res.json()
    if (!data.detail) return fallback
    if (typeof data.detail === 'string') return data.detail
    if (Array.isArray(data.detail)) return data.detail.map(e => e.msg || String(e)).join(', ')
    return fallback
  } catch {
    return fallback
  }
}

/* ── Form submit ──────────────────────────────────────────────────────────── */
signupForm?.addEventListener('submit', async (e) => {
  e.preventDefault()
  hideError()

  const fd = new FormData(signupForm)
  const password = String(fd.get('password') || '')
  const confirmPassword = String(fd.get('confirm_password') || '')

  if (password !== confirmPassword) {
    showError('Passwords do not match.')
    return
  }

  // Build full phone: dial code + number (omit if number is empty)
  const rawNumber = String(phoneNumber?.value || '').trim()
  const fullPhone = rawNumber ? `${selectedCountry.dial} ${rawNumber}` : null

  const countriesRaw = fd.get('countries_visited')
  const countriesParsed = (countriesRaw !== '' && countriesRaw !== null)
    ? Number(countriesRaw)
    : null

  const payload = {
    email: String(fd.get('email') || '').trim(),
    password,
    full_name: String(fd.get('full_name') || '').trim() || null,
    phone: fullPhone,
    address: String(fd.get('address') || '').trim() || null,
    countries_visited: (countriesParsed !== null && !isNaN(countriesParsed)) ? countriesParsed : null,
  }

  if (signupBtn) signupBtn.disabled = true

  try {
    const res = await fetch(`${API_BASE}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload)
    })

    if (!res.ok) {
      const msg = await getErrorMessage(res, 'Unable to create account. Please check your details.')
      throw new Error(msg)
    }

    window.location.href = `${API_BASE}/profile`
  } catch (err) {
    showError(err.message || 'Registration failed. Please try again.')
  } finally {
    if (signupBtn) signupBtn.disabled = false
  }
})

initPhonePicker()
