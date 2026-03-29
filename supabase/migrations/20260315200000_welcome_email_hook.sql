-- Trigger: send welcome email when a new user signs up.
-- Calls the send-welcome-email edge function via pg_net.
--
-- Prerequisites:
--   1. Enable pg_net extension (Dashboard > Database > Extensions)
--   2. Set RESEND_API_KEY in Edge Function secrets
--   3. Store the service role key in Vault (see INSERT below)

-- Ensure pg_net is enabled
create extension if not exists pg_net with schema extensions;

-- Store the service role key in a config table so the trigger can read it.
-- This avoids needing postgresql.conf access on hosted Supabase.
create table if not exists public._edge_function_config (
  key   text primary key,
  value text not null
);

-- Populate with your project values.
-- Run this ONCE in the SQL Editor, replacing the placeholder:
--
--   INSERT INTO public._edge_function_config (key, value) VALUES
--     ('service_role_key', 'your-service-role-key-here')
--   ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
--
-- The project URL is safe to hardcode (not secret).
insert into public._edge_function_config (key, value) values
  ('supabase_url', 'https://xktarhzbrdnxkaovtdxj.supabase.co')
on conflict (key) do update set value = excluded.value;

-- Lock down the config table — only postgres/service_role can read
alter table public._edge_function_config enable row level security;
revoke all on public._edge_function_config from anon, authenticated;

create or replace function public.handle_new_user_welcome()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  payload jsonb;
  edge_url text;
  service_key text;
begin
  -- Build payload with the user record
  payload := jsonb_build_object(
    'type', 'INSERT',
    'table', 'users',
    'record', jsonb_build_object(
      'id', new.id,
      'email', new.email,
      'raw_user_meta_data', new.raw_user_meta_data,
      'created_at', new.created_at
    )
  );

  -- Read config from our table
  select value into edge_url
    from public._edge_function_config where key = 'supabase_url';
  edge_url := edge_url || '/functions/v1/send-welcome-email';

  select value into service_key
    from public._edge_function_config where key = 'service_role_key';

  -- If service key is missing, skip silently (don't block signup)
  if service_key is null then
    raise warning 'send-welcome-email: service_role_key not set in _edge_function_config';
    return new;
  end if;

  -- Fire-and-forget HTTP call via pg_net
  perform net.http_post(
    url    := edge_url,
    body   := payload,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', concat('Bearer ', service_key)
    )
  );

  return new;
end;
$$;

-- Attach the trigger to auth.users
drop trigger if exists on_auth_user_created_welcome on auth.users;
create trigger on_auth_user_created_welcome
  after insert on auth.users
  for each row
  execute function public.handle_new_user_welcome();
