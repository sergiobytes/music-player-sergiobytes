// Navegación del panel de listas: pestañas Cola, Escuchadas y Playlists (lista o una playlist abierta)

import { $ } from './dom.js'
import { notify } from '../core/state.js'

const TABS = {
    queue: ['tabQueue', 'queuePanel'],
    recent: ['tabRecent', 'recentPanel'],
    playlists: ['tabPlaylists', 'playlistsPanel'],
}
let current = 'queue'
let opened = null

export const isTab = (t) => current === t
// Id de la playlist abierta en la pestaña Playlists, o null si se ve la lista
export const openedPlaylist = () => (current === 'playlists' ? opened : null)

export function setTab(t, playlistId = null) {
    current = t
    opened = playlistId
    for (const [name, [tab, panel]] of Object.entries(TABS)) {
        $(tab).setAttribute('aria-selected', String(name === t))
        $(panel).hidden = name !== t
    }
    notify()
}

export const openPlaylist = (id) => setTab('playlists', id)

export function init() {
    for (const [name, [tab]] of Object.entries(TABS)) $(tab).addEventListener('click', () => setTab(name))
}
