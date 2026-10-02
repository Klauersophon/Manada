-- Archivar en vez de borrar: borrar una mascota borra en cascada sus tareas y registros, y con
-- ellos el historial de cuidados. Una mascota archivada deja de aparecer en el día a día pero
-- conserva todo. Las policies existentes ya cubren la columna: solo los admins la cambian.
alter table public.pets add column archived_at timestamp with time zone;
