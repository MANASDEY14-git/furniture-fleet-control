-- 1. Morning (01:30 UTC = 07:00 IST): owner recap of yesterday
SELECT cron.alter_job(
  job_id := 2,
  command := $cmd$
  SELECT net.http_post(
    url := 'https://zyzwtoxrosfdheqehsvq.supabase.co/functions/v1/telegram-daily-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Internal-Secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'edge_internal_secret' LIMIT 1)
    ),
    body := jsonb_build_object('mode', 'morning')
  );
  $cmd$
);

-- 2. Keep the operational alert scan running on its own schedule (01:00 UTC = 06:30 IST)
SELECT cron.schedule(
  'operational-alert-scan',
  '0 1 * * *',
  $cmd$
  SELECT net.http_post(
    url := 'https://zyzwtoxrosfdheqehsvq.supabase.co/functions/v1/operational-alert-scanner',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Internal-Secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'edge_internal_secret' LIMIT 1)
    ),
    body := '{}'::jsonb
  );
  $cmd$
);

-- 3. Evening: point the briefing checker at the new owner-voice digest
CREATE OR REPLACE FUNCTION public.cron_check_briefings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_rec record;
  v_secret text;
  v_url text := 'https://zyzwtoxrosfdheqehsvq.supabase.co/functions/v1/telegram-daily-digest';
BEGIN
  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets WHERE name = 'edge_internal_secret' LIMIT 1;

  FOR v_rec IN
    SELECT store_id, briefing_timezone, briefing_time
    FROM public.agent_settings
    WHERE briefing_enabled = true
      AND (
        last_briefing_at IS NULL
        OR (last_briefing_at AT TIME ZONE briefing_timezone)::date < (now() AT TIME ZONE briefing_timezone)::date
      )
      AND (now() AT TIME ZONE briefing_timezone)::time >= briefing_time
  LOOP
    PERFORM net.http_post(
      url := v_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'X-Internal-Secret', COALESCE(v_secret, '')
      ),
      body := jsonb_build_object(
        'store_id', v_rec.store_id,
        'mode', 'evening',
        'source', 'scheduled'
      )
    );
  END LOOP;
END;
$fn$;