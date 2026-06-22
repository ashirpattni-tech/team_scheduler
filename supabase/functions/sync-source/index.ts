// Edge Function: sync-source
// Fetches a calendar source's .ics feed server-side (avoids browser CORS),
// parses it, and upserts events into the DB.
// Body: { source_id: string }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const { source_id } = await req.json()
  if (!source_id) {
    return new Response(JSON.stringify({ error: 'source_id required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const sb = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // Load the source row
  const { data: src, error: srcErr } = await sb
    .from('calendar_sources')
    .select('*')
    .eq('id', source_id)
    .single()

  if (srcErr || !src) {
    return new Response(JSON.stringify({ error: 'Source not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Fetch the .ics feed
  const url = src.url.replace(/^webcal:/i, 'https:')
  let icsText: string
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'TeamScheduler/1.0' } })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    icsText = await res.text()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await sb.from('calendar_sources').update({ sync_error: msg }).eq('id', source_id)
    return new Response(JSON.stringify({ error: msg }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Parse .ics
  const parsed = parseIcs(icsText)
  let count = 0

  for (const item of parsed) {
    const base = {
      household_id: src.household_id,
      child_id: src.child_id,
      source_id: src.id,
      uid: item.uid,
      title: item.summary,
      kind: classifyKind(item.summary),
      starts_at: item.start,
      ends_at: item.end,
      all_day: item.allDay,
      location: item.location,
      opponent: extractOpponent(item.summary),
      notes: item.description,
    }

    // Upsert by (source_id, uid) — only update feed-owned columns,
    // leaving family-entered logistics (what_to_bring, driver, etc.) untouched.
    const { error } = await sb.from('events').upsert(base, {
      onConflict: 'source_id,uid',
      ignoreDuplicates: false,
    })

    if (!error) count++
  }

  // Update sync metadata
  await sb
    .from('calendar_sources')
    .update({ last_synced_at: new Date().toISOString(), sync_error: null })
    .eq('id', source_id)

  return new Response(JSON.stringify({ count }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})

// ---- minimal .ics parser (same logic as src/lib/ics.ts) ----

interface IcsEvent {
  uid: string
  summary: string
  description: string | null
  location: string | null
  start: string
  end: string | null
  allDay: boolean
}

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

function parseLine(line: string) {
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
  return v.replace(/\\n/gi, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\').trim()
}

function toIso(value: string, params: Record<string, string>): [string, boolean] {
  if (params.VALUE === 'DATE' || /^\d{8}$/.test(value)) {
    const y = +value.slice(0, 4), m = +value.slice(4, 6), d = +value.slice(6, 8)
    return [new Date(Date.UTC(y, m - 1, d)).toISOString(), true]
  }
  const m = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/)
  if (m) {
    const [, y, mo, d, h, mi, s, z] = m
    return [new Date(z ? Date.UTC(+y, +mo - 1, +d, +h, +mi, +s) : +new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}`)).toISOString(), false]
  }
  const dt = new Date(value)
  return [isNaN(dt.getTime()) ? new Date().toISOString() : dt.toISOString(), false]
}

function parseIcs(text: string): IcsEvent[] {
  const lines = unfold(text)
  const events: IcsEvent[] = []
  let cur: Partial<IcsEvent> & { _allDay?: boolean } = {}
  let inEvent = false
  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') { inEvent = true; cur = {}; continue }
    if (line === 'END:VEVENT') {
      if (cur.uid && cur.start && cur.summary) {
        events.push({ uid: cur.uid, summary: cur.summary, description: cur.description ?? null, location: cur.location ?? null, start: cur.start, end: cur.end ?? null, allDay: cur._allDay ?? false })
      }
      inEvent = false; continue
    }
    if (!inEvent) continue
    const p = parseLine(line)
    if (!p) continue
    switch (p.name) {
      case 'UID': cur.uid = p.value.trim(); break
      case 'SUMMARY': cur.summary = unescapeText(p.value); break
      case 'DESCRIPTION': cur.description = unescapeText(p.value); break
      case 'LOCATION': cur.location = unescapeText(p.value); break
      case 'DTSTART': { const [iso, ad] = toIso(p.value, p.params); cur.start = iso; cur._allDay = ad; break }
      case 'DTEND': { const [iso] = toIso(p.value, p.params); cur.end = iso; break }
    }
  }
  return events
}

function classifyKind(summary: string): 'game' | 'practice' | 'event' {
  const s = summary.toLowerCase()
  if (/\b(vs\.?|@|game|match|tournament|playoff|scrimmage)\b/.test(s)) return 'game'
  if (/\b(practice|training|workout|skills|clinic)\b/.test(s)) return 'practice'
  return 'event'
}

function extractOpponent(summary: string): string | null {
  const vs = summary.match(/\b(?:vs\.?|@)\s+(.+)$/i)
  return vs ? vs[1].trim() : null
}
