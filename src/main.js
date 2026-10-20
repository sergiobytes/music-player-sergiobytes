// Punto de entrada: conecta las vistas con el estado y arranca el reproductor

import './style.css'
import { subscribe, notify } from './core/state.js'
import { initPlayer } from './core/player.js'
import * as toast from './ui/toast.js'
import * as themes from './ui/themes.js'
import * as tabs from './ui/tabs.js'
import * as dialogs from './ui/dialogs.js'
import * as nowPlaying from './ui/now-playing.js'
import * as controls from './ui/controls.js'
import * as addForm from './ui/add-form.js'
import * as queueView from './ui/queue-view.js'
import * as recentView from './ui/recent-view.js'
import * as playlistsView from './ui/playlists-view.js'
import * as picker from './ui/playlist-picker.js'

for (const m of [toast, themes, tabs, dialogs, picker, nowPlaying, controls, addForm, queueView, recentView, playlistsView]) m.init()

// Cada cambio de estado vuelve a pintar las vistas
const views = [nowPlaying, controls, queueView, recentView, playlistsView]
subscribe(() => views.forEach((v) => v.render()))

initPlayer({
    onVideoError: () => toast.flash('Ese video no permite reproducirse fuera de YouTube. Saltando…'),
    onApiError: () => toast.flash('No se pudo cargar el reproductor de YouTube. Revisa la conexión.'),
})

notify()
