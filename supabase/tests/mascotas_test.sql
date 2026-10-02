-- Verifica quién puede ver y gestionar las mascotas de un círculo.
-- Ana es admin, Beto es miembro y Caro no pertenece al círculo.
begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'ana@pgtap.test'),
  ('00000000-0000-0000-0000-00000000000b', 'beto@pgtap.test'),
  ('00000000-0000-0000-0000-00000000000c', 'caro@pgtap.test');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select set_config('test.circle', public.create_circle('Casa Test', 'Ana')::text, true);
insert into public.invites (code, circle_id) values ('PGTAP-MASCOTAS', current_setting('test.circle')::uuid);

-- Ana gestiona las mascotas
select lives_ok(
  format($$ insert into public.pets (circle_id, name, species) values (%L, 'Luna', 'dog') $$,
    current_setting('test.circle')),
  'el admin puede agregar una mascota');
update public.pets set name = 'Lunita' where name = 'Luna';
select is((select name from public.pets), 'Lunita', 'el admin puede editar una mascota');
update public.pets set archived_at = now() where name = 'Lunita';
select isnt((select archived_at from public.pets), null, 'el admin puede archivar una mascota');
update public.pets set archived_at = null where name = 'Lunita';
select is((select archived_at from public.pets), null, 'el admin puede restaurar una mascota');

-- Beto, como miembro, ve pero no gestiona
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
select public.accept_invite('PGTAP-MASCOTAS', 'Beto');
select is((select count(*) from public.pets), 1::bigint, 'un miembro ve las mascotas');
select throws_ok(
  format($$ insert into public.pets (circle_id, name, species) values (%L, 'Michi', 'cat') $$,
    current_setting('test.circle')),
  '42501', null, 'un miembro no puede agregar mascotas');
update public.pets set name = 'Hackeada';
update public.pets set archived_at = now();
delete from public.pets;

-- Caro no ve nada ni puede agregar mascotas a un círculo ajeno
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}';
select is((select count(*) from public.pets), 0::bigint, 'alguien de fuera no ve las mascotas');
select throws_ok(
  format($$ insert into public.pets (circle_id, name, species) values (%L, 'Intrusa', 'dog') $$,
    current_setting('test.circle')),
  '42501', null, 'alguien de fuera no puede agregar mascotas');

-- Lo que intentó Beto no tuvo efecto
reset role;
select is((select name from public.pets), 'Lunita', 'un miembro no puede renombrar mascotas');
select is((select archived_at from public.pets), null, 'un miembro no puede archivar mascotas');
select is((select count(*) from public.pets), 1::bigint, 'un miembro no puede borrar mascotas');

select * from finish();
rollback;
