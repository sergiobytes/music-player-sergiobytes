// Pestaña "Playlists": la lista de playlists y la vista de una playlist abierta

import { $, esc, plural, thumb, since, PATH, svg } from './dom.js'
import { flash } from './toast.js'
import { isTab, openedPlaylist, openPlaylist, setTab } from './tabs.js'
import { notify } from '../core/state.js'
import { playlists, find, exportData, importData } from '../core/playlists.js'
import { STORAGE_ERROR, songs, createPlaylist, play, addToQueue, edit, addLinks, removeSong } from './playlist-actions.js'

// Portada: mosaico con las primeras cuatro canciones, la primera si tiene menos, o un ícono si está vacía
function cover(p) {
    const ids = [...new Set(p.items.map((it) => it.id))].slice(0, 4)
    if (!ids.length) return `<span class="grid aspect-video place-items-center rounded-md bg-panel2 text-muted">${svg(PATH.playlist, 'size-6')}</span>`
    if (ids.length < 4) return `<img src="${thumb(ids[0])}" alt="" loading="lazy" class="aspect-video w-full rounded-md bg-panel2 object-cover">`
    const tiles = ids.map((id) => `<img src="${thumb(id)}" alt="" loading="lazy" class="size-full object-cover">`).join('')
    return `<span class="grid aspect-video grid-cols-2 grid-rows-2 overflow-hidden rounded-md bg-panel2">${tiles}</span>`
}

const current = () => find(openedPlaylist())

export function render() {
    const n = playlists.length
    const p = current()
    const onList = isTab('playlists') && !p
    $('playlistsCount').textContent = n || ''
    // Sin playlists, las acciones están en el mensaje de lista vacía
    for (const id of ['plCreateBtn', 'plImportBtn', 'plExportBtn']) $(id).classList.toggle('hidden', !onList || !n)
    $('plListView').hidden = !!p
    $('plDetail').hidden = !p
    $('playlistsEmpty').classList.toggle('hidden', n > 0)
    if (p) renderDetail(p)
    else if (onList) renderList()
}

function renderList() {
    $('playlistsList').innerHTML = playlists.map((p) => `
    <li data-p="${p.id}" tabindex="0" title="Abrir playlist"
      class="grid cursor-pointer grid-cols-[4rem_minmax(0,1fr)_auto] items-center gap-3 rounded-xl p-2 transition-colors hover:bg-panel sm:grid-cols-[5rem_minmax(0,1fr)_auto]">
      ${cover(p)}
      <span class="min-w-0">
        <span class="block truncate text-sm font-medium">${esc(p.name)}</span>
        <span class="block truncate text-xs text-muted">${songs(p.items.length)} · ${since(p.updated)}</span>
      </span>
      <span class="flex items-center gap-1">
        <button type="button" data-act="play" title="Reproducir (reemplaza la cola)" class="pl-btn pl-primary">${svg(PATH.play)}<span class="max-sm:sr-only">Reproducir</span></button>
        <button type="button" data-act="append" title="Agregar al final de la cola" class="pl-btn">${svg(PATH.plus)}<span class="max-sm:sr-only">Agregar</span></button>
      </span>
    </li>`).join('')
}

function renderDetail(p) {
    const n = p.items.length
    $('plDetailCover').innerHTML = cover(p)
    $('plDetailName').textContent = p.name
    $('plDetailMeta').textContent = `${songs(n)} · actualizada ${since(p.updated)}`
    $('plDetailPlay').disabled = !n
    $('plDetailAppend').disabled = !n
    $('plSongsEmpty').classList.toggle('hidden', n > 0)
    $('plSongs').innerHTML = p.items.map((it, i) => `
    <li data-s="${i}" tabindex="0" title="Reproducir la playlist desde aquí"
      class="group grid cursor-pointer grid-cols-[1.5rem_4rem_minmax(0,1fr)_auto] items-center gap-3 rounded-xl p-2 transition-colors hover:bg-panel sm:grid-cols-[2rem_5rem_minmax(0,1fr)_auto]">
      <span class="grid place-items-center text-sm text-muted tabular-nums">${i + 1}</span>
      <img src="${thumb(it.id)}" alt="" loading="lazy" class="aspect-video w-full rounded-md bg-panel2 object-cover">
      <span class="min-w-0">
        <span class="block truncate text-sm font-medium" title="${esc(it.title)}">${esc(it.title)}</span>
        <span class="block truncate text-xs text-muted">${esc(it.author || 'YouTube')}</span>
      </span>
      <button type="button" data-rm-song="${i}" title="Quitar de la playlist" class="row-btn">${svg(PATH.close)}</button>
    </li>`).join('')
}

function exportAll() {
    const blob = new Blob([JSON.stringify(exportData(), null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    const d = new Date()
    const ymd = [d.getFullYear(), d.getMonth() + 1, d.getDate()].map((n) => String(n).padStart(2, '0')).join('-')
    a.download = `rola-playlists-${ymd}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
    flash(`Se exportaron ${plural(playlists.length, 'playlist', 'playlists')}. Guarda el archivo como respaldo.`)
}

async function importFile(file) {
    try {
        const { added, skipped } = importData(JSON.parse(await file.text()))
        notify()
        if (!added) { flash('Esas playlists ya estaban guardadas.'); return }
        const dup = skipped ? ` ${skipped === 1 ? '1 ya existía' : skipped + ' ya existían'}.` : ''
        flash(`Se importaron ${plural(added, 'playlist', 'playlists')}.${dup}`)
    } catch (e) {
        flash(e.message === 'storage' ? STORAGE_ERROR : 'El archivo no es un respaldo válido de Rola.')
    }
}

function bindList() {
    $('playlistsList').addEventListener('click', (e) => {
        const li = e.target.closest('[data-p]')
        if (!li) return
        const p = find(li.dataset.p)
        const b = e.target.closest('[data-act]')
        if (!b) openPlaylist(p.id)
        else if (b.dataset.act === 'play') play(p)
        else addToQueue(p)
    })
    $('playlistsList').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target.matches('[data-p]')) openPlaylist(e.target.dataset.p)
    })
    for (const id of ['plCreateBtn', 'plEmptyCreate']) $(id).addEventListener('click', createPlaylist)
    $('plExportBtn').addEventListener('click', exportAll)
    for (const id of ['plImportBtn', 'plEmptyRestore']) $(id).addEventListener('click', () => $('plFile').click())
    $('plFile').addEventListener('change', () => {
        const file = $('plFile').files[0]
        // Se limpia para poder volver a elegir el mismo archivo
        $('plFile').value = ''
        if (file) importFile(file)
    })
}

function bindDetail() {
    $('plBack').addEventListener('click', () => setTab('playlists'))
    $('plDetailPlay').addEventListener('click', () => play(current()))
    $('plDetailAppend').addEventListener('click', () => addToQueue(current()))
    $('plDetailEdit').addEventListener('click', () => edit(current()))
    $('plAddForm').addEventListener('submit', (e) => {
        e.preventDefault()
        const text = $('plAddLinks').value
        if (!text.trim()) return
        $('plAddLinks').value = ''
        addLinks(current(), text)
    })
    $('plSongs').addEventListener('click', (e) => {
        const rm = e.target.closest('[data-rm-song]')
        if (rm) { removeSong(current(), +rm.dataset.rmSong); return }
        const li = e.target.closest('[data-s]')
        if (li) play(current(), +li.dataset.s)
    })
    $('plSongs').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target.matches('[data-s]')) play(current(), +e.target.dataset.s)
    })
}

export function init() {
    bindList()
    bindDetail()
}
