// Playlists guardadas. Van en una clave aparte del estado: se escriben poco y perderlas duele más que perder la cola

const KEY = 'rola-playlists-v1'
export const NAME_MAX = 60
const VIDEO_ID = /^[\w-]{11}$/

const newId = () => 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
const track = (it) => ({ id: it.id, title: it.title, author: it.author || '' })

// Normaliza una playlist guardada o importada; devuelve null si no tiene la forma esperada
function clean(p) {
    if (!p || typeof p.name !== 'string' || !Array.isArray(p.items)) return null
    const items = p.items
        .filter((it) => it && VIDEO_ID.test(it.id))
        .map((it) => ({ id: it.id, title: typeof it.title === 'string' ? it.title : 'Sin título', author: typeof it.author === 'string' ? it.author : '' }))
    const now = Date.now()
    return { id: typeof p.id === 'string' ? p.id : newId(), name: p.name.trim().slice(0, NAME_MAX) || 'Sin nombre', items, created: +p.created || now, updated: +p.updated || now }
}

export const playlists = []
try {
    const saved = JSON.parse(localStorage.getItem(KEY))
    if (Array.isArray(saved)) playlists.push(...saved.map(clean).filter(Boolean))
} catch (e) { }

// A diferencia del estado, aquí sí se informa si no se pudo guardar (por ejemplo, almacenamiento lleno)
function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(playlists)); return true } catch (e) { return false }
}

// Para cambios que llegan de a poco, como los títulos que se terminan de cargar
let soonT
export const persistSoon = (done) => { clearTimeout(soonT); soonT = setTimeout(() => { persist(); done?.() }, 300) }

export const find = (id) => playlists.find((p) => p.id === id)

export const has = (p, videoId) => p.items.some((it) => it.id === videoId)

// Crea una playlist (la más nueva queda primero), vacía o con canciones. Devuelve null si no se pudo guardar
export function create(name, items = []) {
    const now = Date.now()
    const p = { id: newId(), name: name.trim().slice(0, NAME_MAX), items: items.map(track), created: now, updated: now }
    playlists.unshift(p)
    if (persist()) return p
    playlists.shift()
    return null
}

export function rename(id, name) {
    const p = find(id)
    const prev = p.name
    p.name = name.trim().slice(0, NAME_MAX)
    p.updated = Date.now()
    if (persist()) return true
    p.name = prev
    return false
}

// Agrega canciones al final, saltando las que ya estaban. Devuelve las agregadas (null si no se pudo guardar)
// y cuántas se saltaron
export function addTracks(id, items) {
    const p = find(id)
    const seen = new Set(p.items.map((it) => it.id))
    const added = []
    for (const it of items) {
        if (seen.has(it.id)) continue
        seen.add(it.id)
        added.push(track(it))
    }
    p.items.push(...added)
    p.updated = Date.now()
    if (persist()) return { added, skipped: items.length - added.length }
    p.items.splice(p.items.length - added.length)
    return { added: null, skipped: 0 }
}

// Deshace un addTracks: quita exactamente esas canciones
export function removeTracks(id, items) {
    const p = find(id)
    if (!p) return
    const drop = new Set(items)
    p.items = p.items.filter((it) => !drop.has(it))
    persist()
}

// Quita una canción y devuelve la función para deshacerlo
export function removeTrack(id, index) {
    const p = find(id)
    const [it] = p.items.splice(index, 1)
    p.updated = Date.now()
    persist()
    return () => { p.items.splice(Math.min(index, p.items.length), 0, it); persist() }
}

// Elimina y devuelve la función para deshacerlo
export function remove(id) {
    const i = playlists.findIndex((p) => p.id === id)
    const [p] = playlists.splice(i, 1)
    persist()
    return () => { playlists.splice(Math.min(i, playlists.length), 0, p); persist() }
}

export const exportData = () => ({ app: 'rola', version: 1, exported: new Date().toISOString(), playlists })

// Misma playlist = mismo nombre y mismas canciones en el mismo orden
const signature = (p) => p.name + '\n' + p.items.map((it) => it.id).join(',')

// Agrega las playlists de un respaldo sin tocar las existentes y salta las que ya están idénticas.
// Devuelve { added, skipped }; lanza un error si el archivo no sirve o no se pudo guardar
export function importData(data) {
    const list = Array.isArray(data) ? data : data?.playlists
    if (!Array.isArray(list)) throw new Error('invalid')
    const found = list.map(clean).filter(Boolean)
    if (!found.length) throw new Error('invalid')
    const existing = new Set(playlists.map(signature))
    // Ids nuevos para no chocar con playlists que ya existan
    const fresh = found.filter((p) => !existing.has(signature(p))).map((p) => ({ ...p, id: newId() }))
    const result = { added: fresh.length, skipped: found.length - fresh.length }
    if (!fresh.length) return result
    playlists.push(...fresh)
    if (persist()) return result
    playlists.splice(playlists.length - fresh.length)
    throw new Error('storage')
}
