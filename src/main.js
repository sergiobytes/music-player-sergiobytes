import './style.css'

const $ = (id) => document.getElementById(id)

// ============ Temas ============
const THEMES = [
    { id: 'atardecer', name: 'Atardecer', dark: true, colors: ['#121214', '#ff7a45', '#ffb347'] },
    { id: 'medianoche', name: 'Medianoche', dark: true, colors: ['#0d1020', '#7c8cff', '#c084fc'] },
    { id: 'bosque', name: 'Bosque', dark: true, colors: ['#0f1512', '#4fd1a5', '#c6e86b'] },
    { id: 'neon', name: 'Neón', dark: true, colors: ['#0b0b0f', '#ff3ea5', '#00e5ff'] },
    { id: 'oceano', name: 'Océano', dark: true, colors: ['#08141a', '#22d3ee', '#60a5fa'] },
    { id: 'cereza', name: 'Cereza', dark: true, colors: ['#150b0f', '#ff4d79', '#ff9eb5'] },
    { id: 'cafe', name: 'Café', dark: true, colors: ['#14100c', '#d9a066', '#f0c987'] },
    { id: 'grafito', name: 'Grafito', dark: true, colors: ['#0e0e0f', '#ffffff', '#a1a1a6'] },
    { id: 'contraste', name: 'Alto contraste', dark: true, colors: ['#000000', '#ffd60a', '#ffffff'] },
    { id: 'claro', name: 'Claro', dark: false, colors: ['#f6f5f2', '#e2572b', '#f29d38'] },
    { id: 'lavanda', name: 'Lavanda', dark: false, colors: ['#f6f4fb', '#7c3aed', '#c026d3'] },
    { id: 'menta', name: 'Menta', dark: false, colors: ['#f2f8f5', '#0b7f58', '#0e9f9e'] },
]
const THEME_KEY = 'rola-theme'

function applyTheme(id) {
    document.documentElement.dataset.theme = id
    try { localStorage.setItem(THEME_KEY, id) } catch (e) { }
    renderThemeMenu()
}

function renderThemeMenu() {
    const current = document.documentElement.dataset.theme
    // Color de la barra del navegador en móviles
    const theme = THEMES.find((t) => t.id === current)
    if (theme) document.querySelector('meta[name="theme-color"]').content = theme.colors[0]
    const item = (t) => `
    <button type="button" role="menuitemradio" aria-checked="${t.id === current}" data-theme-id="${t.id}"
      class="flex w-full cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2 text-left text-sm transition hover:bg-panel2 ${t.id === current ? 'bg-panel2/60 text-accent font-semibold' : 'text-fg'}">
      <span class="flex overflow-hidden rounded-md ring-1 ring-line">
        ${t.colors.map((c) => `<span class="block h-6 w-3.5" style="background:${c}"></span>`).join('')}
      </span>
      <span class="flex-1">${t.name}</span>
      ${t.id === current ? '<svg viewBox="0 0 24 24" class="size-4 fill-current"><path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg>' : ''}
    </button>`
    const group = (label, list) => `
    <div role="presentation" class="px-2.5 pt-2.5 pb-1 text-[11px] font-semibold tracking-[0.18em] text-muted uppercase">${label}</div>
    ${list.map(item).join('')}`
    $('themeMenu').innerHTML = group('Oscuros', THEMES.filter((t) => t.dark)) + group('Claros', THEMES.filter((t) => !t.dark))
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
const VOL_HIGH = '<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z"/>'
const VOL_LOW = '<path d="M5 9v6h4l5 5V4L9 9H5zm13.5 3A4.5 4.5 0 0 0 16 8v8a4.5 4.5 0 0 0 2.5-4z"/>'
const VOL_MUTE = '<path d="M16.5 12A4.5 4.5 0 0 0 14 8v2.2l2.5 2.5V12zm2.5 0c0 .9-.2 1.8-.5 2.6l1.5 1.5A8.8 8.8 0 0 0 21 12a9 9 0 0 0-7-8.8v2.1a7 7 0 0 1 5 6.7zM4.3 3 3 4.3 7.7 9H3v6h4l5 5v-6.7l4.3 4.3c-.7.5-1.4.9-2.3 1.2v2.1a9 9 0 0 0 3.7-1.8l2 2 1.3-1.3-9-9L4.3 3zM12 4 9.9 6.1 12 8.2V4z"/>'

let state = { queue: [], index: -1, shuffle: false, repeat: 'off', volume: 80 }
try {
    const s = JSON.parse(localStorage.getItem(KEY))
    if (s && Array.isArray(s.queue)) state = { ...state, ...s }
} catch (e) { }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)) } catch (e) { } }

