-- Helper function used by the send-reminders edge function.
-- Returns events whose reminder window falls in [p_from, p_to).

create or replace function get_due_reminders(p_from timestamptz, p_to timestamptz)
returns table (
  event_id     uuid,
  household_id uuid,
  child_name   text,
  title        text,
  starts_at    timestamptz,
  location     text
)
language sql security definer as $$
  select
    e.id                                            as event_id,
    e.household_id,
    c.name                                          as child_name,
    e.title,
    e.starts_at,
    e.location
  from events e
  join children c on c.id = e.child_id
  left join reminder_prefs rp on rp.household_id = e.household_id
  where
    -- household has reminders enabled (default true if no row)
    coalesce(rp.enabled, true)
    -- reminder fire time falls in the 5-minute window
    and (e.starts_at - make_interval(mins => coalesce(e.reminder_minutes, coalesce(rp.default_minutes, 60))))
        between p_from and p_to
    -- only future events (don't re-fire for past events)
    and e.starts_at >= now()
$$;
