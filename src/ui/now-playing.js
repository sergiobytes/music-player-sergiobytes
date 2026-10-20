// "Sonando ahora": panel del video, "A continuación", datos de la barra inferior y título de la pestaña

import { $, esc, thumb, PATH, svg } from './dom.js'
import { state } from '../core/state.js'
import { pb, playAt } from '../core/player.js'
import { openPicker } from './playlist-picker.js'

export function render() {
    const n = state.queue.length
    const cur = state.queue[state.index]
    $('npTitle').textContent = cur ? cur.title : 'Nada sonando'
    $('npAuthor').textContent = cur ? cur.author || 'YouTube'
        : n ? 'Presiona reproducir para seguir con la cola' : 'Agrega canciones para empezar'
    $('npEq').classList.toggle('hidden', !cur)
    $('npSave').classList.toggle('hidden', !cur)
    $('npEq').classList.toggle('paused', !pb.playing)
    $('stage').classList.toggle('shadow-[0_24px_80px_-28px_var(--c-accent)]', pb.playing)
    $('stagePh').classList.toggle('hidden', !!cur)
    $('ftTitle').textContent = cur ? cur.title : ''
    $('ftAuthor').textContent = cur ? cur.author || 'YouTube' : ''
    $('ftThumb').hidden = !cur
    if (cur && $('ftThumb').dataset.id !== cur.id) { $('ftThumb').src = thumb(cur.id); $('ftThumb').dataset.id = cur.id }
    document.title = cur && pb.playing ? '▶ ' + cur.title : 'Rola'
    renderUpNext(cur, n)
}

function renderUpNext(cur, n) {
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
        ${svg(PATH.shuffle, 'size-5 flex-none fill-accent')}
        Modo aleatorio: la siguiente será sorpresa.
      </div>`
    } else {
        $('upNext').innerHTML = ''
    }
}

export function init() {
    $('upNext').addEventListener('click', (e) => {
        const b = e.target.closest('[data-i]')
        if (b) playAt(+b.dataset.i)
    })
    $('npSave').addEventListener('click', () => {
        const cur = state.queue[state.index]
        if (cur) openPicker($('npSave'), cur)
    })
}
