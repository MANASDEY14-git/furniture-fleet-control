SELECT cron.alter_job(job_id := 2, schedule := '30 1 * * *');

SELECT cron.schedule(
  'digest-evening-test',
  '* * * * *',
  $cmd$
  SELECT net.http_post(
    url := 'https://zyzwtoxrosfdheqehsvq.supabase.co/functions/v1/telegram-daily-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Internal-Secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'edge_internal_secret' LIMIT 1)
    ),
    body := jsonb_build_object('mode', 'evening', 'store_id', '4cef7908-037e-435e-acf6-89d35a81f965')
  );
  $cmd$
);