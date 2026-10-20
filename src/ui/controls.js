// Barra del reproductor: botones, progreso, volumen y atajos de teclado

import { $, fill, fmt, PATH } from './dom.js'
import { state, commit } from '../core/state.js'
import { pb, toggle, next, prev, resetHistory, setVolume, toggleMute, currentTime, duration, seekTo } from '../core/player.js'

const VOL_HIGH = '<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z"/>'
const VOL_LOW = '<path d="M5 9v6h4l5 5V4L9 9H5zm13.5 3A4.5 4.5 0 0 0 16 8v8a4.5 4.5 0 0 0 2.5-4z"/>'
const VOL_MUTE = '<path d="M16.5 12A4.5 4.5 0 0 0 14 8v2.2l2.5 2.5V12zm2.5 0c0 .9-.2 1.8-.5 2.6l1.5 1.5A8.8 8.8 0 0 0 21 12a9 9 0 0 0-7-8.8v2.1a7 7 0 0 1 5 6.7zM4.3 3 3 4.3 7.7 9H3v6h4l5 5v-6.7l4.3 4.3c-.7.5-1.4.9-2.3 1.2v2.1a9 9 0 0 0 3.7-1.8l2 2 1.3-1.3-9-9L4.3 3zM12 4 9.9 6.1 12 8.2V4z"/>'

export function render() {
    $('playIcon').innerHTML = `<path d="${pb.playing ? PATH.pause : PATH.play}"/>`
    $('shufBtn').classList.toggle('on', state.shuffle)
    $('repBtn').classList.toggle('on', state.repeat !== 'off')
    $('repBtn').classList.toggle('rep-one', state.repeat === 'one')
    $('repBtn').title = { off: 'Repetir', all: 'Repetir: toda la lista', one: 'Repetir: una canción' }[state.repeat]
}

function renderVolume() {
    const v = state.volume
    $('vol').value = v
    fill($('vol'))
    $('volIcon').innerHTML = v === 0 ? VOL_MUTE : v < 50 ? VOL_LOW : VOL_HIGH
}

const mute = () => { toggleMute(); renderVolume() }

export function init() {
    $('playBtn').addEventListener('click', toggle)
    $('nextBtn').addEventListener('click', () => next())
    $('prevBtn').addEventListener('click', prev)
    $('shufBtn').addEventListener('click', () => { state.shuffle = !state.shuffle; resetHistory(); commit() })
    $('repBtn').addEventListener('click', () => { state.repeat = { off: 'all', all: 'one', one: 'off' }[state.repeat]; commit() })

    $('seek').addEventListener('input', () => {
        pb.seeking = true
        fill($('seek'))
        if (pb.ready) $('cur').textContent = fmt(duration() * $('seek').value / 1000)
    })
    $('seek').addEventListener('change', () => {
        seekTo(duration() * $('seek').value / 1000)
        pb.seeking = false
    })

    $('vol').addEventListener('input', () => { setVolume(+$('vol').value); renderVolume() })
    $('muteBtn').addEventListener('click', mute)
    renderVolume()
    fill($('seek'))

    setInterval(() => {
        if (!pb.ready || pb.seeking) return
        const d = duration(), c = currentTime()
        $('cur').textContent = fmt(c)
        $('dur').textContent = fmt(d)
        $('seek').value = d ? (c / d) * 1000 : 0
        fill($('seek'))
    }, 500)

    document.addEventListener('keydown', (e) => {
        // Con un diálogo abierto, el teclado es para sus botones y campos
        if (document.querySelector('dialog[open]') || ['TEXTAREA', 'INPUT'].includes(e.target.tagName)) return
        if (e.code === 'Space') { e.preventDefault(); toggle() }
        else if (e.key === 'ArrowRight' && e.shiftKey) next()
        else if (e.key === 'ArrowLeft' && e.shiftKey) prev()
        else if (e.key.toLowerCase() === 'm' && !e.ctrlKey && !e.metaKey && !e.altKey) mute()
    })
}
