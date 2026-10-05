-- Tiempo real: Supabase Realtime solo avisa cambios de las tablas que están en la publicación
-- supabase_realtime. Se agregan las que cambian mientras otra persona mira la app:
-- - care_logs y task_assignments: marcar, deshacer y repartir en "Hoy" y Semana.
-- - care_tasks: un admin define o pausa tareas.
-- - memberships: alguien se une al hogar o cambia de rol.
-- Los avisos de INSERT y UPDATE pasan por RLS, así que cada persona solo recibe los de su hogar.
-- Los DELETE no se pueden filtrar y llevan solo la clave primaria; la app los usa como señal para
-- volver a pedir los datos, que sí pasan por RLS.
do $$
declare
  tabla text;
begin
  foreach tabla in array array['care_logs', 'task_assignments', 'care_tasks', 'memberships'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = tabla
    ) then
      execute format('alter publication supabase_realtime add table public.%I', tabla);
    end if;
  end loop;
end;
$$;
