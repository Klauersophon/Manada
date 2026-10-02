-- El código de invitación lo genera la base: 9 bytes aleatorios (72 bits) en base64 apta para URL.
-- Antes lo elegía el cliente, y un código corto se podía adivinar probando con accept_invite.
-- Los links duran 7 días y sirven para varias personas, pensados para compartir en el grupo familiar.
alter table public.invites
  alter column code set default translate(encode(extensions.gen_random_bytes(9), 'base64'), '+/', '-_'),
  alter column expires_at set default now() + interval '7 days',
  alter column created_by set default auth.uid();

-- Círculo de una invitación vigente, para mostrar "Te invitaron a ..." antes de unirse y reconocer
-- a quien ya es miembro. No devuelve filas si el código no existe, está revocado o venció.
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
  where i.code = invite_code and not i.revoked and i.expires_at > now();
$$;

revoke all on function public.preview_invite(text) from public, anon;
grant execute on function public.preview_invite(text) to authenticated;
