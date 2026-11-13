// src/main/mailto.ts
// Reads a mailto: link into compose fields (to, cc, bcc, subject, body). Pure
// functions, no Electron imports, so they can be checked without starting the
// app. Each provider turns the fields into its own compose address
// (see providers/).

// Longest link accepted. Mail links are short; this bounds the work done on
// anything else.
const MAX_LENGTH = 8000

/**
 * True when the text holds a control character. Line breaks and tabs are allowed
 * only when `allowLineBreaks` is set (the subject and body).
 */
function hasControlChars(text: string, allowLineBreaks: boolean): boolean {
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    if (allowLineBreaks && (code === 9 || code === 10 || code === 13)) continue
    if (code < 32 || code === 127) return true
  }
  return false
}

export interface ComposeFields {
  to: string[]
  cc: string[]
  bcc: string[]
  subject: string
  body: string
}

/** First mailto: link in a command line or argument list, or null. */
export function findMailtoArg(argv: readonly string[]): string | null {
  return argv.find((arg) => /^mailto:/i.test(arg)) ?? null
}

function decode(value: string): string | null {
  try {
    return decodeURIComponent(value)
  } catch {
    return null
  }
}

function splitAddresses(value: string): string[] {
  return value
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
}

/** Parse a mailto: link. Returns null when the link is not a usable mail link. */
export function parseMailto(url: string): ComposeFields | null {
  if (typeof url !== 'string' || url.length > MAX_LENGTH || !/^mailto:/i.test(url)) {
    return null
  }

  const rest = url.slice('mailto:'.length)
  const queryAt = rest.indexOf('?')
  const pathPart = queryAt === -1 ? rest : rest.slice(0, queryAt)
  const query = queryAt === -1 ? '' : rest.slice(queryAt + 1)

  const fields: ComposeFields = { to: [], cc: [], bcc: [], subject: '', body: '' }

  const toFromPath = decode(pathPart)
  if (toFromPath === null) return null
  fields.to.push(...splitAddresses(toFromPath))

  for (const pair of query.split('&')) {
    if (pair === '') continue
    const eq = pair.indexOf('=')
    const rawKey = eq === -1 ? pair : pair.slice(0, eq)
    const rawValue = eq === -1 ? '' : pair.slice(eq + 1)
    const key = decode(rawKey)?.toLowerCase()
    const value = decode(rawValue)
    if (key === undefined || value === null) return null

    if (key === 'to') fields.to.push(...splitAddresses(value))
    else if (key === 'cc') fields.cc.push(...splitAddresses(value))
    else if (key === 'bcc') fields.bcc.push(...splitAddresses(value))
    else if (key === 'subject') fields.subject = value
    else if (key === 'body') fields.body = value
    // Other keys (for example in-reply-to) are ignored
  }

  for (const address of [...fields.to, ...fields.cc, ...fields.bcc]) {
    if (hasControlChars(address, false) || !address.includes('@')) return null
  }
  if (hasControlChars(fields.subject, true)) return null
  // A subject is one line: line breaks become spaces
  fields.subject = fields.subject.replace(/[\r\n]+/g, ' ').trim()
  // Body: line breaks are kept; other control characters are rejected
  if (hasControlChars(fields.body, true)) return null

  return fields
}
