-- ============================================================
-- Team Scheduler — initial schema
-- Run once in Supabase: SQL Editor → paste & run, OR via CLI
-- ============================================================

-- Enable pgcrypto for gen_random_uuid() and pg_cron for scheduled jobs
create extension if not exists "pgcrypto";
create extension if not exists "pg_cron" with schema "extensions";

-- ============================================================
-- TABLES
-- ============================================================

create table households (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  invite_code text not null unique default upper(substr(md5(random()::text), 1, 4)),
  created_at  timestamptz not null default now()
);

create table household_members (
  household_id uuid not null references households(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  role         text not null default 'member', -- 'owner' | 'member'
  display_name text,
  primary key (household_id, user_id)
);

create table children (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name         text not null,
  color        text not null default '#3b82f6',
  created_at   timestamptz not null default now()
);

create table calendar_sources (
  id             uuid primary key default gen_random_uuid(),
  household_id   uuid not null references households(id) on delete cascade,
  child_id       uuid not null references children(id) on delete cascade,
  type           text not null default 'ics_generic', -- 'ics_teamsnap' | 'ics_generic'
  url            text not null,
  team_name      text,
  last_synced_at timestamptz,
  sync_error     text,
  created_at     timestamptz not null default now()
);

create table events (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references households(id) on delete cascade,
  child_id      uuid not null references children(id) on delete cascade,
  source_id     uuid references calendar_sources(id) on delete set null,
  uid           text,           -- iCal UID for dedup on re-sync
  title         text not null,
  kind          text not null default 'event', -- 'game' | 'practice' | 'event'
  starts_at     timestamptz not null,
  ends_at       timestamptz,
  all_day       boolean not null default false,
  location      text,
  location_url  text,
  opponent      text,
  home_away     text,           -- 'home' | 'away' | null
  arrival_time  timestamptz,
  notes         text,
  -- logistics (family-entered; sync function never overwrites these)
  what_to_bring text,
  uniform_color text,
  driver        text,
  reminder_minutes int,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  -- prevent duplicate imports
  unique (source_id, uid)
);

create table reminder_prefs (
  household_id     uuid primary key references households(id) on delete cascade,
  default_minutes  int not null default 60,
  enabled          boolean not null default true
);

create table push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  endpoint     text not null unique,
  p256dh       text not null,
  auth         text not null,
  created_at   timestamptz not null default now()
);

-- ============================================================
-- ROW-LEVEL SECURITY
-- Every table is scoped to household members only.
-- ============================================================

alter table households         enable row level security;
alter table household_members  enable row level security;
alter table children           enable row level security;
alter table calendar_sources   enable row level security;
alter table events             enable row level security;
alter table reminder_prefs     enable row level security;
alter table push_subscriptions enable row level security;

-- Helper: is the calling user a member of this household?
create or replace function is_household_member(hid uuid)
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from household_members
    where household_id = hid and user_id = auth.uid()
  )
$$;

-- households
create policy "members can read their household"
  on households for select using (is_household_member(id));

-- household_members
create policy "members can read membership rows"
  on household_members for select using (is_household_member(household_id));
create policy "members can insert themselves"
  on household_members for insert with check (user_id = auth.uid());

-- children
create policy "members can read children"
  on children for select using (is_household_member(household_id));
create policy "members can insert children"
  on children for insert with check (is_household_member(household_id));
create policy "members can update children"
  on children for update using (is_household_member(household_id));
create policy "members can delete children"
  on children for delete using (is_household_member(household_id));

-- calendar_sources
create policy "members can read sources"
  on calendar_sources for select using (is_household_member(household_id));
create policy "members can insert sources"
  on calendar_sources for insert with check (is_household_member(household_id));
create policy "members can delete sources"
  on calendar_sources for delete using (is_household_member(household_id));

-- events
create policy "members can read events"
  on events for select using (is_household_member(household_id));
create policy "members can insert events"
  on events for insert with check (is_household_member(household_id));
create policy "members can update events"
  on events for update using (is_household_member(household_id));
create policy "members can delete events"
  on events for delete using (is_household_member(household_id));

-- reminder_prefs
create policy "members can read prefs"
  on reminder_prefs for select using (is_household_member(household_id));
create policy "members can upsert prefs"
  on reminder_prefs for insert with check (is_household_member(household_id));
create policy "members can update prefs"
  on reminder_prefs for update using (is_household_member(household_id));

-- push_subscriptions
create policy "users can manage own subscriptions"
  on push_subscriptions for all using (user_id = auth.uid());
create policy "edge functions can read subscriptions"
  on push_subscriptions for select using (is_household_member(household_id));

-- ============================================================
-- STORED PROCEDURES (called from the frontend)
-- ============================================================

-- Create a new household and add the caller as owner.
create or replace function create_household(p_name text, p_display_name text default null)
returns void language plpgsql security definer as $$
declare
  v_hid uuid;
begin
  insert into households(name)
  values (p_name)
  returning id into v_hid;

  insert into household_members(household_id, user_id, role, display_name)
  values (v_hid, auth.uid(), 'owner', p_display_name);
end;
$$;

-- Join an existing household via invite code.
create or replace function join_household(p_code text)
returns void language plpgsql security definer as $$
declare
  v_hid uuid;
begin
  select id into v_hid from households
  where upper(invite_code) = upper(p_code);

  if v_hid is null then
    raise exception 'Invalid invite code';
  end if;

  -- Idempotent: ignore if already a member
  insert into household_members(household_id, user_id, role)
  values (v_hid, auth.uid(), 'member')
  on conflict do nothing;
end;
$$;

-- Auto-update events.updated_at
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger events_updated_at
  before update on events
  for each row execute procedure set_updated_at();

-- ============================================================
-- pg_cron JOBS (scheduled background work)
-- Run after the extension is confirmed available in your project.
-- ============================================================

-- Sync all calendar sources every 4 hours
-- (Edge Function sync-source must be deployed first)
-- select cron.schedule(
--   'sync-all-sources',
--   '0 */4 * * *',
--   $$
--     select net.http_post(
--       url := current_setting('app.supabase_url') || '/functions/v1/sync-all-sources',
--       headers := jsonb_build_object(
--         'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
--         'Content-Type', 'application/json'
--       ),
--       body := '{}'::jsonb
--     )
--   $$
-- );

-- Send reminders every 5 minutes
-- select cron.schedule(
--   'send-reminders',
--   '*/5 * * * *',
--   $$
--     select net.http_post(
--       url := current_setting('app.supabase_url') || '/functions/v1/send-reminders',
--       headers := jsonb_build_object(
--         'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
--         'Content-Type', 'application/json'
--       ),
--       body := '{}'::jsonb
--     )
--   $$
-- );
