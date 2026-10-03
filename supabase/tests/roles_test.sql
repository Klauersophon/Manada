-- Verifica que un hogar nunca quede sin admin y la consistencia del nacimiento en la ficha.
-- Ana crea el hogar (admin) y Beto se une como miembro.
begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'ana@pgtap.test'),
  ('00000000-0000-0000-0000-00000000000b', 'beto@pgtap.test');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select set_config('test.circle', public.create_circle('Casa Test', 'Ana')::text, true);
insert into public.invites (code, circle_id) values ('PGTAP-ROLES', current_setting('test.circle')::uuid);
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
select public.accept_invite('PGTAP-ROLES', 'Beto');

-- Ana es la única admin
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select throws_ok(
  $$ update public.memberships set role = 'caregiver' where user_id = auth.uid() $$,
  'P0001', 'El hogar no puede quedar sin admin. Nombra a alguien más antes.',
  'la única admin no puede quitarse el rol');
select throws_ok(
  $$ delete from public.memberships where user_id = auth.uid() $$,
  'P0001', null, 'la única admin no puede salir del hogar');

-- Con otra admin, sí
select lives_ok(
  $$ update public.memberships set role = 'admin' where user_id = '00000000-0000-0000-0000-00000000000b' $$,
  'la admin puede nombrar a otra persona admin');
select lives_ok(
  $$ update public.memberships set role = 'caregiver' where user_id = auth.uid() $$,
  'con otra admin, puede quitarse el rol');
select is(
  (select role from public.memberships where user_id = auth.uid()), 'caregiver',
  'el cambio de rol quedó guardado');

-- Ahora Beto es el único admin y Ana, miembro, puede salir
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
select throws_ok(
  $$ update public.memberships set role = 'caregiver' where user_id = auth.uid() $$,
  'P0001', null, 'el nuevo único admin tampoco puede quitarse el rol');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select lives_ok($$ delete from public.memberships where user_id = auth.uid() $$, 'un miembro puede salir del hogar');

-- Borrar la cuenta del último admin o el hogar completo no se bloquea
reset role;
select lives_ok(
  $$ delete from auth.users where id = '00000000-0000-0000-0000-00000000000b' $$,
  'borrar la cuenta del último admin no se bloquea');
select is(
  (select count(*) from public.memberships where circle_id = current_setting('test.circle')::uuid), 0::bigint,
  'sus membresías se borran en cascada');
select lives_ok(
  format($$ delete from public.circles where id = %L $$, current_setting('test.circle')),
  'borrar un hogar no se bloquea');

-- Nacimiento: la fecha exacta tiene que calzar con el año
insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000c', 'caro@pgtap.test');
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}';
select set_config('test.circle2', public.create_circle('Casa Caro', 'Caro')::text, true);
select throws_ok(
  format($$ insert into public.pets (circle_id, name, species, birth_date, birth_year)
            values (%L, 'Luna', 'dog', '2021-05-10', 2020) $$, current_setting('test.circle2')),
  '23514', null, 'la fecha de nacimiento no puede contradecir el año');
select lives_ok(
  format($$ insert into public.pets (circle_id, name, species, breed, birth_year, vet_name, vet_phone)
            values (%L, 'Michi', 'cat', 'Criollo', 2021, 'Vet Miraflores', '987 654 321') $$,
    current_setting('test.circle2')),
  'se puede guardar solo el año, con raza y veterinario');

select * from finish();
rollback;