let player = null, ready = false, playing = false, seeking = false
let history = []
let lastVolume = state.volume || 80

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

// Solo los enlaces de playlist (youtube.com/playlist?list=…); un video abierto desde una playlist se agrega solo
function parseList(raw) {
    try {
        const u = new URL(raw.trim())
        const host = u.hostname.replace(/^(www|m|music)\./, '')
        const list = u.searchParams.get('list')
        if (host === 'youtube.com' && u.pathname === '/playlist' && list && /^[\w-]+$/.test(list)) return list
    } catch (e) { }
    return null
}

// Lee los videos de una playlist con un reproductor oculto, sin interrumpir lo que está sonando
function playlistIds(list) {
    if (!window.YT?.Player) return Promise.resolve(null)
    return new Promise((resolve) => {
        const box = document.createElement('div')
        box.style.cssText = 'position:fixed;left:-9999px;top:0;width:200px;height:200px'
        document.body.appendChild(box)
        let helper, poll, timer, done = false
        const finish = (ids) => {
            if (done) return
            done = true
            clearInterval(poll); clearTimeout(timer)
            setTimeout(() => { helper?.destroy(); box.remove() }, 0)
            resolve(ids)
        }
        const check = () => { const ids = helper.getPlaylist?.(); if (ids?.length) finish(ids) }
        timer = setTimeout(() => finish(null), 10000)
        helper = new YT.Player(box.appendChild(document.createElement('div')), {
            width: 200,
            height: 200,
            playerVars: { listType: 'playlist', list },
            events: {
                onReady: () => { poll = setInterval(check, 300); check() },
                onError: () => finish(null),
            },
        })
    })
}

// Guarda y vuelve a pintar una sola vez aunque lleguen muchos títulos seguidos
let renderT
const renderSoon = () => { clearTimeout(renderT); renderT = setTimeout(() => { save(); render() }, 150) }

async function fetchTitle(item) {
    try {
        const r = await fetch('https://www.youtube.com/oembed?format=json&url=' +
            encodeURIComponent('https://www.youtube.com/watch?v=' + item.id))
        if (!r.ok) return
        const d = await r.json()
        if (d.title) item.title = d.title
        if (d.author_name) item.author = d.author_name
        renderSoon()
    } catch (e) { /* el título se completa al reproducirse */ }
}

// Pide los títulos de a pocos para no saturar a YouTube con playlists grandes
const titleQueue = []
let titleWorkers = 0
function queueTitle(item) {
    titleQueue.push(item)
    while (titleWorkers < 4 && titleQueue.length) {
        titleWorkers++
        ;(async () => {
            while (titleQueue.length) await fetchTitle(titleQueue.shift())
            titleWorkers--
        })()
    }
}

async function add(text) {
    const parts = text.split(/[\s,]+/).filter(Boolean)
    const ids = []
    let bad = 0, badLists = 0, capped = false
    for (const p of parts) {
        const list = parseList(p)
        if (list) {
            flash('Cargando playlist…')
            const found = await playlistIds(list)
            if (found?.length) ids.push(...found)
            else badLists++
            // El reproductor de YouTube solo entrega los primeros 200 videos
            if (found?.length >= 200) capped = true
            continue
        }
        const id = parseId(p)
        if (id) ids.push(id)
        else bad++
    }
    const items = ids.map((id) => ({ id, title: 'Cargando título…', author: '', uid: Math.random().toString(36).slice(2) }))
    const wasEmpty = state.index < 0 || !state.queue.length
    state.queue.push(...items)
    items.forEach(queueTitle)
    const added = items.length
    let m = added ? `${added} ${added > 1 ? 'canciones' : 'canción'} agregada${added > 1 ? 's' : ''} a la cola.` : ''
    if (capped) m += ' YouTube solo permite leer los primeros 200 videos de una playlist.'
    if (badLists) m += ` No se pudo leer ${badLists > 1 ? badLists + ' playlists' : 'la playlist'} (puede ser privada).`
    if (bad) m += ` ${bad} enlace${bad > 1 ? 's' : ''} no reconocido${bad > 1 ? 's' : ''}.`
    flash(m.trim())
    save(); render()
    // Solo arranca si no había nada sonando; si ya suena algo, se queda en la cola
    if (added && wasEmpty) playAt(state.queue.indexOf(items[0]))
}

let msgT, undo = null
function hideToast() {
    $('toast').classList.remove('pointer-events-auto')
    $('toast').classList.add('opacity-0', 'translate-y-2', 'pointer-events-none')
    undo = null
}

