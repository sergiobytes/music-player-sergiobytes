// Pestaña "Cola": lista, quitar con deshacer, reordenar arrastrando y vaciar con confirmación

import { $, esc, short, thumb, PATH, svg } from './dom.js'
import { flash } from './toast.js'
import { isTab } from './tabs.js'
import { openPicker } from './playlist-picker.js'
import { state } from '../core/state.js'
import { pb, playAt } from '../core/player.js'
import { removeAt, clear, move } from '../core/queue.js'

const eq = (paused) => `<span class="eq ${paused ? 'paused' : ''}"><span></span><span></span><span></span></span>`

export function render() {
    const n = state.queue.length
    $('empty').classList.toggle('hidden', n > 0)
    $('clearBtn').classList.toggle('hidden', !n || !isTab('queue'))
    $('count').textContent = n || ''
    $('list').innerHTML = state.queue.map((it, i) => {
        const cur = i === state.index
        return `
    <li draggable="true" data-i="${i}" tabindex="0"
      class="group grid cursor-pointer grid-cols-[1.5rem_4rem_minmax(0,1fr)_auto] items-center gap-3 rounded-xl p-2 transition-colors sm:grid-cols-[2rem_5rem_minmax(0,1fr)_auto] ${cur ? 'bg-panel2 ring-1 ring-line' : 'hover:bg-panel'}">
      <span class="grid place-items-center text-sm text-muted tabular-nums">${cur ? eq(!pb.playing) : i + 1}</span>
      <img src="${thumb(it.id)}" alt="" loading="lazy" draggable="false" class="aspect-video w-full rounded-md bg-panel2 object-cover">
      <span class="min-w-0">
        <span class="block truncate text-sm font-medium ${it.error ? 'text-danger line-through' : cur ? 'text-accent' : ''}" title="${esc(it.title)}">${esc(it.title)}</span>
        <span class="block truncate text-xs text-muted">${it.error ? 'No se puede reproducir fuera de YouTube' : esc(it.author || 'YouTube')}</span>
      </span>
      <span class="flex items-center">
        <button type="button" data-pl-add="${i}" title="Agregar a playlist" class="row-btn">${svg(PATH.playlistAdd)}</button>
        <button type="button" data-rm="${i}" title="Quitar" class="row-btn hover:text-danger">${svg(PATH.close)}</button>
      </span>
    </li>`
    }).join('')
}

function bindDrag() {
    const DROP = 'shadow-[inset_0_2px_0_var(--c-accent)]'
    const rows = () => document.querySelectorAll('#list li')
    let from = null
    $('list').addEventListener('dragstart', (e) => {
        const li = e.target.closest('li'); if (!li) return
        from = +li.dataset.i
        li.classList.add('opacity-40')
    })
    $('list').addEventListener('dragend', () => { from = null; rows().forEach((l) => l.classList.remove('opacity-40', DROP)) })
    $('list').addEventListener('dragover', (e) => {
        e.preventDefault()
        const li = e.target.closest('li')
        rows().forEach((l) => l.classList.remove(DROP))
        if (li) li.classList.add(DROP)
    })
    $('list').addEventListener('drop', (e) => {
        e.preventDefault()
        const li = e.target.closest('li'); if (!li || from === null) return
        const to = +li.dataset.i; if (to === from) return
        move(from, to)
    })
}

function bindClear() {
    const dlg = $('clearDlg')
    $('clearBtn').addEventListener('click', () => {
        const n = state.queue.length
        if (!n) return
        $('clearDlgText').textContent = n > 1
            ? `Se quitarán las ${n} canciones de la cola y se detendrá la reproducción.`
            : 'Se quitará la canción de la cola y se detendrá la reproducción.'
        // returnValue se conserva entre aperturas; sin esto, cerrar con Esc repetiría la última respuesta
        dlg.returnValue = ''
        dlg.showModal()
    })
    // Clic fuera del cuadro = cancelar
    dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close('cancel') })
    dlg.addEventListener('close', () => {
        if (dlg.returnValue !== 'confirm') return
        flash('Se vació la lista.', { label: 'Deshacer', run: clear() })
    })
}

export function init() {
    $('list').addEventListener('click', (e) => {
        const pl = e.target.closest('[data-pl-add]')
        if (pl) { openPicker(pl, state.queue[+pl.dataset.plAdd]); return }
        const rm = e.target.closest('[data-rm]')
        if (rm) {
            e.stopPropagation()
            const { item, undo } = removeAt(+rm.dataset.rm)
            flash(`Se quitó «${short(item.title)}».`, { label: 'Deshacer', run: undo })
            return
        }
        const li = e.target.closest('li')
        if (li) playAt(+li.dataset.i)
    })
    $('list').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target.matches('li')) playAt(+e.target.dataset.i)
    })
    bindDrag()
    bindClear()
}
