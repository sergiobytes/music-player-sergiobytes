import './style.css'

const $ = (id) => document.getElementById(id)

// ============ Temas ============
const THEMES = [
    { id: 'atardecer', name: 'Atardecer', colors: ['#121214', '#ff7a45', '#ffb347'] },
    { id: 'medianoche', name: 'Medianoche', colors: ['#0d1020', '#7c8cff', '#c084fc'] },
    { id: 'bosque', name: 'Bosque', colors: ['#0f1512', '#4fd1a5', '#c6e86b'] },
    { id: 'neon', name: 'Neón', colors: ['#0b0b0f', '#ff3ea5', '#00e5ff'] },
    { id: 'claro', name: 'Claro', colors: ['#f6f5f2', '#e2572b', '#f29d38'] },
]
const THEME_KEY = 'rola-theme'

function applyTheme(id) {
    document.documentElement.dataset.theme = id
    try { localStorage.setItem(THEME_KEY, id) } catch (e) { }
    renderThemeMenu()
}

function renderThemeMenu() {
    const current = document.documentElement.dataset.theme
    $('themeMenu').innerHTML = THEMES.map((t) => `
    <button type="button" role="menuitemradio" aria-checked="${t.id === current}" data-theme-id="${t.id}"
      class="flex w-full cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-panel2 ${t.id === current ? 'text-accent font-semibold' : 'text-fg'}">
      <span class="flex overflow-hidden rounded-md border border-line">
        ${t.colors.map((c) => `<span class="block h-5 w-3" style="background:${c}"></span>`).join('')}
      </span>
      <span class="flex-1">${t.name}</span>
      ${t.id === current ? '<span>✓</span>' : ''}
    </button>`).join('')
}

function toggleThemeMenu(open) {
    const menu = $('themeMenu')
    const show = open ?? menu.classList.contains('hidden')
    menu.classList.toggle('hidden', !show)
    $('themeBtn').setAttribute('aria-expanded', String(show))
}

$('themeBtn').addEventListener('click', (e) => { e.stopPropagation(); toggleThemeMenu() })
$('themeMenu').addEventListener('click', (e) => {
    const b = e.target.closest('[data-theme-id]')
    if (b) { applyTheme(b.dataset.themeId); toggleThemeMenu(false) }
})
document.addEventListener('click', (e) => { if (!e.target.closest('#themeMenu')) toggleThemeMenu(false) })
renderThemeMenu()

// ============ Estado ============
const KEY = 'rola-state-v1'
const PLAY = '<path d="M8 5v14l11-7z"/>'
const PAUSE = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>'

let state = { queue: [], index: -1, shuffle: false, repeat: 'off', volume: 80 }
try {
    const s = JSON.parse(localStorage.getItem(KEY))
    if (s && Array.isArray(s.queue)) state = { ...state, ...s }
} catch (e) { }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)) } catch (e) { } }

let player = null, ready = false, playing = false, seeking = false
let history = []

// ============ Enlaces ============
function parseId(raw) {
    const s = raw.trim()
    if (!s) return null
    if (/^[\w-]{11}$/.test(s)) return s
    try {
        const u = new URL(s)
        const host = u.hostname.replace(/^(www|m|music)\./, '')
        if (host === 'youtu.be') return u.pathname.slice(1, 12) || null
        if (host.endsWith('youtube.com') || host.endsWith('youtube-nocookie.com')) {
            const v = u.searchParams.get('v')
            if (v && /^[\w-]{11}$/.test(v)) return v
            const m = u.pathname.match(/^\/(shorts|embed|live|v)\/([\w-]{11})/)
            if (m) return m[2]
        }
    } catch (e) { }
    return null
}

async function fetchTitle(item) {
    try {
        const r = await fetch('https://www.youtube.com/oembed?format=json&url=' +
            encodeURIComponent('https://www.youtube.com/watch?v=' + item.id))
        if (!r.ok) return
        const d = await r.json()
        if (d.title) { item.title = d.title; save(); render() }
    } catch (e) { /* el título se completa al reproducirse */ }
}

function add(text) {
    const parts = text.split(/[\s,]+/).filter(Boolean)
    let added = 0, bad = 0
    const wasEmpty = state.index < 0 || !state.queue.length
    for (const p of parts) {
        const id = parseId(p)
        if (!id) { bad++; continue }
        const item = { id, title: 'Cargando título…', uid: Math.random().toString(36).slice(2) }
        state.queue.push(item)
        fetchTitle(item)
        added++
    }
    let m = added ? `${added} canción${added > 1 ? 'es' : ''} agregada${added > 1 ? 's' : ''} a la cola.` : ''
    if (bad) m += ` ${bad} enlace${bad > 1 ? 's' : ''} no reconocido${bad > 1 ? 's' : ''}.`
    flash(m.trim())
    save(); render()
    // Solo arranca si no había nada sonando; si ya suena algo, se queda en la cola
    if (added && wasEmpty) playAt(state.queue.length - added)
}

