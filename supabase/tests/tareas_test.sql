-- Verifica las reglas de tareas, registros del día y asignaciones.
-- Ana es admin, Beto y Dani son miembros, y Caro no pertenece al círculo.
begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'ana@pgtap.test'),
  ('00000000-0000-0000-0000-00000000000b', 'beto@pgtap.test'),
  ('00000000-0000-0000-0000-00000000000c', 'caro@pgtap.test'),
  ('00000000-0000-0000-0000-00000000000d', 'dani@pgtap.test');

-- Ana arma el círculo con una mascota y una tarea
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select set_config('test.circle', public.create_circle('Casa Test', 'Ana')::text, true);
insert into public.invites (code, circle_id) values ('PGTAP-TAREAS', current_setting('test.circle')::uuid);
insert into public.pets (circle_id, name, species) values (current_setting('test.circle')::uuid, 'Luna', 'dog');
select lives_ok(
  $$ insert into public.care_tasks (pet_id, name, time_of_day, weekdays)
     select id, 'Paseo', '08:00', '{1,2,3,4,5}' from public.pets $$,
  'el admin puede crear tareas');
select set_config('test.task', (select id::text from public.care_tasks), true);

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
select public.accept_invite('PGTAP-TAREAS', 'Beto');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000d","role":"authenticated"}';
select public.accept_invite('PGTAP-TAREAS', 'Dani');

-- Beto, como miembro, ve las tareas pero no las gestiona
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
select is((select count(*) from public.care_tasks), 1::bigint, 'un miembro ve las tareas');
select throws_ok(
  $$ insert into public.care_tasks (pet_id, name) select id, 'Otra' from public.pets $$,
  '42501', null, 'un miembro no puede crear tareas');
update public.care_tasks set name = 'Hackeada';
update public.care_tasks set active = false;

-- Registrar la tarea del día
select throws_ok(
  format($$ insert into public.care_logs (task_id, date, done_by)
            values (%L, current_date, '00000000-0000-0000-0000-00000000000a') $$,
    current_setting('test.task')),
  '42501', null, 'nadie puede registrar a nombre de otra persona');
select lives_ok(
  format($$ insert into public.care_logs (task_id, date, done_by, done_by_name)
            values (%L, current_date, auth.uid(), 'Ana') $$, current_setting('test.task')),
  'un miembro registra la tarea como hecha');
select is((select done_by_name from public.care_logs), 'Beto',
  'el nombre de quien registra lo pone la base, aunque la app envíe otro');
select throws_ok(
  format($$ insert into public.care_logs (task_id, date, done_by)
            values (%L, current_date, auth.uid()) $$, current_setting('test.task')),
  '23505', null, 'una tarea se registra una sola vez por día');

-- Dani no puede deshacer lo que registró Beto
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000d","role":"authenticated"}';
delete from public.care_logs;
select is((select count(*) from public.care_logs), 1::bigint, 'nadie borra el registro de otra persona');

-- Beto sí puede deshacer lo suyo
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
delete from public.care_logs;
select is((select count(*) from public.care_logs), 0::bigint, 'cada uno puede deshacer su registro');

-- Asignaciones del día
select throws_ok(
  format($$ insert into public.task_assignments (task_id, date, assignee)
            values (%L, current_date, '00000000-0000-0000-0000-00000000000d') $$,
    current_setting('test.task')),
  '42501', null, 'un miembro no puede asignarle la tarea a otra persona');
select lives_ok(
  format($$ insert into public.task_assignments (task_id, date, assignee)
            values (%L, current_date, auth.uid()) $$, current_setting('test.task')),
  'un miembro puede tomar la tarea del día ("Lo hago yo")');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000d","role":"authenticated"}';
update public.task_assignments set assignee = auth.uid();
delete from public.task_assignments;
select is((select assignee from public.task_assignments),
  '00000000-0000-0000-0000-00000000000b'::uuid,
  'un miembro no puede quitarle la tarea a quien la tomó');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
update public.task_assignments set assignee = '00000000-0000-0000-0000-00000000000d';
select is((select assignee from public.task_assignments),
  '00000000-0000-0000-0000-00000000000d'::uuid, 'el admin puede reasignar la tarea del día');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000d","role":"authenticated"}';
delete from public.task_assignments;
select is((select count(*) from public.task_assignments), 0::bigint,
  'quien tiene la tarea puede soltarla');

-- Caro, de fuera, no ve ni toca nada
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}';
select is((select count(*) from public.care_tasks), 0::bigint, 'alguien de fuera no ve las tareas');
select throws_ok(
  format($$ insert into public.care_logs (task_id, date, done_by)
            values (%L, current_date, auth.uid()) $$, current_setting('test.task')),
  '42501', null, 'alguien de fuera no puede registrar tareas');
select throws_ok(
  format($$ insert into public.task_assignments (task_id, date, assignee)
            values (%L, current_date, auth.uid()) $$, current_setting('test.task')),
  '42501', null, 'alguien de fuera no puede tomar tareas');

-- Lo que intentaron los miembros sobre la tarea no tuvo efecto
reset role;
select is((select name from public.care_tasks where id = current_setting('test.task')::uuid), 'Paseo', 'un miembro no puede renombrar tareas');
select is((select active from public.care_tasks where id = current_setting('test.task')::uuid), true, 'un miembro no puede pausar tareas');
select is((select weekdays from public.care_tasks where id = current_setting('test.task')::uuid), '{1,2,3,4,5}'::integer[],
  'los días quedan como los definió el admin');

select * from finish();
rollback;
