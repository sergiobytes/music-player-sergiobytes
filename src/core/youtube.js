// Lo que habla con YouTube fuera del reproductor principal: enlaces, playlists y títulos

export function parseId(raw) {
    const s = raw.trim()
    if (!s) return null
    if (/^[\w-]{11}$/.test(s)) return s
    try {
        const u = new URL(s)
        const host = u.hostname.replace(/^(www|m|music)\./, '')
        if (host === 'youtu.be') return u.pathname.slice(1, 12) || null
        if (host.endsWith('youtube.com') || host.endsWith('youtube-nocookie.com')) {
            const v = u.searchParams.get('v')
            if (v && /^[\w-]{11}$/.test(v)) return v
            const m = u.pathname.match(/^\/(shorts|embed|live|v)\/([\w-]{11})/)
            if (m) return m[2]
        }
    } catch (e) { }
    return null
}

// Solo los enlaces de playlist (youtube.com/playlist?list=…); un video abierto desde una playlist se agrega solo
export function parseList(raw) {
    try {
        const u = new URL(raw.trim())
        const host = u.hostname.replace(/^(www|m|music)\./, '')
        const list = u.searchParams.get('list')
        if (host === 'youtube.com' && u.pathname === '/playlist' && list && /^[\w-]+$/.test(list)) return list
    } catch (e) { }
    return null
}

// El reproductor de YouTube solo entrega los primeros 200 videos de una playlist
export const PLAYLIST_CAP = 200

// Lee los videos de una playlist con un reproductor oculto, sin interrumpir lo que está sonando
export function playlistIds(list) {
    if (!window.YT?.Player) return Promise.resolve(null)
    return new Promise((resolve) => {
        const box = document.createElement('div')
        box.style.cssText = 'position:fixed;left:-9999px;top:0;width:200px;height:200px'
        document.body.appendChild(box)
        let helper, poll, timer, done = false
        const finish = (ids) => {
            if (done) return
            done = true
            clearInterval(poll); clearTimeout(timer)
            setTimeout(() => { helper?.destroy(); box.remove() }, 0)
            resolve(ids)
        }
        const check = () => { const ids = helper.getPlaylist?.(); if (ids?.length) finish(ids) }
        timer = setTimeout(() => finish(null), 10000)
        helper = new YT.Player(box.appendChild(document.createElement('div')), {
            width: 200,
            height: 200,
            playerVars: { listType: 'playlist', list },
            events: {
                onReady: () => { poll = setInterval(check, 300); check() },
                onError: () => finish(null),
            },
        })
    })
}

export const hasLinks = (text) => text.split(/[\s,]+/).some((p) => parseList(p) || parseId(p))

// Convierte texto con enlaces en ids de video; las playlists se leen completas
export async function resolveLinks(text, onPlaylist) {
    const out = { ids: [], lists: [], bad: 0, badLists: 0, capped: false }
    for (const p of text.split(/[\s,]+/).filter(Boolean)) {
        const list = parseList(p)
        if (list) {
            onPlaylist?.()
            const [found, title] = await Promise.all([playlistIds(list), playlistTitle(list)])
            if (found?.length) { out.ids.push(...found); out.lists.push({ title, count: found.length }) }
            else out.badLists++
            if (found?.length >= PLAYLIST_CAP) out.capped = true
            continue
        }
        const id = parseId(p)
        if (id) out.ids.push(id)
        else out.bad++
    }
    return out
}

const oembed = async (url) => {
    const r = await fetch('https://www.youtube.com/oembed?format=json&url=' + encodeURIComponent(url))
    return r.ok ? r.json() : null
}

// Nombre de una playlist de YouTube, para proponerlo al guardarla
export async function playlistTitle(list) {
    try { return (await oembed('https://www.youtube.com/playlist?list=' + list))?.title || null } catch (e) { return null }
}

async function fetchTitle(item, done) {
    try {
        const d = await oembed('https://www.youtube.com/watch?v=' + item.id)
        if (!d) return
        if (d.title) item.title = d.title
        if (d.author_name) item.author = d.author_name
        done()
    } catch (e) { /* el título se completa al reproducirse */ }
}

// Pide los títulos de a pocos para no saturar a YouTube con playlists grandes; `done` avisa cada actualización
const titleQueue = []
let titleWorkers = 0
export function queueTitle(item, done) {
    titleQueue.push([item, done])
    while (titleWorkers < 4 && titleQueue.length) {
        titleWorkers++
        ;(async () => {
            while (titleQueue.length) await fetchTitle(...titleQueue.shift())
            titleWorkers--
        })()
    }
}
