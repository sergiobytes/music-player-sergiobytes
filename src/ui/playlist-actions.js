// Acciones sobre playlists que se usan desde la pestaña Playlists y desde el menú "Agregar a playlist"

import { short, plural, linkNotes } from './dom.js'
import { flash } from './toast.js'
import { openPlaylist, openedPlaylist, setTab } from './tabs.js'
import { askPlaylist } from './dialogs.js'
import { state, notify, commitSoon, newItem, LOADING } from '../core/state.js'
import { has, create, rename, remove, addTracks, removeTracks, removeTrack, persistSoon } from '../core/playlists.js'
import { append, replace } from '../core/queue.js'
import { resolveLinks, queueTitle } from '../core/youtube.js'

export const STORAGE_ERROR = 'No se pudo guardar: el almacenamiento del navegador está lleno.'
export const songs = (n) => plural(n, 'canción', 'canciones')
const defaultName = () => 'Playlist del ' + new Date().toLocaleDateString('es', { day: 'numeric', month: 'short' })
const fromLinks = (ids) => ids.map((id) => ({ id, title: LOADING, author: '' }))

// Los títulos que aún no llegaban se completan y se guardan después
const fillTitles = (items) => items.filter((it) => it.title === LOADING).forEach((it) => queueTitle(it, () => persistSoon(notify)))

// Crea la playlist; desde la pestaña Playlists la abre, desde otro lado ofrece verla
function saveNew(name, items, { note = '', open = true } = {}) {
    const p = create(name, items)
    if (!p) { flash(STORAGE_ERROR); return }
    fillTitles(p.items)
    const msg = p.items.length
        ? `Se guardó «${short(p.name)}» con ${songs(p.items.length)}.${note}`
        : `Se creó «${short(p.name)}». Pega enlaces aquí o usa «Agregar a playlist» en cualquier canción.`
    if (open) { openPlaylist(p.id); flash(msg) }
    else { notify(); flash(msg, { label: 'Ver', run: () => openPlaylist(p.id) }) }
}

// Crea una playlist vacía, con la cola o con enlaces de YouTube (videos o playlists)
export async function createPlaylist() {
    const r = await askPlaylist({ title: 'Crear playlist', create: { queueCount: state.queue.length, defaultName: defaultName() }, ok: 'Crear' })
    if (r.action !== 'ok') return
    if (r.source === 'empty') { saveNew(r.name || defaultName(), []); return }
    if (r.source === 'queue') { saveNew(r.name || defaultName(), state.queue); return }
    flash('Leyendo enlaces…')
    const res = await resolveLinks(r.links)
    if (!res.ids.length) { flash(('No se encontraron canciones en esos enlaces.' + linkNotes(res)).trim()); return }
    // Si todo viene de una sola playlist de YouTube y no se puso nombre, se usa el de YouTube
    const ytName = res.lists.length === 1 && res.lists[0].count === res.ids.length ? res.lists[0].title : null
    saveNew(r.name || ytName || defaultName(), fromLinks(res.ids), { note: linkNotes(res) })
}

// Desde el aviso que aparece al agregar una playlist de YouTube a la cola
export async function offerSave(items, name) {
    const r = await askPlaylist({ title: 'Guardar como playlist', text: `${songs(items.length)} de YouTube.`, name: name || defaultName() })
    if (r.action === 'ok') saveNew(r.name, items, { open: false })
}

// Desde el menú "Agregar a playlist", con la canción elegida
export async function newPlaylistWith(song) {
    const r = await askPlaylist({ title: 'Nueva playlist', text: `Empieza con «${short(song.title)}».`, ok: 'Crear' })
    if (r.action === 'ok') saveNew(r.name, [song], { open: false })
}

export function addSong(p, song) {
    if (has(p, song.id)) { flash(`Ya está en «${short(p.name)}».`); return }
    const { added } = addTracks(p.id, [song])
    if (!added) { flash(STORAGE_ERROR); return }
    fillTitles(added)
    notify()
    flash(`Se agregó a «${short(p.name)}».`, { label: 'Deshacer', run: () => { removeTracks(p.id, added); notify() } })
}

// Agrega a una playlist los videos (o playlists de YouTube completas) de los enlaces pegados
export async function addLinks(p, text) {
    const res = await resolveLinks(text, () => flash('Cargando playlist…'))
    if (!res.ids.length) { flash(('No se encontraron canciones en esos enlaces.' + linkNotes(res)).trim()); return }
    const { added, skipped } = addTracks(p.id, fromLinks(res.ids))
    if (!added) { flash(STORAGE_ERROR); return }
    fillTitles(added)
    notify()
    let m = added.length ? `${added.length === 1 ? 'Se agregó' : 'Se agregaron'} ${songs(added.length)} a «${short(p.name)}».` : 'No había canciones nuevas.'
    if (skipped) m += ` ${skipped === 1 ? '1 ya estaba' : skipped + ' ya estaban'} en la playlist.`
    flash(m + linkNotes(res), added.length ? { label: 'Deshacer', run: () => { removeTracks(p.id, added); notify() } } : undefined)
}

export function removeSong(p, i) {
    const it = p.items[i]
    const undo = removeTrack(p.id, i)
    notify()
    flash(`Se quitó «${short(it.title)}» de la playlist.`, { label: 'Deshacer', run: () => { undo(); notify() } })
}

// Copia las canciones de una playlist como elementos nuevos de la cola
function toQueue(p) {
    const items = p.items.map((it) => newItem(it.id, it.title, it.author))
    items.filter((it) => it.title === LOADING).forEach((it) => queueTitle(it, commitSoon))
    return items
}

// Reemplaza la cola con la playlist (desde la canción `start`), con opción de deshacer
export function play(p, start = 0) {
    if (!p.items.length) { flash('Esta playlist está vacía.'); return }
    flash(`Reproduciendo «${short(p.name)}».`, { label: 'Deshacer', run: replace(toQueue(p), start) })
}

export function addToQueue(p) {
    if (!p.items.length) { flash('Esta playlist está vacía.'); return }
    append(toQueue(p))
    const n = p.items.length
    flash(`${n === 1 ? 'Se agregó' : 'Se agregaron'} ${songs(n)} de «${short(p.name)}» a la cola.`)
}

export async function edit(p) {
    const r = await askPlaylist({ title: 'Editar playlist', name: p.name, withDelete: true })
    if (r.action === 'ok' && r.name && r.name !== p.name) {
        if (!rename(p.id, r.name)) flash(STORAGE_ERROR)
        notify()
    } else if (r.action === 'delete') {
        const wasOpen = openedPlaylist() === p.id
        const undo = remove(p.id)
        // Si estaba abierta, se vuelve a la lista
        if (wasOpen) setTab('playlists')
        else notify()
        flash(`Se eliminó «${short(p.name)}».`, { label: 'Deshacer', run: () => { undo(); notify() } })
    }
}