// Muestra un aviso; con `action` agrega un botón (por ejemplo, "Deshacer")
function flash(t, action) {
    if (!t) return
    $('msg').textContent = t
    undo = action?.run || null
    $('toastAction').textContent = action?.label || ''
    $('toastAction').classList.toggle('hidden', !action)
    // pointer-events se hereda del contenedor (que es none); hay que activarlo explícitamente
    $('toast').classList.remove('opacity-0', 'translate-y-2', 'pointer-events-none')
    $('toast').classList.add('pointer-events-auto')
    clearTimeout(msgT)
    // Los avisos con acción duran más para dar tiempo a reaccionar
    msgT = setTimeout(hideToast, action ? 6000 : 4000)
}

$('toastAction').addEventListener('click', () => { const run = undo; clearTimeout(msgT); hideToast(); run?.() })
// Mientras el cursor está encima, el aviso no se oculta
$('toast').addEventListener('mouseenter', () => clearTimeout(msgT))
$('toast').addEventListener('mouseleave', () => { clearTimeout(msgT); msgT = setTimeout(hideToast, 2500) })

const short = (s, n = 40) => s.length > n ? s.slice(0, n - 1) + '…' : s

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

// Quita la canción actual y pasa a la siguiente; si no hay más, detiene y vacía el reproductor
function removeCurrent() {
    const i = state.index
    const [item] = state.queue.splice(i, 1)
    history = []
    const n = state.queue.length
    // La siguiente canción ocupa ahora el lugar de la que se quitó
    let to = -1
    if (n && state.shuffle) to = Math.floor(Math.random() * n)
    else if (i < n) to = i
    else if (n && state.repeat === 'all') to = 0
    state.index = -1
    if (to >= 0) playAt(to, false)
    else {
        if (ready) player.stopVideo()
        playing = false; save(); updatePlayIcon()
    }
    return item
}

