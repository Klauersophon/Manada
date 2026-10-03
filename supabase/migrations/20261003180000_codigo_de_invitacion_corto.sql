-- Código de invitación de 8 caracteres, fácil de dictar o escribir a mano. Usa un alfabeto sin
-- caracteres que se confunden (0/O, 1/I/L) ni letras que se leen distinto según la voz (U/V).
-- 31 símbolos ^ 8 son unos 40 bits: menos que los 72 de antes, pero cada invitación dura 7 días,
-- y quien quiera adivinar necesita una sesión (las anónimas tienen tope por hora y por IP).
-- Los códigos anteriores (12 caracteres) siguen funcionando hasta que venzan.
create or replace function public.generar_codigo_de_invitacion()
  returns text
  language plpgsql
  volatile
  set search_path = ''
as $$
declare
  alfabeto constant text := 'ABCDEFGHJKMNPQRSTWXYZ23456789';
  bytes bytea := extensions.gen_random_bytes(8);
  resultado text := '';
begin
  for i in 0..7 loop
    resultado := resultado || substr(alfabeto, (get_byte(bytes, i) % length(alfabeto)) + 1, 1);
  end loop;
  return resultado;
end;
$$;

revoke all on function public.generar_codigo_de_invitacion() from public, anon;
grant execute on function public.generar_codigo_de_invitacion() to authenticated;

alter table public.invites alter column code set default public.generar_codigo_de_invitacion();

-- Quien escribe el código a mano puede usar minúsculas o espacios: se normaliza a mayúsculas.
-- Los códigos antiguos distinguen mayúsculas, así que primero se busca el texto tal cual.
create or replace function public.preview_invite(invite_code text)
  returns table (circle_id uuid, circle_name text)
  language sql
  stable
  security definer
  set search_path = ''
as $$
  select c.id, c.name
  from public.invites i
  join public.circles c on c.id = i.circle_id
  where i.code in (invite_code, upper(replace(invite_code, ' ', '')))
    and not i.revoked and i.expires_at > now();
$$;

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
  where i.code in (invite_code, upper(replace(invite_code, ' ', '')))
    and not i.revoked and i.expires_at > now();

  if target_circle is null then
    raise exception 'Invitación inválida o vencida' using errcode = 'P0002';
  end if;

  insert into public.memberships (circle_id, user_id, display_name, role)
  values (target_circle, auth.uid(), trim(member_name), 'caregiver')
  on conflict (circle_id, user_id) do nothing;

  return target_circle;
end;
$$;
