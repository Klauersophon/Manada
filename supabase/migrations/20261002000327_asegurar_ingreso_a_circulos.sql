-- Entrar a un círculo solo es posible por estas dos funciones.
-- La policy "unirse" dejaba que cualquier usuario se insertara en cualquier círculo, incluso como
-- admin, y "crear mi circulo" dejaba círculos huérfanos que ni su creador podía leer.
drop policy "unirse" on public.memberships;
drop policy "crear mi circulo" on public.circles;

-- Crea el círculo y deja a quien lo crea como admin, en una sola transacción.
create or replace function public.create_circle(circle_name text, member_name text)
  returns uuid
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  new_circle uuid;
begin
  if auth.uid() is null then
    raise exception 'Se requiere sesión' using errcode = '28000';
  end if;
  if coalesce(trim(circle_name), '') = '' or coalesce(trim(member_name), '') = '' then
    raise exception 'Nombre de círculo y de miembro son obligatorios' using errcode = '22023';
  end if;

  insert into public.circles (name, created_by)
  values (trim(circle_name), auth.uid())
  returning id into new_circle;

  insert into public.memberships (circle_id, user_id, display_name, role)
  values (new_circle, auth.uid(), trim(member_name), 'admin');

  return new_circle;
end;
$$;

-- Suma a quien llama como caregiver si el código existe, no está revocado y no venció.
-- Si ya era miembro, no cambia su rol.
create or replace function public.accept_invite(invite_code text, member_name text)
  returns uuid
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  target_circle uuid;
begin
  if auth.uid() is null then
    raise exception 'Se requiere sesión' using errcode = '28000';
  end if;
  if coalesce(trim(member_name), '') = '' then
    raise exception 'El nombre de miembro es obligatorio' using errcode = '22023';
  end if;

  select i.circle_id into target_circle
  from public.invites i
  where i.code = invite_code and not i.revoked and i.expires_at > now();

  if target_circle is null then
    raise exception 'Invitación inválida o vencida' using errcode = 'P0002';
  end if;

  insert into public.memberships (circle_id, user_id, display_name, role)
  values (target_circle, auth.uid(), trim(member_name), 'caregiver')
  on conflict (circle_id, user_id) do nothing;

  return target_circle;
end;
$$;

-- Supabase da EXECUTE a anon por defecto en funciones nuevas de public.
revoke all on function public.create_circle(text, text) from public, anon;
revoke all on function public.accept_invite(text, text) from public, anon;
grant execute on function public.create_circle(text, text) to authenticated;
grant execute on function public.accept_invite(text, text) to authenticated;