// Al terminar una canción sin repetición activa, sale de la cola y suena la siguiente
function ended() {
    if (state.repeat !== 'off') { next(true); return }
    if (state.index >= 0) removeCurrent()
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

function setVolume(v) {
    state.volume = v
    if (v > 0) lastVolume = v
    $('vol').value = v
    fill($('vol'))
    $('volIcon').innerHTML = v === 0 ? VOL_MUTE : v < 50 ? VOL_LOW : VOL_HIGH
    if (ready) { player.setVolume(v); if (v > 0) player.unMute() }
    save()
}

const toggleMute = () => setVolume(state.volume > 0 ? 0 : lastVolume)

// ============ Render ============
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const thumb = (id) => `https://i.ytimg.com/vi/${id}/mqdefault.jpg`
const eq = (paused) => `<span class="eq ${paused ? 'paused' : ''}"><span></span><span></span><span></span></span>`

// Pinta la parte recorrida de una barra (progreso o volumen)
const fill = (el) => el.style.setProperty('--p', ((el.value - el.min) / (el.max - el.min)) * 100 + '%')

function render() {
    const n = state.queue.length
    $('empty').classList.toggle('hidden', n > 0)
    $('clearBtn').classList.toggle('hidden', !n)
    $('count').classList.toggle('hidden', !n)
    $('count').textContent = n
    $('list').innerHTML = state.queue.map((it, i) => {
        const cur = i === state.index
        return `
    <li draggable="true" data-i="${i}" tabindex="0"
      class="group grid cursor-pointer grid-cols-[1.5rem_4rem_minmax(0,1fr)_auto] items-center gap-3 rounded-xl p-2 transition-colors sm:grid-cols-[2rem_5rem_minmax(0,1fr)_auto] ${cur ? 'bg-panel2 ring-1 ring-line' : 'hover:bg-panel'}">
      <span class="grid place-items-center text-sm text-muted tabular-nums">${cur ? eq(!playing) : i + 1}</span>
      <img src="${thumb(it.id)}" alt="" loading="lazy" draggable="false" class="aspect-video w-full rounded-md bg-panel2 object-cover">
      <span class="min-w-0">
        <span class="block truncate text-sm font-medium ${it.error ? 'text-danger line-through' : cur ? 'text-accent' : ''}" title="${esc(it.title)}">${esc(it.title)}</span>
        <span class="block truncate text-xs text-muted">${it.error ? 'No se puede reproducir fuera de YouTube' : esc(it.author || 'YouTube')}</span>
      </span>
      <button type="button" data-rm="${i}" title="Quitar" class="grid size-8 cursor-pointer place-items-center rounded-lg text-muted opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100 hover:bg-canvas/60 hover:text-danger pointer-coarse:opacity-100">
        <svg viewBox="0 0 24 24" class="size-4 fill-current"><path d="M19 6.4 17.6 5 12 10.6 6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12z"/></svg>
      </button>
    </li>`
    }).join('')

    const cur = state.queue[state.index]
    $('npTitle').textContent = cur ? cur.title : 'Nada sonando'
    $('npAuthor').textContent = cur ? cur.author || 'YouTube'
        : n ? 'Presiona reproducir para seguir con la cola' : 'Agrega canciones para empezar'
    $('npEq').classList.toggle('hidden', !cur)
    $('npEq').classList.toggle('paused', !playing)
    $('stage').classList.toggle('shadow-[0_24px_80px_-28px_var(--c-accent)]', playing)
    $('stagePh').classList.toggle('hidden', !!cur)
    $('ftTitle').textContent = cur ? cur.title : ''
    $('ftAuthor').textContent = cur ? cur.author || 'YouTube' : ''
    $('ftThumb').hidden = !cur
    if (cur && $('ftThumb').dataset.id !== cur.id) { $('ftThumb').src = thumb(cur.id); $('ftThumb').dataset.id = cur.id }

    const ni = state.shuffle ? -1
        : state.index + 1 < n ? state.index + 1
            : state.repeat === 'all' && n ? 0 : -1
    const label = '<div class="mb-2 text-[11px] font-semibold tracking-[0.18em] text-muted uppercase">A continuación</div>'
    if (ni >= 0 && cur) {
        const it = state.queue[ni]
        $('upNext').innerHTML = `${label}
      <button type="button" data-i="${ni}" class="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-line bg-panel/60 p-2 text-left transition hover:bg-panel2">
        <img src="${thumb(it.id)}" alt="" class="aspect-video w-20 flex-none rounded-md bg-panel2 object-cover">
        <span class="min-w-0">
          <span class="block truncate text-sm font-medium">${esc(it.title)}</span>
          <span class="block truncate text-xs text-muted">${esc(it.author || 'YouTube')}</span>
        </span>
      </button>`
    } else if (state.shuffle && cur) {
        $('upNext').innerHTML = `${label}
      <div class="flex items-center gap-3 rounded-xl border border-dashed border-line p-3 text-sm text-muted">
        <svg viewBox="0 0 24 24" class="size-5 flex-none fill-accent"><path d="M10.6 9.2 5.4 4 4 5.4l5.2 5.2 1.4-1.4ZM14.5 4l2 2L4 18.6 5.4 20 18 7.5l2 2V4h-5.5Zm.3 9.4-1.4 1.4 3.1 3.1-2 2.1H20v-5.5l-2 2-3.2-3.1Z"/></svg>
        Modo aleatorio: la siguiente será sorpresa.
      </div>`
    } else {
        $('upNext').innerHTML = ''
    }

    $('shufBtn').classList.toggle('on', state.shuffle)
    $('repBtn').classList.toggle('on', state.repeat !== 'off')
    $('repBtn').classList.toggle('rep-one', state.repeat === 'one')
    $('repBtn').title = { off: 'Repetir', all: 'Repetir: toda la lista', one: 'Repetir: una canción' }[state.repeat]
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
    fill($('seek'))
}, 500)

// Placeholder corto en pantallas angostas para que no se corte
const wide = matchMedia('(min-width: 640px)')
const setPlaceholder = () => {
    $('links').placeholder = wide.matches ? 'Pega enlaces de videos o playlists de YouTube y presiona Enter' : 'Enlaces de YouTube'
}
wide.addEventListener('change', setPlaceholder)
setPlaceholder()

// ============ Eventos ============
$('addForm').addEventListener('submit', (e) => { e.preventDefault(); add($('links').value); $('links').value = '' })
$('links').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('addForm').requestSubmit() }
})
$('links').addEventListener('paste', () => setTimeout(() => {
    // Si todo lo pegado son enlaces válidos, se agregan de inmediato
    const v = $('links').value
    if (v.trim() && v.split(/\s+/).filter(Boolean).every((p) => parseList(p) || parseId(p))) { add(v); $('links').value = '' }
}, 0))

$('list').addEventListener('click', (e) => {
    const rm = e.target.closest('[data-rm]')
    if (rm) {
        e.stopPropagation()
        const i = +rm.dataset.rm
        const wasCurrent = i === state.index
        const at = wasCurrent && ready ? player.getCurrentTime() : 0
        let item
        if (wasCurrent) item = removeCurrent()
        else {
            [item] = state.queue.splice(i, 1)
            history = []
            if (i < state.index) state.index--
            save(); render()
        }
        flash(`Se quitó «${short(item.title)}».`, { label: 'Deshacer', run: () => restore(item, i, wasCurrent, at) })
        return
    }
    const li = e.target.closest('li')
    if (li) playAt(+li.dataset.i)
})

