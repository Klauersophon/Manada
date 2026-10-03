-- Verifica que la base genere los códigos de invitación y que la vista previa solo funcione con
-- códigos vigentes. Ana es admin de su círculo y Beto todavía no pertenece a ninguno.
begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'ana@pgtap.test'),
  ('00000000-0000-0000-0000-00000000000b', 'beto@pgtap.test');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select set_config('test.circle', public.create_circle('Casa Test', 'Ana')::text, true);

-- Ana crea una invitación mandando solo el círculo
insert into public.invites (circle_id) values (current_setting('test.circle')::uuid);
select set_config('test.code', (select code from public.invites limit 1), true);

select matches(current_setting('test.code'), '^[ABCDEFGHJKMNPQRSTWXYZ2-9]{8}$',
  'el código tiene 8 caracteres sin letras que se confunden');
select is((select created_by from public.invites), auth.uid(), 'created_by es quien invita');
select ok(
  (select expires_at between now() + interval '6 days 23 hours' and now() + interval '7 days 1 hour'
   from public.invites),
  'la invitación vence en 7 días');

insert into public.invites (circle_id) values (current_setting('test.circle')::uuid);
select is((select count(distinct code) from public.invites), 2::bigint,
  'cada invitación tiene un código distinto');

-- Beto ve el nombre del círculo solo con un código vigente
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
select results_eq(
  format($$ select * from public.preview_invite(%L) $$, current_setting('test.code')),
  format($$ values (%L::uuid, 'Casa Test') $$, current_setting('test.circle')),
  'la vista previa muestra el id y el nombre del círculo');
select is_empty($$ select * from public.preview_invite('NO-EXISTE') $$,
  'un código inexistente no muestra nada');

select is(
  (select count(*) from public.preview_invite(
    ' ' || lower(substr(current_setting('test.code'), 1, 4)) || ' ' || substr(current_setting('test.code'), 5))),
  1::bigint, 'el código se acepta en minúsculas y con espacios');
select is((select count(*) from public.invites where code ~ '[01OILUV]'), 0::bigint,
  'ningún código usa caracteres confusos');

reset role;
update public.invites set revoked = true where code = current_setting('test.code');
set local role authenticated;
select is_empty(format($$ select * from public.preview_invite(%L) $$, current_setting('test.code')),
  'un código revocado no muestra nada');

reset role;
update public.invites set revoked = false, expires_at = now() - interval '1 minute'
where code = current_setting('test.code');
set local role authenticated;
select is_empty(format($$ select * from public.preview_invite(%L) $$, current_setting('test.code')),
  'un código vencido no muestra nada');

set local role anon;
select throws_ok($$ select public.preview_invite('X') $$, '42501', null,
  'anon no puede usar la vista previa');

select * from finish();
rollback;
