SET local check_function_bodies = off;

CREATE SCHEMA "private";

CREATE TABLE "public"."care_logs" (
  "id"           uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "task_id"      uuid                     NOT NULL,
  "date"         date                     NOT NULL,
  "done_by"      uuid,
  "done_by_name" text                     NOT NULL,
  "done_at"      timestamp with time zone DEFAULT now(),
  "photo_url"    text,
  CONSTRAINT "care_logs_pkey" PRIMARY KEY (id),
  CONSTRAINT "care_logs_task_id_date_key" UNIQUE (task_id, date)
);

ALTER TABLE "public"."care_logs"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."care_tasks" (
  "id"               uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "pet_id"           uuid                     NOT NULL,
  "name"             text                     NOT NULL,
  "icon"             text,
  "time_of_day"      time without time zone,
  "weekdays"         integer[]                NOT NULL DEFAULT '{1,2,3,4,5,6,7}'::integer[],
  "default_assignee" uuid,
  "active"           boolean                  NOT NULL DEFAULT true,
  "created_at"       timestamp with time zone DEFAULT now(),
  CONSTRAINT "care_tasks_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."care_tasks"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."circles" (
  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "name"       text                     NOT NULL,
  "created_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "circles_pkey" PRIMARY KEY (id),
  "created_by" uuid                     DEFAULT auth.uid()
);

ALTER TABLE "public"."circles"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."invites" (
  "code"       text                     NOT NULL,
  "circle_id"  uuid                     NOT NULL,
  "created_by" uuid,
  "expires_at" timestamp with time zone NOT NULL,
  "revoked"    boolean                  NOT NULL DEFAULT false,
  "created_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "invites_pkey" PRIMARY KEY (code)
);

ALTER TABLE "public"."invites"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."memberships" (
  "circle_id"    uuid                     NOT NULL,
  "user_id"      uuid                     NOT NULL,
  "display_name" text                     NOT NULL,
  "role"         text                     NOT NULL DEFAULT 'caregiver'::text,
  "joined_at"    timestamp with time zone DEFAULT now(),
  CONSTRAINT "memberships_pkey" PRIMARY KEY (circle_id, user_id),
  CONSTRAINT "memberships_role_check" CHECK ((role = ANY (ARRAY['admin'::text, 'caregiver'::text])))
);

ALTER TABLE "public"."memberships"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."pets" (
  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "circle_id"  uuid                     NOT NULL,
  "name"       text                     NOT NULL,
  "species"    text                     NOT NULL,
  "photo_url"  text,
  "notes"      text,
  "created_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "pets_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."pets"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."task_assignments" (
  "task_id"  uuid NOT NULL,
  "date"     date NOT NULL,
  "assignee" uuid,
  CONSTRAINT "task_assignments_pkey" PRIMARY KEY (task_id, date)
);

ALTER TABLE "public"."task_assignments"
  ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION private.is_admin (
  c uuid
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public', 'pg_temp'
  AS $function$
  select exists (
    select 1 from memberships
    where circle_id = c and user_id = auth.uid() and role = 'admin'
  );
$function$;

CREATE OR REPLACE FUNCTION private.is_member (
  c uuid
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public', 'pg_temp'
  AS $function$
  select exists (
    select 1 from memberships
    where circle_id = c and user_id = auth.uid()
  );
$function$;

ALTER TABLE "public"."care_logs"
  ADD CONSTRAINT "care_logs_done_by_fkey" FOREIGN KEY (done_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."care_tasks"
  ADD CONSTRAINT "care_tasks_default_assignee_fkey" FOREIGN KEY (default_assignee) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."care_logs"
  ADD CONSTRAINT "care_logs_task_id_fkey" FOREIGN KEY (task_id) REFERENCES public.care_tasks(id) ON DELETE CASCADE;

ALTER TABLE "public"."invites"
  ADD CONSTRAINT "invites_circle_id_fkey" FOREIGN KEY (circle_id) REFERENCES public.circles(id) ON DELETE CASCADE;

ALTER TABLE "public"."invites"
  ADD CONSTRAINT "invites_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."memberships"
  ADD CONSTRAINT "memberships_circle_id_fkey" FOREIGN KEY (circle_id) REFERENCES public.circles(id) ON DELETE CASCADE;

ALTER TABLE "public"."memberships"
  ADD CONSTRAINT "memberships_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."pets"
  ADD CONSTRAINT "pets_circle_id_fkey" FOREIGN KEY (circle_id) REFERENCES public.circles(id) ON DELETE CASCADE;

ALTER TABLE "public"."care_tasks"
  ADD CONSTRAINT "care_tasks_pet_id_fkey" FOREIGN KEY (pet_id) REFERENCES public.pets(id) ON DELETE CASCADE;

ALTER TABLE "public"."task_assignments"
  ADD CONSTRAINT "task_assignments_assignee_fkey" FOREIGN KEY (assignee) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."task_assignments"
  ADD CONSTRAINT "task_assignments_task_id_fkey" FOREIGN KEY (task_id) REFERENCES public.care_tasks(id) ON DELETE CASCADE;

CREATE POLICY "borrar solo lo mio" ON "public"."care_logs"
  FOR DELETE
  TO "authenticated"
  USING ((done_by = auth.uid()));

CREATE POLICY "ver registros" ON "public"."care_logs"
  FOR SELECT
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM (public.care_tasks t
     JOIN public.pets p ON ((p.id = t.pet_id)))
  WHERE ((t.id = care_logs.task_id) AND private.is_member(p.circle_id)))));

CREATE POLICY "registrar" ON "public"."care_logs"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((done_by = auth.uid()) AND (EXISTS ( SELECT 1
   FROM (public.care_tasks t
     JOIN public.pets p ON ((p.id = t.pet_id)))
  WHERE ((t.id = care_logs.task_id) AND private.is_member(p.circle_id))))));

