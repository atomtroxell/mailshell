// scripts/stamp-legal.mjs
// Copies legal/ to build/legal/ and writes the build date into every {{BUILD_DATE}}.
// Runs before each start and package step, so the date on the legal pages and in
// the installer license is always the date of the build. legal/ keeps the placeholder.

import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const source = join(root, 'legal')
const target = join(root, 'build', 'legal')
const buildDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

rmSync(target, { recursive: true, force: true })
mkdirSync(target, { recursive: true })
for (const name of readdirSync(source)) {
  const text = readFileSync(join(source, name), 'utf8')
  writeFileSync(join(target, name), text.replaceAll('{{BUILD_DATE}}', buildDate), 'utf8')
}
console.log(`Legal pages stamped with build date: ${buildDate}`)
