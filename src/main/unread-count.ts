// src/main/unread-count.ts
// Unread count for the Windows taskbar badge. Pure functions only (no Electron
// imports) so they can be checked without starting the app.

import { deflateSync } from 'zlib'

/**
 * Read the inbox unread count from Gmail's page title. Gmail writes
 * "Inbox (3) - ..." when mail is unread and "Inbox - ..." when none is.
 * Returns null when the title says nothing about the inbox (for example while
 * another label is open), so the caller keeps the last known count.
 */
export function parseInboxUnread(title: string): number | null {
  const match = /^\s*Inbox\b(?:\s*\(([\d,]+)\+?\))?/i.exec(title)
  if (!match) return null
  if (!match[1]) return 0
  const count = Number(match[1].replace(/,/g, ''))
  return Number.isFinite(count) ? count : null
}

/** Text shown on the badge: the count, or "9+" above nine. Null when there is nothing to show. */
export function badgeLabel(count: number): string | null {
  if (!Number.isFinite(count) || count <= 0) return null
  return count > 9 ? '9+' : String(Math.floor(count))
}

// --- Badge image -----------------------------------------------------------
// Drawn in code (no image assets, no canvas): a red circle with white digits
// from a 3x5 pixel font, each font pixel drawn 2x2 on a 32px image. Windows
// scales the overlay down to 16px.

const SIZE = 32
const GLYPH_SCALE = 2
const GLYPH_W = 3
const GLYPH_H = 5
const GLYPH_GAP = 1 // in font pixels
const RED: [number, number, number] = [0xd9, 0x30, 0x25]

const FONT: Record<string, string[]> = {
  '0': ['111', '101', '101', '101', '111'],
  '1': ['010', '110', '010', '010', '111'],
  '2': ['111', '001', '111', '100', '111'],
  '3': ['111', '001', '111', '001', '111'],
  '4': ['101', '101', '111', '001', '001'],
  '5': ['111', '100', '111', '001', '111'],
  '6': ['111', '100', '111', '101', '111'],
  '7': ['111', '001', '001', '001', '001'],
  '8': ['111', '101', '111', '101', '111'],
  '9': ['111', '101', '111', '001', '111'],
  '+': ['000', '010', '111', '010', '000'],
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

function crc32(data: Buffer): number {
  let c = 0xffffffff
  for (const byte of data) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function pngChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([length, typeBuf, data, crc])
}

/** PNG bytes for the taskbar badge, or null when the count is zero. */
export function renderBadgePng(count: number): Buffer | null {
  const label = badgeLabel(count)
  if (!label) return null

  // RGBA pixels, transparent to start
  const pixels = Buffer.alloc(SIZE * SIZE * 4, 0)
  const put = (x: number, y: number, [r, g, b]: [number, number, number]) => {
    if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return
    const i = (y * SIZE + x) * 4
    pixels[i] = r
    pixels[i + 1] = g
    pixels[i + 2] = b
    pixels[i + 3] = 255
  }

  // Filled circle
  const radius = SIZE / 2 - 1
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const dx = x + 0.5 - SIZE / 2
      const dy = y + 0.5 - SIZE / 2
      if (dx * dx + dy * dy <= radius * radius) put(x, y, RED)
    }
  }

  // Centred white label
  const glyphs = [...label]
  const textW = glyphs.length * GLYPH_W * GLYPH_SCALE + (glyphs.length - 1) * GLYPH_GAP * GLYPH_SCALE
  const textH = GLYPH_H * GLYPH_SCALE
  const startX = Math.round((SIZE - textW) / 2)
  const startY = Math.round((SIZE - textH) / 2)
  glyphs.forEach((ch, gi) => {
    const rows = FONT[ch]
    if (!rows) return
    const gx = startX + gi * (GLYPH_W + GLYPH_GAP) * GLYPH_SCALE
    rows.forEach((row, ry) => {
      for (let cx = 0; cx < GLYPH_W; cx++) {
        if (row[cx] !== '1') continue
        for (let sy = 0; sy < GLYPH_SCALE; sy++) {
          for (let sx = 0; sx < GLYPH_SCALE; sx++) {
            put(gx + cx * GLYPH_SCALE + sx, startY + ry * GLYPH_SCALE + sy, [255, 255, 255])
          }
        }
      }
    })
  })

  // Scanlines: each row starts with a filter byte of 0 (no filtering)
  const raw = Buffer.alloc((SIZE * 4 + 1) * SIZE)
  for (let y = 0; y < SIZE; y++) {
    pixels.copy(raw, y * (SIZE * 4 + 1) + 1, y * SIZE * 4, (y + 1) * SIZE * 4)
  }

  const header = Buffer.alloc(13)
  header.writeUInt32BE(SIZE, 0)
  header.writeUInt32BE(SIZE, 4)
  header[8] = 8 // bit depth
  header[9] = 6 // colour type: RGBA
  header[10] = 0 // compression
  header[11] = 0 // filter
  header[12] = 0 // no interlace

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}
