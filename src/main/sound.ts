// src/main/sound.ts
// The new-mail sound. Notifications are shown silently and this plays MailShell's
// own chime, so the sound is the same on every computer and can be changed here.
//
// The chime is generated in code (two short tones, 16-bit WAV) and played from a
// hidden window with a data: page, so no sound file ships with the app.

import { app, BrowserWindow } from 'electron'

const SAMPLE_RATE = 22050

// The chime follows the two syllables of "mail-shell": "mail" is a short, higher
// note; "shell" is a longer, lower note that rings out. Times are in seconds.
const SYLLABLES = [
  { frequency: 784, start: 0, length: 0.18, decay: 14 }, // "mail"
  { frequency: 587, start: 0.24, length: 0.42, decay: 6 }, // "shell"
] as const

/** Two-tone chime, one tone per syllable, as 16-bit mono PCM samples. */
function chimeSamples(): Int16Array {
  const end = Math.max(...SYLLABLES.map((s) => s.start + s.length))
  const out = new Int16Array(Math.floor(SAMPLE_RATE * end))
  for (let i = 0; i < out.length; i++) {
    const t = i / SAMPLE_RATE
    let sample = 0
    for (const s of SYLLABLES) {
      const local = t - s.start
      if (local < 0 || local >= s.length) continue
      // Quick attack, then decay
      const attack = Math.min(1, local / 0.008)
      const envelope = attack * Math.exp(-local * s.decay) * 0.35
      sample += Math.sin(2 * Math.PI * s.frequency * local) * envelope
    }
    out[i] = Math.round(Math.max(-1, Math.min(1, sample)) * 32767)
  }
  return out
}

/** The chime as a complete WAV file. */
function chimeWav(): Buffer {
  const samples = chimeSamples()
  const data = Buffer.from(samples.buffer)
  const header = Buffer.alloc(44)
  header.write('RIFF', 0, 'ascii')
  header.writeUInt32LE(36 + data.length, 4)
  header.write('WAVE', 8, 'ascii')
  header.write('fmt ', 12, 'ascii')
  header.writeUInt32LE(16, 16) // PCM format chunk size
  header.writeUInt16LE(1, 20) // PCM
  header.writeUInt16LE(1, 22) // mono
  header.writeUInt32LE(SAMPLE_RATE, 24)
  header.writeUInt32LE(SAMPLE_RATE * 2, 28) // bytes per second
  header.writeUInt16LE(2, 32) // bytes per frame
  header.writeUInt16LE(16, 34) // bits per sample
  header.write('data', 36, 'ascii')
  header.writeUInt32LE(data.length, 40)
  return Buffer.concat([header, data])
}

const PLAYER_URL = (() => {
  const wav = chimeWav().toString('base64')
  const html = `<!doctype html><audio autoplay src="data:audio/wav;base64,${wav}"></audio>`
  return `data:text/html;base64,${Buffer.from(html).toString('base64')}`
})()

// One hidden window plays every chime; it is created on first use
let player: BrowserWindow | null = null

/** Play the new-mail chime. Needs the app to be ready. */
export function playNewMailSound(): void {
  if (!app.isReady()) return
  if (!player || player.isDestroyed()) {
    player = new BrowserWindow({
      show: false,
      width: 1,
      height: 1,
      skipTaskbar: true,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    })
  }
  // Loading the page starts the sound (autoplay is allowed in index.ts)
  void player.loadURL(PLAYER_URL).catch(() => undefined)
}
