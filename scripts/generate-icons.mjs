import fs from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import sharp from 'file:///C:/Users/RAMMVER1/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp/dist/index.mjs'

const source = fileURLToPath(new URL('../public/fittrack-icon.svg', import.meta.url))
const outputs = [
  ['../public/icon-192.png', 192],
  ['../public/icon-512.png', 512],
  ['../public/apple-touch-icon.png', 180],
]

for (const [path, size] of outputs) {
  const target = fileURLToPath(new URL(path, import.meta.url))
  await fs.mkdir(new URL('../public/', import.meta.url), { recursive: true })
  await sharp(source).resize(size, size).png().toFile(target)
}
