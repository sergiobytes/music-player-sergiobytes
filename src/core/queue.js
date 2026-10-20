// Operaciones sobre la cola. Las que se pueden deshacer devuelven la función para hacerlo

import { state, commit } from './state.js'
import { pb, playAt, removeCurrent, resetHistory, currentTime, load, cue, stop } from './player.js'

const idle = () => state.index < 0 || !state.queue.length

// Agrega canciones al final; solo arranca si no había nada sonando, así no interrumpe lo que suena
export function append(items) {
    const wasIdle = idle()
    state.queue.push(...items)
    commit()
    if (items.length && wasIdle) playAt(state.queue.indexOf(items[0]))
}

export function removeAt(i) {
    const wasCurrent = i === state.index
    const at = wasCurrent ? currentTime() : 0
    let item
    if (wasCurrent) item = removeCurrent()
    else {
        [item] = state.queue.splice(i, 1)
        resetHistory()
        if (i < state.index) state.index--
        commit()
    }
    // Deshacer: la canción vuelve a su lugar; si era la que sonaba, sigue desde el mismo segundo
    const undo = () => {
        const curUid = state.queue[state.index]?.uid
        state.queue.splice(Math.min(i, state.queue.length), 0, item)
        resetHistory()
        if (wasCurrent) {
            state.index = state.queue.indexOf(item)
            load(item.id, at)
        } else {
            state.index = state.queue.findIndex((q) => q.uid === curUid)
        }
        commit()
    }
    return { item, undo }
}

const snapshot = () => ({ queue: state.queue, index: state.index, at: state.index >= 0 ? currentTime() : 0, playing: pb.playing })

export function clear() {
    const snap = snapshot()
    state.queue = []; state.index = -1; resetHistory()
    stop()
    pb.playing = false
    commit()
    return () => {
        // Si mientras tanto se agregaron canciones, las anteriores vuelven antes que ellas
        const now = state.index
        state.queue = [...snap.queue, ...state.queue]
        resetHistory()
        if (now >= 0) state.index = now + snap.queue.length
        else {
            state.index = snap.index
            const it = state.queue[snap.index]
            if (it) cue(it.id, snap.at)
        }
        commit()
    }
}

// Cambia la cola completa por otra (por ejemplo, una playlist guardada) y empieza a sonar desde `start`
export function replace(items, start = 0) {
    const snap = snapshot()
    state.queue = [...items]; state.index = -1; resetHistory()
    if (items.length) playAt(Math.min(start, items.length - 1), false)
    else { stop(); pb.playing = false; commit() }
    // Deshacer deja la cola exactamente como estaba, sonando o en pausa según corresponda
    return () => {
        state.queue = snap.queue; state.index = snap.index; resetHistory()
        const it = state.queue[state.index]
        if (it) (snap.playing ? load : cue)(it.id, snap.at)
        else { stop(); pb.playing = false }
        commit()
    }
}

export function move(from, to) {
    const curUid = state.queue[state.index]?.uid
    const [m] = state.queue.splice(from, 1)
    state.queue.splice(to, 0, m)
    state.index = state.queue.findIndex((q) => q.uid === curUid)
    resetHistory()
    commit()
}