CREATE POLICY "admin gestiona tareas" ON "public"."care_tasks"
  FOR ALL
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.pets p
  WHERE ((p.id = care_tasks.pet_id) AND private.is_admin(p.circle_id)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.pets p
  WHERE ((p.id = care_tasks.pet_id) AND private.is_admin(p.circle_id)))));

CREATE POLICY "ver tareas" ON "public"."care_tasks"
  FOR SELECT
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.pets p
  WHERE ((p.id = care_tasks.pet_id) AND private.is_member(p.circle_id)))));

CREATE POLICY "admin edita circulo" ON "public"."circles"
  FOR UPDATE
  TO "authenticated"
  USING (private.is_admin(id));

CREATE POLICY "ver mi circulo" ON "public"."circles"
  FOR SELECT
  TO "authenticated"
  USING (private.is_member(id));

CREATE POLICY "admin gestiona invitaciones" ON "public"."invites"
  FOR ALL
  TO "authenticated"
  USING (private.is_admin(circle_id))
  WITH CHECK (private.is_admin(circle_id));

CREATE POLICY "admin cambia roles" ON "public"."memberships"
  FOR UPDATE
  TO "authenticated"
  USING (private.is_admin(circle_id));

CREATE POLICY "salir o admin expulsa" ON "public"."memberships"
  FOR DELETE
  TO "authenticated"
  USING (((user_id = auth.uid()) OR private.is_admin(circle_id)));

CREATE POLICY "ver miembros" ON "public"."memberships"
  FOR SELECT
  TO "authenticated"
  USING (private.is_member(circle_id));

CREATE POLICY "unirse" ON "public"."memberships"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((user_id = auth.uid()));

CREATE POLICY "admin gestiona mascotas" ON "public"."pets"
  FOR ALL
  TO "authenticated"
  USING (private.is_admin(circle_id))
  WITH CHECK (private.is_admin(circle_id));

CREATE POLICY "ver mascotas" ON "public"."pets"
  FOR SELECT
  TO "authenticated"
  USING (private.is_member(circle_id));

CREATE POLICY "ver asignaciones" ON "public"."task_assignments"
  FOR SELECT
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM (public.care_tasks t
     JOIN public.pets p ON ((p.id = t.pet_id)))
  WHERE ((t.id = task_assignments.task_id) AND private.is_member(p.circle_id)))));

CREATE POLICY "asignar" ON "public"."task_assignments"
  FOR ALL
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM (public.care_tasks t
     JOIN public.pets p ON ((p.id = t.pet_id)))
  WHERE ((t.id = task_assignments.task_id) AND (private.is_admin(p.circle_id) OR (private.is_member(p.circle_id) AND (task_assignments.assignee = auth.uid())))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.care_tasks t
     JOIN public.pets p ON ((p.id = t.pet_id)))
  WHERE ((t.id = task_assignments.task_id) AND (private.is_admin(p.circle_id) OR (private.is_member(p.circle_id) AND (task_assignments.assignee = auth.uid())))))));

REVOKE ALL ON FUNCTION "private"."is_admin"(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "private"."is_admin"(uuid) TO "authenticated";

REVOKE ALL ON FUNCTION "private"."is_member"(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "private"."is_member"(uuid) TO "authenticated";

GRANT USAGE ON SCHEMA "private" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."care_logs" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."care_logs" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."care_logs" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."care_logs" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."care_tasks" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."care_tasks" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."care_tasks" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."care_tasks" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."circles" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."circles" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."circles" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."circles" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."invites" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."invites" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."invites" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."invites" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."memberships" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."memberships" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."memberships" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."memberships" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."pets" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."pets" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."pets" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."pets" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."task_assignments" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."task_assignments" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."task_assignments" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."task_assignments" TO "service_role";

ALTER TABLE "public"."circles"
  ADD CONSTRAINT "circles_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE POLICY "crear mi circulo" ON "public"."circles"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((created_by = auth.uid()));

