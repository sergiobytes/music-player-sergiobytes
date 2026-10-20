// Pestaña "Escuchadas": canciones que terminaron, para volver a agregarlas a la cola

import { $, esc, short, thumb, since, PATH, svg } from './dom.js'
import { flash } from './toast.js'
import { isTab } from './tabs.js'
import { openPicker } from './playlist-picker.js'
import { state, newItem, clearRecent } from '../core/state.js'
import { append } from '../core/queue.js'

export function render() {
    const r = state.recent
    $('recentCount').textContent = r.length || ''
    $('recentEmpty').classList.toggle('hidden', r.length > 0)
    $('clearRecentBtn').classList.toggle('hidden', !r.length || !isTab('recent'))
    if (!isTab('recent')) return
    const inQueue = new Set(state.queue.map((q) => q.id))
    $('recentList').innerHTML = r.map((it, i) => `
    <li data-r="${i}" tabindex="0" title="Agregar a la cola"
      class="group grid cursor-pointer grid-cols-[4rem_minmax(0,1fr)_auto] items-center gap-3 rounded-xl p-2 transition-colors hover:bg-panel sm:grid-cols-[5rem_minmax(0,1fr)_auto]">
      <img src="${thumb(it.id)}" alt="" loading="lazy" class="aspect-video w-full rounded-md bg-panel2 object-cover">
      <span class="min-w-0">
        <span class="block truncate text-sm font-medium" title="${esc(it.title)}">${esc(it.title)}</span>
        <span class="block truncate text-xs text-muted">${esc(it.author || 'YouTube')} · ${since(it.at)}${inQueue.has(it.id) ? ' · <span class="text-accent">En la cola</span>' : ''}</span>
      </span>
      <span class="flex items-center gap-1">
        <button type="button" data-pl-add="${i}" title="Agregar a playlist" class="row-btn">${svg(PATH.playlistAdd)}</button>
        <span class="flex items-center gap-1 rounded-lg px-2 py-1.5 text-[13px] font-semibold text-muted transition group-hover:bg-panel2 group-hover:text-fg">
          ${svg(PATH.plus)}
          <span class="max-sm:sr-only">Agregar</span>
        </span>
      </span>
    </li>`).join('')
}

// Vuelve a poner una canción del historial al final de la cola; si no sonaba nada, arranca
function requeue(r) {
    append([newItem(r.id, r.title, r.author)])
    flash(`Se agregó «${short(r.title)}» a la cola.`)
}

export function init() {
    $('recentList').addEventListener('click', (e) => {
        const pl = e.target.closest('[data-pl-add]')
        if (pl) { openPicker(pl, state.recent[+pl.dataset.plAdd]); return }
        const li = e.target.closest('[data-r]')
        if (li) requeue(state.recent[+li.dataset.r])
    })
    $('recentList').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target.matches('[data-r]')) requeue(state.recent[+e.target.dataset.r])
    })
    $('clearRecentBtn').addEventListener('click', () => {
        flash('Se borró el historial.', { label: 'Deshacer', run: clearRecent() })
    })
}
