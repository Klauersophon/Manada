-- 1. Un hogar nunca queda sin admin.
-- Las policies dejan que un admin cambie roles y que cualquiera salga del hogar, así que sin esta
-- regla el último admin podía quitarse el rol o irse y dejar el hogar sin quien invite ni edite.
-- Se permite cuando el borrado viene en cascada porque se eliminó el hogar o la cuenta de la
-- persona: en ese caso la fila padre ya no existe.
create or replace function private.mantener_un_admin()
  returns trigger
  language plpgsql
  security definer
  set search_path = ''
as $$
begin
  if old.role <> 'admin' then
    return coalesce(new, old);
  end if;
  if tg_op = 'UPDATE' and new.role = 'admin' and new.circle_id = old.circle_id then
    return new;
  end if;
  if tg_op = 'DELETE' and (
    not exists (select 1 from public.circles where id = old.circle_id)
    or not exists (select 1 from auth.users where id = old.user_id)
  ) then
    return old;
  end if;
  if not exists (
    select 1 from public.memberships
    where circle_id = old.circle_id and role = 'admin' and user_id <> old.user_id
  ) then
    raise exception 'El hogar no puede quedar sin admin. Nombra a alguien más antes.'
      using errcode = 'P0001';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger mantener_un_admin
  before update or delete on public.memberships
  for each row execute function private.mantener_un_admin();

-- 2. Ficha de la mascota: raza, nacimiento y veterinario.
-- El nacimiento se guarda como fecha exacta cuando se conoce, o solo el año. La app calcula la
-- edad, así que nunca queda desactualizada como pasaría guardando "3 años".
alter table public.pets
  add column breed text,
  add column birth_date date,
  add column birth_year smallint,
  add column vet_name text,
  add column vet_phone text,
  add constraint pets_birth_year_check check (birth_year between 1980 and 2100),
  add constraint pets_birth_date_matches_year check (
    birth_date is null or extract(year from birth_date) = birth_year
  );
