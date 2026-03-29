-- Simplify welcome email trigger: verify_jwt = false means no auth header needed.
-- Drop the unnecessary config table and just hardcode the project URL.

drop table if exists public._edge_function_config;

create or replace function public.handle_new_user_welcome()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  payload jsonb;
begin
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

  -- Fire-and-forget — no auth header needed (verify_jwt = false)
  perform net.http_post(
    url     := 'https://xktarhzbrdnxkaovtdxj.supabase.co/functions/v1/send-welcome-email',
    body    := payload,
    headers := '{"Content-Type": "application/json"}'::jsonb
  );

  return new;
end;
$$;
