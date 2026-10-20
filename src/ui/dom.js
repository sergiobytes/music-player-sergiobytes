// Utilidades de DOM y formato que comparten las vistas

export const $ = (id) => document.getElementById(id)

export const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
export const short = (s, n = 40) => s.length > n ? s.slice(0, n - 1) + '…' : s
export const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`
export const thumb = (id) => `https://i.ytimg.com/vi/${id}/mqdefault.jpg`

// Notas sobre los enlaces que no se pudieron usar (resultado de resolveLinks)
export function linkNotes({ capped, badLists, bad }) {
    let m = ''
    if (capped) m += ' YouTube solo permite leer los primeros 200 videos de una playlist.'
    if (badLists) m += ` No se pudo leer ${badLists > 1 ? badLists + ' playlists' : 'la playlist'} (puede ser privada).`
    if (bad) m += ` ${bad} enlace${bad > 1 ? 's' : ''} no reconocido${bad > 1 ? 's' : ''}.`
    return m
}

// Pinta la parte recorrida de una barra (progreso o volumen)
export const fill = (el) => el.style.setProperty('--p', ((el.value - el.min) / (el.max - el.min)) * 100 + '%')

export const fmt = (s) => { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0') }

const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' })
export function since(t) {
    const s = (Date.now() - t) / 1000
    if (s < 60) return 'hace un momento'
    if (s < 3600) return rtf.format(-Math.floor(s / 60), 'minute')
    if (s < 86400) return rtf.format(-Math.floor(s / 3600), 'hour')
    return rtf.format(-Math.floor(s / 86400), 'day')
}

// Íconos que se dibujan desde JS
export const PATH = {
    play: 'M8 5v14l11-7z',
    pause: 'M6 19h4V5H6v14zm8-14v14h4V5h-4z',
    plus: 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z',
    close: 'M19 6.4 17.6 5 12 10.6 6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12z',
    check: 'M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z',
    edit: 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z',
    shuffle: 'M10.6 9.2 5.4 4 4 5.4l5.2 5.2 1.4-1.4ZM14.5 4l2 2L4 18.6 5.4 20 18 7.5l2 2V4h-5.5Zm.3 9.4-1.4 1.4 3.1 3.1-2 2.1H20v-5.5l-2 2-3.2-3.1Z',
    playlist: 'M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z',
    playlistAdd: 'M14 10H3v2h11v-2zm0-4H3v2h11V6zm4 8v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zM3 16h7v-2H3v2z',
}
export const svg = (d, cls = 'size-4') => `<svg viewBox="0 0 24 24" class="${cls} fill-current" aria-hidden="true"><path d="${d}"/></svg>`
