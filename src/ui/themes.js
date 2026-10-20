// Temas de color y su menú

import { $, PATH, svg } from './dom.js'

const THEMES = [
    { id: 'atardecer', name: 'Atardecer', dark: true, colors: ['#121214', '#ff7a45', '#ffb347'] },
    { id: 'medianoche', name: 'Medianoche', dark: true, colors: ['#0d1020', '#7c8cff', '#c084fc'] },
    { id: 'bosque', name: 'Bosque', dark: true, colors: ['#0f1512', '#4fd1a5', '#c6e86b'] },
    { id: 'neon', name: 'Neón', dark: true, colors: ['#0b0b0f', '#ff3ea5', '#00e5ff'] },
    { id: 'oceano', name: 'Océano', dark: true, colors: ['#08141a', '#22d3ee', '#60a5fa'] },
    { id: 'cereza', name: 'Cereza', dark: true, colors: ['#150b0f', '#ff4d79', '#ff9eb5'] },
    { id: 'cafe', name: 'Café', dark: true, colors: ['#14100c', '#d9a066', '#f0c987'] },
    { id: 'grafito', name: 'Grafito', dark: true, colors: ['#0e0e0f', '#ffffff', '#a1a1a6'] },
    { id: 'contraste', name: 'Alto contraste', dark: true, colors: ['#000000', '#ffd60a', '#ffffff'] },
    { id: 'claro', name: 'Claro', dark: false, colors: ['#f6f5f2', '#e2572b', '#f29d38'] },
    { id: 'lavanda', name: 'Lavanda', dark: false, colors: ['#f6f4fb', '#7c3aed', '#c026d3'] },
    { id: 'menta', name: 'Menta', dark: false, colors: ['#f2f8f5', '#0b7f58', '#0e9f9e'] },
]
// El tema guardado se aplica antes en index.html para evitar el parpadeo; esta clave debe coincidir
const THEME_KEY = 'rola-theme'

function apply(id) {
    document.documentElement.dataset.theme = id
    try { localStorage.setItem(THEME_KEY, id) } catch (e) { }
    renderMenu()
}

function renderMenu() {
    const current = document.documentElement.dataset.theme
    // Color de la barra del navegador en móviles
    const theme = THEMES.find((t) => t.id === current)
    if (theme) document.querySelector('meta[name="theme-color"]').content = theme.colors[0]
    const item = (t) => `
    <button type="button" role="menuitemradio" aria-checked="${t.id === current}" data-theme-id="${t.id}"
      class="flex w-full cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2 text-left text-sm transition hover:bg-panel2 ${t.id === current ? 'bg-panel2/60 text-accent font-semibold' : 'text-fg'}">
      <span class="flex overflow-hidden rounded-md ring-1 ring-line">
        ${t.colors.map((c) => `<span class="block h-6 w-3.5" style="background:${c}"></span>`).join('')}
      </span>
      <span class="flex-1">${t.name}</span>
      ${t.id === current ? svg(PATH.check) : ''}
    </button>`
    const group = (label, list) => `
    <div role="presentation" class="px-2.5 pt-2.5 pb-1 text-[11px] font-semibold tracking-[0.18em] text-muted uppercase">${label}</div>
    ${list.map(item).join('')}`
    $('themeMenu').innerHTML = group('Oscuros', THEMES.filter((t) => t.dark)) + group('Claros', THEMES.filter((t) => !t.dark))
}

function toggleMenu(open) {
    const menu = $('themeMenu')
    const show = open ?? menu.classList.contains('hidden')
    menu.classList.toggle('hidden', !show)
    $('themeBtn').setAttribute('aria-expanded', String(show))
}

export function init() {
    $('themeBtn').addEventListener('click', (e) => { e.stopPropagation(); toggleMenu() })
    $('themeMenu').addEventListener('click', (e) => {
        const b = e.target.closest('[data-theme-id]')
        if (b) { apply(b.dataset.themeId); toggleMenu(false) }
    })
    document.addEventListener('click', (e) => { if (!e.target.closest('#themeMenu')) toggleMenu(false) })
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') toggleMenu(false) })
    renderMenu()
}