let msgT
function flash(t) {
    $('msg').textContent = t
    clearTimeout(msgT)
    msgT = setTimeout(() => ($('msg').textContent = ''), 4000)
}

// ============ Reproducción ============
function playAt(i, remember = true) {
    if (i < 0 || i >= state.queue.length) return
    if (remember && state.index >= 0 && state.index !== i) history.push(state.index)
    state.index = i
    save(); render()
    if (ready) player.loadVideoById(state.queue[i].id)
}

function nextIndex() {
    const n = state.queue.length
    if (!n) return -1
    if (state.shuffle && n > 1) {
        let r
        do { r = Math.floor(Math.random() * n) } while (r === state.index)
        return r
    }
    if (state.index + 1 < n) return state.index + 1
    return state.repeat === 'all' ? 0 : -1
}

function next(auto = false) {
    if (auto && state.repeat === 'one') { player.seekTo(0); player.playVideo(); return }
    const i = nextIndex()
    if (i >= 0) playAt(i)
    else if (auto) { playing = false; updatePlayIcon() }
}

function prev() {
    if (ready && player.getCurrentTime && player.getCurrentTime() > 3) { player.seekTo(0); return }
    if (state.shuffle && history.length) { playAt(history.pop(), false); return }
    if (state.index > 0) playAt(state.index - 1)
    else if (ready) player.seekTo(0)
}

function toggle() {
    if (!ready) return
    if (state.index < 0 && state.queue.length) { playAt(0); return }
    playing ? player.pauseVideo() : player.playVideo()
}

// ============ Render ============
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

function render() {
    $('empty').classList.toggle('hidden', state.queue.length > 0)
    $('list').innerHTML = state.queue.map((it, i) => {
        const cur = i === state.index
        return `
    <li draggable="true" data-i="${i}"
      class="group grid cursor-pointer grid-cols-[28px_64px_1fr_auto] items-center gap-3 rounded-xl p-2 ${cur ? 'bg-panel2' : 'hover:bg-panel'}">
      <span class="text-right text-muted tabular-nums">${cur && playing ? '<span class="text-accent">♪</span>' : i + 1}</span>
      <img src="https://i.ytimg.com/vi/${it.id}/mqdefault.jpg" alt="" loading="lazy" class="h-9 w-16 rounded-md bg-panel2 object-cover">
      <span class="truncate ${it.error ? 'text-danger line-through' : cur ? 'text-accent font-medium' : ''}" title="${esc(it.title)}">${esc(it.title)}</span>
      <button data-rm="${i}" title="Quitar" class="cursor-pointer rounded-md px-2 py-1.5 text-muted opacity-0 group-hover:opacity-100 hover:text-danger">✕</button>
    </li>`
    }).join('')

    const cur = state.queue[state.index]
    $('npTitle').textContent = cur ? cur.title : '—'
    $('ftTitle').textContent = cur ? cur.title : ''
    const ni = state.shuffle ? -1
        : state.index + 1 < state.queue.length ? state.index + 1
            : state.repeat === 'all' && state.queue.length ? 0 : -1
    $('upNext').textContent = ni >= 0 && cur ? 'Sigue: ' + state.queue[ni].title
        : state.shuffle && cur ? 'Modo aleatorio activado' : ''
    $('shufBtn').classList.toggle('on', state.shuffle)
    $('repBtn').classList.toggle('on', state.repeat !== 'off')
    $('repBtn').classList.toggle('rep-one', state.repeat === 'one')
    document.title = cur && playing ? '▶ ' + cur.title : 'Rola'
}

function updatePlayIcon() { $('playIcon').innerHTML = playing ? PAUSE : PLAY; render() }

const fmt = (s) => { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0') }

setInterval(() => {
    if (!ready || seeking || !player.getDuration) return
    const d = player.getDuration() || 0, c = player.getCurrentTime() || 0
    $('cur').textContent = fmt(c)
    $('dur').textContent = fmt(d)
    $('seek').value = d ? (c / d) * 1000 : 0
}, 500)

// ============ Eventos ============
$('addForm').addEventListener('submit', (e) => { e.preventDefault(); add($('links').value); $('links').value = '' })
$('links').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('addForm').requestSubmit() }
})
$('links').addEventListener('paste', () => setTimeout(() => {
    // Si todo lo pegado son enlaces válidos, se agregan de inmediato
    const v = $('links').value
    if (v.trim() && v.split(/\s+/).filter(Boolean).every((p) => parseId(p))) { add(v); $('links').value = '' }
}, 0))

