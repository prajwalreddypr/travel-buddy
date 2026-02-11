const form = document.getElementById('quote-form')
const result = document.getElementById('result')
const summary = document.getElementById('summary')
const breakdown = document.getElementById('breakdown')

form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const fd = new FormData(form)
    const payload = {
        origin: fd.get('origin'),
        destination: fd.get('destination'),
        start_date: fd.get('start_date'),
        end_date: fd.get('end_date'),
        travelers: Number(fd.get('travelers') || 1),
    }

    summary.textContent = 'Loading…'
    breakdown.innerHTML = ''
    result.classList.remove('hidden')

    try {
        const res = await fetch('/api/v1/quote', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error(await res.text())
        const data = await res.json()
        renderResult(data)
    } catch (err) {
        summary.textContent = 'Error: ' + err.message
    }
})

function renderResult(data) {
    summary.textContent = `${data.trip_days} day(s) — Total: $${data.breakdown.total}`
    const b = data.breakdown
    // transport
    const t = document.createElement('div')
    t.innerHTML = '<h3>Transport</h3>'
    b.transport.forEach(opt => {
        const d = document.createElement('div')
        d.className = 'option'
        d.innerHTML = `<strong>${opt.provider}</strong> — ${opt.transport_type} — $${opt.price}`
        t.appendChild(d)
    })
    breakdown.appendChild(t)

    // accommodation
    const a = document.createElement('div')
    a.innerHTML = `<h3>Accommodation</h3><div class='option'>${b.accommodation.nights} nights × $${b.accommodation.per_night} = $${b.accommodation.total}</div>`
    breakdown.appendChild(a)

    // food + misc
    const f = document.createElement('div')
    f.innerHTML = `<h3>Daily Costs</h3><div class='option'>Food: $${b.food} — Misc: $${b.misc}</div>`
    breakdown.appendChild(f)
}
