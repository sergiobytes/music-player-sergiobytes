// Estado que se guarda en el navegador (cola, historial y preferencias) y aviso de cambios a las vistas

const KEY = 'rola-state-v1'
export const RECENT_MAX = 50
export const LOADING = 'Cargando título…'

export const state = { queue: [], index: -1, shuffle: false, repeat: 'off', volume: 80, recent: [] }
try {
    const s = JSON.parse(localStorage.getItem(KEY))
    if (s && Array.isArray(s.queue)) Object.assign(state, s)
    if (!Array.isArray(state.recent)) state.recent = []
} catch (e) { }

export const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)) } catch (e) { } }

// Las vistas se suscriben y se vuelven a pintar con cada cambio
const listeners = []
export const subscribe = (fn) => { listeners.push(fn) }
export const notify = () => listeners.forEach((fn) => fn())
export const commit = () => { save(); notify() }

// Agrupa muchos cambios seguidos (por ejemplo, títulos que llegan de a uno) en un solo guardado
let soonT
export const commitSoon = () => { clearTimeout(soonT); soonT = setTimeout(commit, 150) }

export const newItem = (id, title = LOADING, author = '') => ({ id, title, author, uid: Math.random().toString(36).slice(2) })

// Historial de canciones que terminaron y salieron de la cola (la más reciente primero, sin repetir)
export function addRecent(it) {
    const entry = { id: it.id, title: it.title, author: it.author || '', at: Date.now() }
    state.recent = [entry, ...state.recent.filter((r) => r.id !== it.id)].slice(0, RECENT_MAX)
}

// Borra el historial y devuelve la función para deshacerlo
export function clearRecent() {
    const prev = state.recent
    state.recent = []
    commit()
    return () => {
        // Si mientras tanto terminó otra canción, queda arriba de las recuperadas
        const ids = new Set(state.recent.map((r) => r.id))
        state.recent = [...state.recent, ...prev.filter((r) => !ids.has(r.id))].slice(0, RECENT_MAX)
        commit()
    }
}