$('list').addEventListener('click', (e) => {
    const rm = e.target.closest('[data-rm]')
    if (rm) {
        e.stopPropagation()
        const i = +rm.dataset.rm
        const wasCurrent = i === state.index
        state.queue.splice(i, 1)
        history = []
        if (i < state.index) state.index--
        if (wasCurrent) {
            if (state.queue.length) {
                state.index = Math.min(i, state.queue.length - 1)
                if (ready) player.loadVideoById(state.queue[state.index].id)
            } else {
                state.index = -1
                if (ready) player.stopVideo()
                playing = false
            }
        }
        save(); updatePlayIcon(); return
    }
    const li = e.target.closest('li')
    if (li) playAt(+li.dataset.i)
})

// Reordenar arrastrando
let dragFrom = null
const clearDrop = () => document.querySelectorAll('#list li').forEach((l) => l.classList.remove('opacity-40', 'shadow-[inset_0_2px_0_var(--c-accent)]'))
$('list').addEventListener('dragstart', (e) => {
    const li = e.target.closest('li'); if (!li) return
    dragFrom = +li.dataset.i
    li.classList.add('opacity-40')
})
$('list').addEventListener('dragend', () => { dragFrom = null; clearDrop() })
$('list').addEventListener('dragover', (e) => {
    e.preventDefault()
    const li = e.target.closest('li')
    document.querySelectorAll('#list li').forEach((l) => l.classList.remove('shadow-[inset_0_2px_0_var(--c-accent)]'))
    if (li) li.classList.add('shadow-[inset_0_2px_0_var(--c-accent)]')
})
$('list').addEventListener('drop', (e) => {
    e.preventDefault()
    const li = e.target.closest('li'); if (!li || dragFrom === null) return
    const to = +li.dataset.i; if (to === dragFrom) return
    const curUid = state.queue[state.index]?.uid
    const [m] = state.queue.splice(dragFrom, 1)
    state.queue.splice(to, 0, m)
    state.index = state.queue.findIndex((q) => q.uid === curUid)
    history = []; save(); render()
})

$('clearBtn').addEventListener('click', () => {
    if (!state.queue.length || !confirm('¿Vaciar toda la lista?')) return
    state.queue = []; state.index = -1; history = []
    if (ready) player.stopVideo()
    playing = false
    save(); updatePlayIcon()
})

$('playBtn').addEventListener('click', toggle)
$('nextBtn').addEventListener('click', () => next())
$('prevBtn').addEventListener('click', prev)
$('shufBtn').addEventListener('click', () => { state.shuffle = !state.shuffle; history = []; save(); render() })
$('repBtn').addEventListener('click', () => { state.repeat = { off: 'all', all: 'one', one: 'off' }[state.repeat]; save(); render() })

$('seek').addEventListener('input', () => {
    seeking = true
    if (ready) $('cur').textContent = fmt(player.getDuration() * $('seek').value / 1000)
})
$('seek').addEventListener('change', () => {
    if (ready) player.seekTo(player.getDuration() * $('seek').value / 1000, true)
    seeking = false
})

$('vol').value = state.volume
$('vol').addEventListener('input', () => {
    state.volume = +$('vol').value
    if (ready) { player.setVolume(state.volume); if (state.volume > 0) player.unMute() }
    save()
})

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') toggleThemeMenu(false)
    if (['TEXTAREA', 'INPUT'].includes(e.target.tagName)) return
    if (e.code === 'Space') { e.preventDefault(); toggle() }
    else if (e.key === 'ArrowRight' && e.shiftKey) next()
    else if (e.key === 'ArrowLeft' && e.shiftKey) prev()
})

// ============ Reproductor de YouTube ============
window.onYouTubeIframeAPIReady = () => {
    player = new YT.Player('yt', {
        width: '100%',
        height: '100%',
        playerVars: { playsinline: 1, rel: 0 },
        events: {
            onReady: () => {
                ready = true
                player.setVolume(state.volume)
                // Deja lista la canción donde te quedaste, sin reproducirla sola
                if (state.index >= 0 && state.queue[state.index]) player.cueVideoById(state.queue[state.index].id)
            },
            onStateChange: (e) => {
                if (e.data === YT.PlayerState.PLAYING) {
                    playing = true
                    const it = state.queue[state.index]
                    const t = player.getVideoData?.().title
                    if (it && t && it.title !== t) { it.title = t; save() }
                    if (it) it.error = false
                } else if (e.data === YT.PlayerState.PAUSED || e.data === YT.PlayerState.CUED) {
                    playing = false
                } else if (e.data === YT.PlayerState.ENDED) {
                    playing = false; updatePlayIcon(); next(true); return
                }
                updatePlayIcon()
            },
            onError: () => {
                const it = state.queue[state.index]
                if (it) { it.error = true; flash('Ese video no permite reproducirse fuera de YouTube. Saltando…'); save() }
                setTimeout(() => next(true), 1200)
            },
        },
    })
}

const yt = document.createElement('script')
yt.src = 'https://www.youtube.com/iframe_api'
yt.onerror = () => flash('No se pudo cargar el reproductor de YouTube. Revisa la conexión.')
document.head.appendChild(yt)

render()