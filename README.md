# Rola

Reproductor de música en el navegador que arma tu cola de reproducción a partir de enlaces de YouTube. Pegas uno o varios enlaces y se suman a la lista sin interrumpir lo que está sonando.

**Pruébalo aquí: <https://sergiobytes.github.io/music-player-sergiobytes/>**

Hecho con HTML, JavaScript sin frameworks, [Tailwind CSS v4](https://tailwindcss.com/) y [Vite](https://vite.dev/).

## Características

- **Cola de reproducción**: pega uno o varios enlaces a la vez (separados por espacios, comas o saltos de línea).
- **Playlists completas**: pega el enlace de una playlist pública y todos sus videos se suman a la cola.
- **La cola avanza sola**: cuando una canción termina, sale de la lista y empieza la siguiente.
- **Historial "Escuchadas"**: las canciones que terminan quedan en la pestaña *Escuchadas* (las últimas 50, sin repetir) para volver a agregarlas a la cola con un clic.
- **Controles completos**: reproducir/pausa, anterior, siguiente, barra de progreso y volumen con botón de silencio.
- **Aleatorio y repetición**: repetir una sola canción, o repetir toda la lista (en ese modo las canciones no se quitan al terminar).
- **Reordenar arrastrando** las canciones de la lista (con mouse).
- **Deshacer**: al quitar una canción o vaciar la lista aparece un aviso con el botón *Deshacer*; vaciar la lista además pide confirmación.
- **Recuerda tu sesión**: la cola, la canción actual, el historial, el volumen y los modos se guardan en el `localStorage` del navegador (claves `rola-state-v1` y `rola-theme`).
- **12 temas de color**: 9 oscuros (Atardecer, Medianoche, Bosque, Neón, Océano, Cereza, Café, Grafito y Alto contraste) y 3 claros (Claro, Lavanda y Menta).
- **Diseño adaptable**: funciona en teléfonos, tablets y escritorio.
- **Atajos de teclado** para controlar la música sin usar el mouse.
- Si un video no permite reproducirse fuera de YouTube, se marca y se salta automáticamente.

## Enlaces compatibles

| Formato             | Ejemplo                                       |
| ------------------- | --------------------------------------------- |
| Video normal        | `https://www.youtube.com/watch?v=dQw4w9WgXcQ` |
| Enlace corto        | `https://youtu.be/dQw4w9WgXcQ`                |
| Shorts              | `https://www.youtube.com/shorts/<id>`         |
| YouTube Music       | `https://music.youtube.com/watch?v=<id>`      |
| Embed / live        | `https://www.youtube.com/embed/<id>`          |
| ID del video, solo  | `dQw4w9WgXcQ`                                 |
| Playlist completa   | `https://www.youtube.com/playlist?list=<id>`  |

De cada playlist se agregan como máximo los primeros 200 videos, que es lo que permite leer el reproductor de YouTube. Un enlace de video que trae `&list=…` (por ejemplo, uno copiado mientras suena una playlist) agrega solo ese video. Para agregar la playlist completa, usa el enlace de la playlist (botón **Compartir** en la página de la playlist).

## Atajos de teclado

| Tecla               | Acción             |
| ------------------- | ------------------ |
| `Espacio`           | Reproducir / pausa |
| `Shift` + `→`       | Siguiente          |
| `Shift` + `←`       | Anterior           |
| `M`                 | Silenciar          |
| `Enter`             | Agregar los enlaces escritos (en el campo de texto) o reproducir la canción seleccionada (en la lista) |

## Requisitos

- [Node.js](https://nodejs.org/) 20.19 o superior (o 22.12 o superior)
- npm

## Empezar

```bash
# Clonar el repositorio
git clone https://github.com/sergiobytes/music-player-sergiobytes.git
cd music-player-sergiobytes

# Instalar dependencias
npm install

# Servidor de desarrollo en http://localhost:5173
npm run dev
```

## Scripts

| Comando           | Descripción                                        |
| ----------------- | -------------------------------------------------- |
| `npm run dev`     | Inicia el servidor de desarrollo con recarga en vivo |
| `npm run build`   | Genera la versión de producción en `dist/`         |
| `npm run preview` | Sirve localmente la versión compilada de `dist/`   |

## Despliegue en GitHub Pages

El sitio se publica en <https://sergiobytes.github.io/music-player-sergiobytes/> mediante el workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml), que compila el proyecto y lo despliega en GitHub Pages cada vez que se hace push a `main`. También se puede ejecutar a mano desde la pestaña [Actions](https://github.com/sergiobytes/music-player-sergiobytes/actions) con *Run workflow*.

Si haces un fork, activa Pages en tu copia: **Settings → Pages → Build and deployment → Source: GitHub Actions**. Tu sitio quedará en `https://<tu-usuario>.github.io/<nombre-del-repo>/`.

Vite está configurado con `base: './'` (rutas relativas), así que el sitio funciona en la subruta del repositorio sin cambiar nada.

## Estructura del proyecto

```
.
├── .github/workflows/deploy.yml   # Despliegue automático a GitHub Pages
├── public/
│   └── favicon.svg
├── src/
│   ├── main.js                    # Lógica: cola, reproductor de YouTube, temas y eventos
│   └── style.css                  # Tailwind, variables de los temas y componentes
├── index.html                     # Estructura de la interfaz
└── vite.config.js
```

### Agregar un tema

1. En [`src/style.css`](src/style.css), copia un bloque `[data-theme="..."]` con un nuevo nombre y cambia sus colores.
2. En [`src/main.js`](src/main.js), agrega el tema al arreglo `THEMES` con su `id`, `name`, `dark` (`true` si es oscuro, para agruparlo en el menú) y los tres colores de muestra.

## Notas

- La reproducción usa la [API del reproductor IFrame de YouTube](https://developers.google.com/youtube/iframe_api_reference), por lo que se necesita conexión a internet.
- Algunos videos tienen la inserción desactivada por su autor; esos no se pueden reproducir aquí y se saltan.
- Los títulos y nombres de canal se obtienen del servicio oEmbed de YouTube y se guardan junto con la cola.
- En teléfonos, el volumen se controla con los botones del dispositivo, y reordenar arrastrando no está disponible en pantallas táctiles.
