// Edge Function: send-reminders
// Called by pg_cron every 5 minutes. Finds events whose reminder time is now
// due and sends a Web Push notification to each device in the household.
// No body expected.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// @ts-ignore — web-push has no Deno types but works fine
import webpush from 'https://esm.sh/web-push@3.6.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const sb = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // Configure VAPID (keys stored as Supabase secrets)
  const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY')
  const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY')
  const vapidEmail = Deno.env.get('VAPID_EMAIL') ?? 'mailto:admin@example.com'

  if (!vapidPublic || !vapidPrivate) {
    return new Response(JSON.stringify({ error: 'VAPID keys not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  webpush.setVapidDetails(vapidEmail, vapidPublic, vapidPrivate)

  // Find events due for a reminder in the next 5-minute window.
  // An event is "due" when: now >= starts_at - reminder_minutes
  // We use the household's default_minutes when the event has no override.
  const now = new Date()
  const windowEnd = new Date(now.getTime() + 5 * 60 * 1000)

  const { data: dueSoon, error } = await sb.rpc('get_due_reminders', {
    p_from: now.toISOString(),
    p_to: windowEnd.toISOString(),
  })

  if (error) {
    console.error('get_due_reminders error', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let sent = 0
  for (const row of (dueSoon ?? []) as DueReminder[]) {
    // Fetch push subscriptions for this household
    const { data: subs } = await sb
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('household_id', row.household_id)

    const payload = JSON.stringify({
      title: row.child_name
        ? `${row.child_name} — ${row.title}`
        : row.title,
      body: formatEventBody(row),
      url: '/',
    })

    for (const sub of subs ?? []) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        )
        sent++
      } catch (e) {
        // 410 Gone = subscription expired; clean it up
        if ((e as { statusCode?: number }).statusCode === 410) {
          await sb.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
        }
      }
    }
  }

  return new Response(JSON.stringify({ sent }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})

interface DueReminder {
  event_id: string
  household_id: string
  child_name: string | null
  title: string
  starts_at: string
  location: string | null
}

function formatEventBody(row: DueReminder): string {
  const time = new Date(row.starts_at).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })
  return row.location ? `${time} · ${row.location}` : time
}