// Deshacer: la canción vuelve a su lugar; si era la que sonaba, sigue desde el mismo segundo
function restore(item, i, wasCurrent, at) {
    const curUid = state.queue[state.index]?.uid
    state.queue.splice(Math.min(i, state.queue.length), 0, item)
    history = []
    if (wasCurrent) {
        state.index = state.queue.indexOf(item)
        if (ready) player.loadVideoById({ videoId: item.id, startSeconds: at })
    } else {
        state.index = state.queue.findIndex((q) => q.uid === curUid)
    }
    save(); render()
}
$('list').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.matches('li')) playAt(+e.target.dataset.i)
})
$('upNext').addEventListener('click', (e) => {
    const b = e.target.closest('[data-i]')
    if (b) playAt(+b.dataset.i)
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
    const n = state.queue.length
    if (!n) return
    $('clearDlgText').textContent = n > 1
        ? `Se quitarán las ${n} canciones de la cola y se detendrá la reproducción.`
        : 'Se quitará la canción de la cola y se detendrá la reproducción.'
    // returnValue se conserva entre aperturas; sin esto, cerrar con Esc repetiría la última respuesta
    $('clearDlg').returnValue = ''
    $('clearDlg').showModal()
})
// Clic fuera del cuadro = cancelar
$('clearDlg').addEventListener('click', (e) => { if (e.target === $('clearDlg')) $('clearDlg').close('cancel') })
$('clearDlg').addEventListener('close', () => {
    if ($('clearDlg').returnValue !== 'confirm') return
    const snap = { queue: state.queue, index: state.index, at: ready && state.index >= 0 ? player.getCurrentTime() : 0 }
    state.queue = []; state.index = -1; history = []
    if (ready) player.stopVideo()
    playing = false
    save(); updatePlayIcon()
    flash('Se vació la lista.', {
        label: 'Deshacer',
        run: () => {
            // Si mientras tanto se agregaron canciones, las anteriores vuelven antes que ellas
            const now = state.index
            state.queue = [...snap.queue, ...state.queue]
            history = []
            if (now >= 0) state.index = now + snap.queue.length
            else {
                state.index = snap.index
                const it = state.queue[snap.index]
                if (ready && it) player.cueVideoById({ videoId: it.id, startSeconds: snap.at })
            }
            save(); render()
        },
    })
})

$('playBtn').addEventListener('click', toggle)
$('nextBtn').addEventListener('click', () => next())
$('prevBtn').addEventListener('click', prev)
$('shufBtn').addEventListener('click', () => { state.shuffle = !state.shuffle; history = []; save(); render() })
$('repBtn').addEventListener('click', () => { state.repeat = { off: 'all', all: 'one', one: 'off' }[state.repeat]; save(); render() })

$('seek').addEventListener('input', () => {
    seeking = true
    fill($('seek'))
    if (ready) $('cur').textContent = fmt(player.getDuration() * $('seek').value / 1000)
})
$('seek').addEventListener('change', () => {
    if (ready) player.seekTo(player.getDuration() * $('seek').value / 1000, true)
    seeking = false
})

$('vol').addEventListener('input', () => setVolume(+$('vol').value))
$('muteBtn').addEventListener('click', toggleMute)
setVolume(state.volume)
fill($('seek'))

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') toggleThemeMenu(false)
    // Con el diálogo abierto, el teclado es para sus botones
    if ($('clearDlg').open || ['TEXTAREA', 'INPUT'].includes(e.target.tagName)) return
    if (e.code === 'Space') { e.preventDefault(); toggle() }
    else if (e.key === 'ArrowRight' && e.shiftKey) next()
    else if (e.key === 'ArrowLeft' && e.shiftKey) prev()
    else if (e.key.toLowerCase() === 'm' && !e.ctrlKey && !e.metaKey && !e.altKey) toggleMute()
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
                    const d = player.getVideoData?.() || {}
                    if (it && d.title && it.title !== d.title) { it.title = d.title; save() }
                    if (it && d.author && it.author !== d.author) { it.author = d.author; save() }
                    if (it) it.error = false
                } else if (e.data === YT.PlayerState.PAUSED || e.data === YT.PlayerState.CUED) {
                    playing = false
                } else if (e.data === YT.PlayerState.ENDED) {
                    playing = false; updatePlayIcon(); ended(); return
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
