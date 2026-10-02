-- Verifica que solo se entra a un círculo creándolo o con una invitación válida.
-- Ana crea el círculo, Beto se une con invitación y Caro es una usuaria ajena.
begin;
create extension if not exists pgtap with schema extensions;
select plan(19);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'ana@test.cl'),
  ('00000000-0000-0000-0000-00000000000b', 'beto@test.cl'),
  ('00000000-0000-0000-0000-00000000000c', 'caro@test.cl');

-- Sin sesión no se puede crear un círculo ni aceptar invitaciones
set local role anon;
select throws_ok($$ select public.create_circle('Casa', 'Ana') $$, '42501', null,
  'anon no puede crear círculos');
select throws_ok($$ select public.accept_invite('X', 'Ana') $$, '42501', null,
  'anon no puede aceptar invitaciones');

-- Ana crea su círculo y queda como admin
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select throws_ok($$ select public.create_circle('  ', 'Ana') $$, '22023', null,
  'el nombre del círculo es obligatorio');
select set_config('test.circle', public.create_circle('Casa', 'Ana')::text, true);
select is((select count(*) from public.circles), 1::bigint, 'Ana ve su círculo');
select is(
  (select role from public.memberships where user_id = auth.uid()), 'admin',
  'quien crea el círculo queda como admin');

insert into public.invites (code, circle_id, expires_at, revoked) values
  ('CODIGO-OK', current_setting('test.circle')::uuid, now() + interval '1 day', false),
  ('CODIGO-VENCIDO', current_setting('test.circle')::uuid, now() - interval '1 day', false),
  ('CODIGO-REVOCADO', current_setting('test.circle')::uuid, now() + interval '1 day', true);

-- Beto no puede entrar por la puerta de atrás
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
select is((select count(*) from public.circles), 0::bigint, 'Beto no ve círculos ajenos');
select throws_ok(
  format($$ insert into public.memberships (circle_id, user_id, display_name, role)
            values (%L, auth.uid(), 'Beto', 'admin') $$, current_setting('test.circle')),
  '42501', null, 'no se puede insertar membresía directo, ni como admin');
select throws_ok(
  $$ insert into public.circles (name, created_by) values ('Otro', auth.uid()) $$,
  '42501', null, 'no se puede crear un círculo sin la función');
select is((select count(*) from public.invites), 0::bigint, 'un no-admin no ve invitaciones');

-- Solo un código vigente sirve
select throws_ok($$ select public.accept_invite('NO-EXISTE', 'Beto') $$, 'P0002', null,
  'código inexistente se rechaza');
select throws_ok($$ select public.accept_invite('CODIGO-VENCIDO', 'Beto') $$, 'P0002', null,
  'código vencido se rechaza');
select throws_ok($$ select public.accept_invite('CODIGO-REVOCADO', 'Beto') $$, 'P0002', null,
  'código revocado se rechaza');
select is(public.accept_invite('CODIGO-OK', 'Beto'), current_setting('test.circle')::uuid,
  'código vigente une al círculo');
select is(
  (select role from public.memberships where user_id = auth.uid()), 'caregiver',
  'quien entra por invitación queda como caregiver');
select is((select count(*) from public.circles), 1::bigint, 'Beto ahora ve el círculo');

-- Ni repetir el código ni editar la membresía sirve para ascender
select lives_ok($$ select public.accept_invite('CODIGO-OK', 'Beto') $$,
  'aceptar dos veces no falla');
update public.memberships set role = 'admin' where user_id = auth.uid();
select is(
  (select role from public.memberships where user_id = auth.uid()), 'caregiver',
  'un caregiver no puede ascenderse a admin');

-- Caro sigue sin ver nada
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}';
select is((select count(*) from public.circles), 0::bigint, 'Caro no ve el círculo');
select is((select count(*) from public.memberships), 0::bigint, 'Caro no ve miembros');

select * from finish();
rollback;
