// Campo para pegar enlaces: agrega videos y playlists de YouTube a la cola

import { $, linkNotes } from './dom.js'
import { flash } from './toast.js'
import { offerSave } from './playlist-actions.js'
import { newItem, commitSoon } from '../core/state.js'
import { parseId, parseList, resolveLinks, queueTitle } from '../core/youtube.js'
import { append } from '../core/queue.js'

async function add(text) {
    const r = await resolveLinks(text, () => flash('Cargando playlist…'))
    const items = r.ids.map((id) => newItem(id))
    items.forEach((it) => queueTitle(it, commitSoon))
    append(items)
    const added = items.length
    const m = (added ? `${added} ${added > 1 ? 'canciones' : 'canción'} agregada${added > 1 ? 's' : ''} a la cola.` : '') + linkNotes(r)
    // Si lo agregado es exactamente una playlist de YouTube, se ofrece guardarla
    const offer = r.lists.length === 1 && r.lists[0].count === added
    flash(m.trim(), offer ? { label: 'Guardar como playlist', run: () => offerSave(items, r.lists[0].title) } : undefined)
}

export function init() {
    // Placeholder corto en pantallas angostas para que no se corte
    const wide = matchMedia('(min-width: 640px)')
    const setPlaceholder = () => {
        $('links').placeholder = wide.matches ? 'Pega enlaces de videos o playlists de YouTube y presiona Enter' : 'Enlaces de YouTube'
    }
    wide.addEventListener('change', setPlaceholder)
    setPlaceholder()

    $('addForm').addEventListener('submit', (e) => { e.preventDefault(); add($('links').value); $('links').value = '' })
    $('links').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('addForm').requestSubmit() }
    })
    $('links').addEventListener('paste', () => setTimeout(() => {
        // Si todo lo pegado son enlaces válidos, se agregan de inmediato
        const v = $('links').value
        if (v.trim() && v.split(/\s+/).filter(Boolean).every((p) => parseList(p) || parseId(p))) { add(v); $('links').value = '' }
    }, 0))
}
