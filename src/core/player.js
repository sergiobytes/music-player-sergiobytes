// Reproductor de YouTube y control de la reproducción sobre la cola

import { state, save, commit, notify, addRecent } from './state.js'

// Estado de la reproducción que no se guarda
export const pb = { ready: false, playing: false, seeking: false }

let player = null
let lastVolume = state.volume || 80
// Canciones que sonaron antes en modo aleatorio, para que "Anterior" regrese a ellas
let shuffleHistory = []
export const resetHistory = () => { shuffleHistory = [] }

export function playAt(i, remember = true) {
    if (i < 0 || i >= state.queue.length) return
    if (remember && state.index >= 0 && state.index !== i) shuffleHistory.push(state.index)
    state.index = i
    commit()
    if (pb.ready) player.loadVideoById(state.queue[i].id)
}

function nextIndex() {
    const n = state.queue.length
    if (!n) return -1
    if (state.shuffle && n > 1) {
        let r
        do { r = Math.floor(Math.random() * n) } while (r === state.index)
        return r
    }
    if (state.index + 1 < n) return state.index + 1
    return state.repeat === 'all' ? 0 : -1
}

export function next(auto = false) {
    if (auto && state.repeat === 'one') { player.seekTo(0); player.playVideo(); return }
    const i = nextIndex()
    if (i >= 0) playAt(i)
    else if (auto) { pb.playing = false; notify() }
}

export function prev() {
    if (pb.ready && player.getCurrentTime && player.getCurrentTime() > 3) { player.seekTo(0); return }
    if (state.shuffle && shuffleHistory.length) { playAt(shuffleHistory.pop(), false); return }
    if (state.index > 0) playAt(state.index - 1)
    else if (pb.ready) player.seekTo(0)
}

export function toggle() {
    if (!pb.ready) return
    if (state.index < 0 && state.queue.length) { playAt(0); return }
    pb.playing ? player.pauseVideo() : player.playVideo()
}

// Quita la canción actual y pasa a la siguiente; si no hay más, detiene y vacía el reproductor
export function removeCurrent() {
    const i = state.index
    const [item] = state.queue.splice(i, 1)
    resetHistory()
    const n = state.queue.length
    // La siguiente canción ocupa ahora el lugar de la que se quitó
    let to = -1
    if (n && state.shuffle) to = Math.floor(Math.random() * n)
    else if (i < n) to = i
    else if (n && state.repeat === 'all') to = 0
    state.index = -1
    if (to >= 0) playAt(to, false)
    else {
        stop()
        pb.playing = false
        commit()
    }
    return item
}

// Al terminar una canción sin repetición activa, pasa al historial, sale de la cola y suena la siguiente
function ended() {
    if (state.repeat !== 'off') { next(true); return }
    if (state.index < 0) return
    addRecent(state.queue[state.index])
    removeCurrent()
}

// El volumen solo se guarda: repintar todo en cada movimiento de la barra sería innecesario
export function setVolume(v) {
    state.volume = v
    if (v > 0) lastVolume = v
    if (pb.ready) { player.setVolume(v); if (v > 0) player.unMute() }
    save()
}
export const toggleMute = () => setVolume(state.volume > 0 ? 0 : lastVolume)

export const currentTime = () => (pb.ready ? player.getCurrentTime() || 0 : 0)
export const duration = () => (pb.ready ? player.getDuration() || 0 : 0)
export function seekTo(sec) { if (pb.ready) player.seekTo(sec, true) }
export function load(id, startSeconds = 0) { if (pb.ready) player.loadVideoById({ videoId: id, startSeconds }) }
export function cue(id, startSeconds = 0) { if (pb.ready) player.cueVideoById({ videoId: id, startSeconds }) }
export function stop() { if (pb.ready) player.stopVideo() }

export function initPlayer({ onVideoError, onApiError }) {
    window.onYouTubeIframeAPIReady = () => {
        player = new YT.Player('yt', {
            width: '100%',
            height: '100%',
            playerVars: { playsinline: 1, rel: 0 },
            events: {
                onReady: () => {
                    pb.ready = true
                    player.setVolume(state.volume)
                    // Deja lista la canción donde te quedaste, sin reproducirla sola
                    if (state.index >= 0 && state.queue[state.index]) player.cueVideoById(state.queue[state.index].id)
                },
                onStateChange: (e) => {
                    if (e.data === YT.PlayerState.PLAYING) {
                        pb.playing = true
                        const it = state.queue[state.index]
                        const d = player.getVideoData?.() || {}
                        if (it && d.title && it.title !== d.title) { it.title = d.title; save() }
                        if (it && d.author && it.author !== d.author) { it.author = d.author; save() }
                        if (it) it.error = false
                    } else if (e.data === YT.PlayerState.PAUSED || e.data === YT.PlayerState.CUED) {
                        pb.playing = false
                    } else if (e.data === YT.PlayerState.ENDED) {
                        pb.playing = false; notify(); ended(); return
                    }
                    notify()
                },
                onError: () => {
                    const it = state.queue[state.index]
                    if (it) { it.error = true; onVideoError(); save() }
                    setTimeout(() => next(true), 1200)
                },
            },
        })
    }

    const s = document.createElement('script')
    s.src = 'https://www.youtube.com/iframe_api'
    s.onerror = onApiError
    document.head.appendChild(s)
}
