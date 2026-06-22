// Minimal, dependency-free iCalendar (.ics) parser.
//
// Designed to run unchanged in the browser (local mode) and in a Deno edge
// function (cloud mode). It handles the subset of RFC 5545 that team calendars
// such as TeamSnap, GameChanger and Google emit: VEVENTs with DTSTART/DTEND,
// SUMMARY, LOCATION, DESCRIPTION and UID, including line folding and the common
// date/date-time forms.

export interface IcsEvent {
  uid: string
  summary: string
  description: string | null
  location: string | null
  start: string // ISO
  end: string | null // ISO
  allDay: boolean
}

/** Unfold folded lines: a CRLF followed by space/tab continues the prior line. */
function unfold(text: string): string[] {
  const raw = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  const out: string[] = []
  for (const line of raw) {
    if ((line.startsWith(' ') || line.startsWith('\t')) && out.length) {
      out[out.length - 1] += line.slice(1)
    } else {
      out.push(line)
    }
  }
  return out
}

/** Split "DTSTART;TZID=...:20260627T130000" into name, params, value. */
function parseLine(line: string): {
  name: string
  params: Record<string, string>
  value: string
} | null {
  const colon = line.indexOf(':')
  if (colon === -1) return null
  const left = line.slice(0, colon)
  const value = line.slice(colon + 1)
  const parts = left.split(';')
  const name = parts[0].toUpperCase()
  const params: Record<string, string> = {}
  for (const p of parts.slice(1)) {
    const eq = p.indexOf('=')
    if (eq !== -1) params[p.slice(0, eq).toUpperCase()] = p.slice(eq + 1)
  }
  return { name, params, value }
}

function unescapeText(v: string): string {
  return v
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
    .trim()
}

/** Convert an iCal date/date-time value to ISO. Returns [iso, isAllDay]. */
function toIso(
  value: string,
  params: Record<string, string>,
): [string, boolean] {
  // All-day: VALUE=DATE or bare YYYYMMDD
  if (params.VALUE === 'DATE' || /^\d{8}$/.test(value)) {
    const y = +value.slice(0, 4)
    const m = +value.slice(4, 6)
    const d = +value.slice(6, 8)
    return [new Date(y, m - 1, d, 0, 0, 0).toISOString(), true]
  }
  // Date-time: YYYYMMDDTHHMMSS with optional trailing Z (UTC).
  const m = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/)
  if (m) {
    const [, y, mo, d, h, mi, s, z] = m
    if (z) {
      return [
        new Date(
          Date.UTC(+y, +mo - 1, +d, +h, +mi, +s),
        ).toISOString(),
        false,
      ]
    }
    // No Z and no tz library: interpret as local time (good enough for display).
    return [new Date(+y, +mo - 1, +d, +h, +mi, +s).toISOString(), false]
  }
  // Fallback: let Date try.
  const dt = new Date(value)
  return [isNaN(dt.getTime()) ? new Date().toISOString() : dt.toISOString(), false]
}

export function parseIcs(text: string): IcsEvent[] {
  const lines = unfold(text)
  const events: IcsEvent[] = []
  let cur: Partial<IcsEvent> & { _allDay?: boolean } = {}
  let inEvent = false

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      inEvent = true
      cur = {}
      continue
    }
    if (line === 'END:VEVENT') {
      if (cur.uid && cur.start && cur.summary) {
        events.push({
          uid: cur.uid,
          summary: cur.summary,
          description: cur.description ?? null,
          location: cur.location ?? null,
          start: cur.start,
          end: cur.end ?? null,
          allDay: cur._allDay ?? false,
        })
      }
      inEvent = false
      continue
    }
    if (!inEvent) continue

    const parsed = parseLine(line)
    if (!parsed) continue
    const { name, params, value } = parsed

    switch (name) {
      case 'UID':
        cur.uid = value.trim()
        break
      case 'SUMMARY':
        cur.summary = unescapeText(value)
        break
      case 'DESCRIPTION':
        cur.description = unescapeText(value)
        break
      case 'LOCATION':
        cur.location = unescapeText(value)
        break
      case 'DTSTART': {
        const [iso, allDay] = toIso(value, params)
        cur.start = iso
        cur._allDay = allDay
        break
      }
      case 'DTEND': {
        const [iso] = toIso(value, params)
        cur.end = iso
        break
      }
    }
  }
  return events
}

/**
 * Heuristic: classify a team-calendar event as game / practice / event from its
 * title, so we can show the right icon and styling.
 */
export function classifyKind(summary: string): 'game' | 'practice' | 'event' {
  const s = summary.toLowerCase()
  if (/\b(vs\.?|@|game|match|tournament|playoff|scrimmage)\b/.test(s))
    return 'game'
  if (/\b(practice|training|workout|skills|clinic)\b/.test(s)) return 'practice'
  return 'event'
}

/** Pull an opponent name out of "Team vs Opponent" / "@ Opponent" titles. */
export function extractOpponent(summary: string): string | null {
  const vs = summary.match(/\b(?:vs\.?|@)\s+(.+)$/i)
  return vs ? vs[1].trim() : null
}
