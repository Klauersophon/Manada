-- Verifica que las tablas que la app escucha en vivo estén en la publicación de Realtime.
begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

select ok(
  exists (select 1 from pg_publication_tables
          where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t),
  t || ' avisa sus cambios en tiempo real')
from unnest(array['care_logs', 'task_assignments', 'care_tasks', 'memberships']) as t;

select * from finish();
rollback;
