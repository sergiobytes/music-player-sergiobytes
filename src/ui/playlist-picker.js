// Menú "Agregar a playlist": elige una playlist para la canción o crea una nueva con ella

import { $, esc, PATH, svg } from './dom.js'
import { playlists, find, has } from '../core/playlists.js'
import { songs, addSong, newPlaylistWith } from './playlist-actions.js'

let song = null

// Lo abre junto al botón que se tocó; si no cabe abajo, se abre hacia arriba
function position(anchor) {
    const menu = $('plPicker')
    const r = anchor.getBoundingClientRect()
    const w = menu.offsetWidth, h = menu.offsetHeight
    const left = Math.min(Math.max(8, r.right - w), innerWidth - w - 8)
    let top = r.bottom + 6
    if (top + h > innerHeight - 8) top = Math.max(8, r.top - h - 6)
    menu.style.left = left + 'px'
    menu.style.top = top + 'px'
}

export function openPicker(anchor, s) {
    song = { id: s.id, title: s.title, author: s.author || '' }
    const menu = $('plPicker')
    menu.innerHTML = `
      <div class="px-2.5 pt-1.5 pb-1 text-[11px] font-semibold tracking-[0.18em] text-muted uppercase">Agregar a playlist</div>
      <button type="button" role="menuitem" data-new class="picker-item font-semibold text-accent">${svg(PATH.plus)} Nueva playlist…</button>
      ${playlists.length ? '<div class="my-1 border-t border-line"></div>' : ''}
      ${playlists.map((p) => `
      <button type="button" role="menuitem" data-p="${p.id}" class="picker-item">
        <span class="min-w-0 flex-1">
          <span class="block truncate">${esc(p.name)}</span>
          <span class="block text-xs text-muted">${has(p, song.id) ? 'Ya está aquí' : songs(p.items.length)}</span>
        </span>
        ${has(p, song.id) ? svg(PATH.check, 'size-4 flex-none text-accent') : ''}
      </button>`).join('')}`
    menu.classList.remove('hidden')
    position(anchor)
    menu.querySelector('button').focus()
}

export function closePicker() {
    $('plPicker').classList.add('hidden')
    song = null
}

export function init() {
    const menu = $('plPicker')
    menu.addEventListener('click', (e) => {
        const b = e.target.closest('button')
        if (!b) return
        const s = song
        closePicker()
        if ('new' in b.dataset) newPlaylistWith(s)
        else addSong(find(b.dataset.p), s)
    })
    // Se cierra al tocar fuera, con Esc, al desplazar o al cambiar el tamaño de la ventana
    document.addEventListener('click', (e) => { if (!e.target.closest('#plPicker, [data-pl-add]')) closePicker() })
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePicker() })
    document.addEventListener('scroll', (e) => { if (!(e.target instanceof Element && e.target.closest('#plPicker'))) closePicker() }, true)
    window.addEventListener('resize', closePicker)
}
