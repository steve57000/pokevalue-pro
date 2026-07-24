import { access, readFile, readdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = resolve(root, 'dist')

async function requireFile(path, label) {
  try {
    await access(path)
  } catch {
    throw new Error(`${label} absent du build : ${path}`)
  }
}

await requireFile(resolve(dist, 'index.html'), 'Page principale')
await requireFile(resolve(dist, 'manifest.webmanifest'), 'Manifeste PWA')
await requireFile(resolve(dist, 'pokevalue-icon.svg'), 'Icône PWA')

const [html, manifestSource, assets] = await Promise.all([
  readFile(resolve(dist, 'index.html'), 'utf8'),
  readFile(resolve(dist, 'manifest.webmanifest'), 'utf8'),
  readdir(resolve(dist, 'assets')),
])

if (!html.includes('manifest.webmanifest')) {
  throw new Error('Le manifeste PWA n’est pas référencé par index.html.')
}

if (/["']\/(?:assets|manifest\.webmanifest|pokevalue-icon\.svg)/.test(html)) {
  throw new Error('Le build contient un asset absolu incompatible avec le sous-chemin GitHub Pages.')
}

if (!assets.some((file) => file.endsWith('.js'))) {
  throw new Error('Aucun bundle JavaScript trouvé dans dist/assets.')
}

const manifest = JSON.parse(manifestSource)
if (manifest.start_url !== '.' || manifest.scope !== '.') {
  throw new Error('Le manifeste doit conserver des chemins relatifs pour GitHub Pages.')
}

for (const icon of manifest.icons ?? []) {
  if (typeof icon.src !== 'string') continue
  const relativeIcon = icon.src.replace(/^\.\//, '')
  await requireFile(resolve(dist, relativeIcon), `Icône ${icon.src}`)
}

console.log('Build GitHub Pages vérifié : HTML, assets et manifeste PWA sont cohérents.')
