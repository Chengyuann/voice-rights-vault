import { copyFile, mkdir, stat } from 'node:fs/promises'
import { join } from 'node:path'

const root = new URL('..', import.meta.url)
const source = new URL('output/Voice-Rights-Aleo-refined.mp4', root)
const dist = new URL('dist/', root)
const target = new URL('demo-video.mp4', dist)

await mkdir(dist, { recursive: true })
const sourceStat = await stat(source)
if (!sourceStat.isFile() || sourceStat.size === 0) {
  throw new Error('Final demo video is unavailable.')
}
await copyFile(source, target)

const targetStat = await stat(target)
console.log(`Copied public demo video: ${join('dist', 'demo-video.mp4')} (${targetStat.size} bytes)`)
