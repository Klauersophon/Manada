# Manada: contexto para Claude Code

App para que una familia coordine el cuidado diario de sus mascotas: qué toca hoy, a quién le
toca y quién ya lo hizo. Proyecto personal de Oscar (GitHub: Klauersophon).

Este archivo es el contexto compartido entre computadoras y sesiones. Si algo cambia (una
decisión, el estado del plan, una trampa nueva), se actualiza aquí en el mismo PR.

## Estado: publicada y adoptando la maqueta de diseño (paso 6 de 6)

- **Producción:** https://manada-iota.vercel.app. Es la única URL pública; las previews de Vercel
  y el alias `manada-manada-kv.vercel.app` piden login de Vercel.
- **Repo:** github.com/Klauersophon/Manada. Vercel publica `main` en cada merge y crea una
  preview por PR.
- **Supabase:** proyecto `gooarwuoobjsdhaaolps`, plan gratis. Lo pausa si pasa una semana sin uso.
- **Maqueta de diseño:** https://claude.ai/artifact/RvEJw75aHE9XfCXnXM79du. Es la referencia de
  cómo debe verse y comportarse la app.

### Plan para adoptar la maqueta

1. Diseño y navegación: paleta, tipografías, pestañas abajo. Hecho (PR #11).
2. "Hoy" completo: hoja "Quién se encarga", aviso con Deshacer, "Hoy en la manada". Hecho (PR #12).
3. Semana: cuadrícula por mascota, historial y plan de días futuros. Hecho (PR #13).
4. Manada y ficha: roles sin dejar el hogar sin admin, raza, edad y veterinario. Hecho (PR #14).
5. Invitados sin cuenta (ingreso anónimo, correo opcional después desde Manada) y código de
   invitación de 8 caracteres sin letras confusas. Hecho (PR pendiente). Requiere "Allow anonymous
   sign-ins" activo en Supabase (dashboard → Authentication → Sign In / Providers).
6. **Siguiente:** Tiempo real: que "Hoy" se actualice sola con Supabase Realtime.

## Comandos

```sh
npm run dev        # app en localhost:5173, apunta al Supabase REAL (.env.local)
npm run build      # tsc + vite build
npm run lint
npm test           # Vitest: reglas puras (fechas, asignación, semana, edad)
npm run db:test    # pgTAP en supabase/tests (requiere npx supabase start)
npm run e2e        # Chrome contra el Supabase local; npm run e2e -- hoy (solo una)
npm run db:types   # regenera src/lib/database.types.ts desde el proyecto vinculado
```

## Estructura

- `src/pages/`: una página por ruta (`/`, `/semana`, `/manada`, `/mascotas/:id`, `/ingresar`,
  `/unirse/:codigo`). `/hogar` redirige a `/manada`.
- `src/hoy/`, `src/semana/`, `src/mascotas/`, `src/hogar/`, `src/tareas/`: componentes por área.
  Las reglas de negocio van en funciones puras con tests (`calendario.ts`, `asignacion.ts`,
  `semana/reglas.ts`, `mascotas/edad.ts`).
- `src/components/`: `Pantalla` (encabezado y pestañas), `estilos.ts` (clases compartidas),
  `Aviso`, `Avatar`.
- `supabase/migrations/`: todo cambio de esquema va por migración, nunca desde el dashboard.
- `supabase/tests/`: pgTAP de las reglas de seguridad (RLS, RPC, triggers).
- `e2e/`: pruebas de punta a punta con puppeteer-core; `correr.mjs` las orquesta.

## Modelo y reglas de la base

- **Tablas:** `circles` (hogar), `memberships` (role `admin` | `caregiver`, se muestra como
  "Miembro"), `invites`, `pets`, `care_tasks`, `care_logs` y `task_assignments`.
- **Se entra a un hogar solo por las RPC** `create_circle` y `accept_invite`. `preview_invite`
  muestra a qué hogar invitan. El código lo genera la base.
- **Un hogar nunca queda sin admin:** lo asegura el trigger `mantener_un_admin`.
- **`care_logs`:** un registro por tarea y día. `done_by_name` lo pone un trigger, no la app.
- **`task_assignments`:** excepción por día al responsable habitual (`care_tasks.default_assignee`).
  Elegir al habitual borra la fila en vez de duplicarlo.
- **`weekdays`:** convención ISO, 1 es lunes y 7 es domingo. La fecha del día siempre se calcula
  con `fechaLocal()` y nunca con `toISOString()`: en Perú, después de las 19:00 la fecha UTC ya es
  la del día siguiente.
- **Ficha de la mascota:** el nacimiento se guarda como `birth_date` o solo `birth_year`, y la
  edad la calcula la app.

## Decisiones de producto

- **Un hogar visible por persona.** Unirse a un segundo se bloquea con un aviso.
- **Invitados:** `/unirse/:codigo` es pública y ofrece "Entrar como invitado" (`signInAnonymously`). El invitado puede guardar su cuenta con un correo desde Manada (`updateUser` + código `email_change`). Los códigos nuevos son de 8 caracteres (`generar_codigo_de_invitacion`); los de 12 siguen valiendo hasta vencer.
- **Login con enlace mágico más código de 6 dígitos en el correo.** El código es para la app
  instalada en iPhone, porque el enlace abre Safari y la sesión no llega a la app. El SMTP es
  Gmail con contraseña de aplicación, configurado en Supabase. Cada navegador o app instalada
  pide el código una vez.
- **Archivar y pausar en vez de borrar,** para no perder el historial.
- **Cada pestaña recuerda su propia mascota elegida** ("Hoy" tiene además "Todas").
- **La pestaña se llama "Mascota", no "Perfil".**
- **Recordatorios push: fuera de la primera versión.**
- **Textos neutros en género:** "Te damos la bienvenida", rol "Miembro".
- **Las acciones importantes son botones visibles, no links de texto.** Oscar no encontró dónde
  definir tareas cuando era un nombre subrayado.

## Forma de trabajo con Oscar

- **Una rama y un PR por paso,** desde `main`, con nombres según
  `docs/git-conventions.global.md`. Commits y PRs en español, siguiendo
  `docs/pull-request-tpl.global.md`. Si hay migración, va un commit de base y otro de app.
- **Pedir confirmación explícita antes de `npx supabase db push` y antes de subir una rama o abrir
  un PR.** Oscar hace el merge. A veces sube o mergea por su cuenta, así que antes de dar algo por
  pendiente hay que revisar `gh pr list` y `git log --branches --not --remotes`.
- **Después de cada `db push`,** `npm run db:types` debe coincidir con los tipos commiteados
  (comparar con `git diff --ignore-cr-at-eol`).
- **`gh` tiene dos cuentas:** KlauerPE (Buk, sin permisos aquí) y Klauersophon (dueña del repo).
  Antes de un push, revisar con `gh api user --jq .login` y, si hace falta, usar
  `gh auth switch --hostname github.com --user Klauersophon`.
- **Cada entrega lleva** qué cambió, cómo se probó (Vitest, pgTAP, e2e y capturas a 390 px en
  modo claro y oscuro) y qué falta confirmar. Los pasos en dashboards se explican uno a uno, con
  URL directa.

## Trampas del entorno (Windows)

- **Puertos de Supabase local en 553xx** (API 55321, base 55322, Mailpit 55324), porque Hyper-V
  reserva 54257-54356.
- **Oscar suele tener `npm run dev` abierto en el 5173, apuntando al Supabase real.** Las pruebas
  usan el 5174 con `--strictPort` y bloquean cualquier solicitud a `supabase.co`. Nunca hay que
  matar el proceso del 5173. Antes de levantar algo en el 5174, revisar que esté libre.
- **No usar `supabase db reset`:** después de un reset, auth deja de enviar correos (no alcanza
  las plantillas en Kong). Para migraciones nuevas, usar `npx supabase migration up --local`.
- **Levantar solo lo necesario:** `npx supabase start -x
  realtime,storage-api,imgproxy,postgres-meta,studio,edge-runtime,logflare,vector,supavisor`.
- **`gen types --local` sale sin formato.** Se editan los tipos a mano y después del `db push` se
  verifican con `npm run db:types`.
- **El sistema de archivos no distingue mayúsculas:** `Semana.tsx` y `semana.ts` chocan.
- **Tailwind 4: `space-y` pone margen inferior también a los elementos `fixed`.** Por eso hojas
  y avisos usan `createPortal` al body.
- **Heredocs de bash con mucho JSX o backticks a veces fallan.** Es más seguro escribir el script
  a un archivo y ejecutarlo.
- **Datos de prueba:** los e2e usan correos únicos por corrida (`ana+<timestamp>@test.cl`) y
  pgTAP usa `@pgtap.test`, porque la base local conserva datos.

## Pendientes conocidos

- Oscar debe borrar el usuario `ana@test.cl` del Supabase real (lo creó por error un e2e).
- Cambiar la Site URL de Supabase a `https://manada-iota.vercel.app`: quedó en el alias protegido.
- Los PRs tienen las capturas pendientes de adjuntar.
- Después de la primera versión: fotos (bucket de Storage), selector de varios hogares,
  recordatorios, validar que los asignados sean miembros del hogar, y entrar con Google
  (ofrecido, sin decidir).

## Puesta en marcha en otra computadora

1. Instalar Node 22+, Docker Desktop, Git, GitHub CLI y Chrome.
2. `gh auth login` con la cuenta Klauersophon, y `git clone https://github.com/Klauersophon/Manada.git`.
3. `npm install`.
4. Crear `.env.local` a partir de `.env.example`, con la URL y la publishable key de Supabase →
   Project Settings → API.
5. `npx supabase login` y `npx supabase link --project-ref gooarwuoobjsdhaaolps` (pide la
   contraseña de la base).
6. Verificar: `npm test`, y con Docker corriendo, `npx supabase start` + `npm run db:test` +
   `npm run e2e`.
