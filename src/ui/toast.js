// Avisos flotantes, con un botón de acción opcional (por ejemplo, "Deshacer")

import { $ } from './dom.js'

let msgT, action = null

function hide() {
    $('toast').classList.remove('pointer-events-auto')
    $('toast').classList.add('opacity-0', 'translate-y-2', 'pointer-events-none')
    action = null
}

export function flash(text, act) {
    if (!text) return
    $('msg').textContent = text
    action = act?.run || null
    $('toastAction').textContent = act?.label || ''
    $('toastAction').classList.toggle('hidden', !act)
    // pointer-events se hereda del contenedor (que es none); hay que activarlo explícitamente
    $('toast').classList.remove('opacity-0', 'translate-y-2', 'pointer-events-none')
    $('toast').classList.add('pointer-events-auto')
    clearTimeout(msgT)
    // Los avisos con acción duran más para dar tiempo a reaccionar
    msgT = setTimeout(hide, act ? 6000 : 4000)
}

export function init() {
    $('toastAction').addEventListener('click', () => { const run = action; clearTimeout(msgT); hide(); run?.() })
    // Mientras el cursor está encima, el aviso no se oculta
    $('toast').addEventListener('mouseenter', () => clearTimeout(msgT))
    $('toast').addEventListener('mouseleave', () => { clearTimeout(msgT); msgT = setTimeout(hide, 2500) })
}
