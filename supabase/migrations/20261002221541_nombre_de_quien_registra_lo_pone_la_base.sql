-- done_by_name lo enviaba la app, así que alguien podía registrar una tarea "hecha por" otra
-- persona. Ahora la base lo toma de memberships.display_name de quien registra, en el círculo de
-- la mascota. El default '' solo existe para que la app no tenga que enviarlo: el trigger
-- siempre lo reemplaza antes de guardar.
alter table public.care_logs alter column done_by_name set default '';

create or replace function private.poner_nombre_de_quien_registra()
  returns trigger
  language plpgsql
  security definer
  set search_path = ''
as $$
begin
  select m.display_name into new.done_by_name
  from public.care_tasks t
  join public.pets p on p.id = t.pet_id
  join public.memberships m on m.circle_id = p.circle_id and m.user_id = auth.uid()
  where t.id = new.task_id;

  -- Sin membresía, la policy "registrar" rechaza la fila de todas formas. Se deja un valor no
  -- nulo para que el error que vea la app sea el de RLS y no el de NOT NULL.
  new.done_by_name := coalesce(new.done_by_name, '');
  return new;
end;
$$;

create trigger poner_nombre_de_quien_registra
  before insert on public.care_logs
  for each row execute function private.poner_nombre_de_quien_registra();
