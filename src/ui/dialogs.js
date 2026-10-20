// Diálogo de playlist: crear (vacía, con la cola o con enlaces), guardar, renombrar o eliminar

import { $, plural } from './dom.js'
import { hasLinks } from '../core/youtube.js'

const LINKS_HINT = 'Pega al menos un enlace de YouTube: un video o una playlist.'
let queueName = ''

// Muestra el campo de enlaces solo si se eligió ese origen, y valida que traiga al menos uno
function sync() {
    const creating = !$('plSource').hidden
    const links = creating && $('plSrcLinks').checked
    $('plLinks').hidden = !links
    $('plLinks').required = links
    $('plLinks').setCustomValidity(links && !hasLinks($('plLinks').value) ? LINKS_HINT : '')
    if (creating) $('plName').placeholder = links ? 'Opcional: se usa el nombre de la playlist de YouTube' : `Opcional: ${queueName}`
}

// Abre el diálogo y resuelve con { action: 'ok' | 'delete' | 'cancel', name, source: 'empty' | 'queue' | 'links', links }.
// Con `create` muestra la elección de origen (vacía por defecto) y el nombre pasa a ser opcional
export function askPlaylist({ title, text = '', name = '', create = null, withDelete = false, ok = 'Guardar' }) {
    const dlg = $('plDlg')
    $('plDlgTitle').textContent = title
    $('plDlgText').textContent = text
    $('plDlgText').hidden = !text
    $('plSource').hidden = !create
    $('plName').value = name
    $('plName').required = !create
    $('plName').placeholder = ''
    $('plLinks').value = ''
    if (create) {
        const n = create.queueCount
        queueName = create.defaultName
        $('plSrcQueue').disabled = !n
        $('plSrcQueueText').textContent = n ? plural(n, 'canción', 'canciones') : 'La cola está vacía'
        $('plSrcEmpty').checked = true
    }
    sync()
    $('plDelete').hidden = !withDelete
    $('plOk').textContent = ok
    dlg.returnValue = ''
    dlg.showModal()
    if (create && $('plSrcLinks').checked) $('plLinks').focus()
    else { $('plName').focus(); $('plName').select() }
    return new Promise((resolve) => {
        dlg.addEventListener('close', () => resolve({
            action: dlg.returnValue || 'cancel',
            name: $('plName').value.trim(),
            source: document.querySelector('input[name="plSrc"]:checked')?.value || 'empty',
            links: $('plLinks').value,
        }), { once: true })
    })
}

export function init() {
    const dlg = $('plDlg')
    for (const id of ['plSrcEmpty', 'plSrcQueue', 'plSrcLinks']) $(id).addEventListener('change', () => { sync(); if ($('plSrcLinks').checked) $('plLinks').focus() })
    $('plLinks').addEventListener('input', sync)
    $('plCancel').addEventListener('click', () => dlg.close('cancel'))
    $('plDelete').addEventListener('click', () => dlg.close('delete'))
    // Clic fuera del cuadro = cancelar
    dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close('cancel') })
}
