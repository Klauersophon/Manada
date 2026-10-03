# Manada 🐾

App para que los miembros de un grupo familiar coordinen el cuidado cotidiano de sus mascotas:
quién paseó al perro, quién dio la comida, qué falta hacer hoy.

**Estado actual:** publicada como app instalable. Se puede crear el hogar e invitar a la
familia, registrar mascotas con sus tareas, repartir y marcar en "Hoy" lo del día, y ver y
planificar la semana de cada mascota.

## Stack: React + Vite en el front, Supabase como backend

- React 19 + TypeScript, empaquetado con Vite.
- Tailwind CSS 4 vía el plugin `@tailwindcss/vite`.
- Supabase para base de datos y autenticación, usado desde el navegador con la publishable key.

## Levantarlo en local: instalar, configurar `.env.local` y correr `dev`

Requiere Node 22 o superior.

```sh
npm install
cp .env.example .env.local   # completar con los valores del proyecto de Supabase
npm run dev
```

Los valores de `.env.local` están en Supabase → Project Settings → API. El archivo no se sube
a git.

Si al pedir el acceso aparece un error de conexión, revisar que el proyecto no esté pausado: en
el plan gratis Supabase pausa los proyectos inactivos.

## Ingreso: el correo trae enlace y código

En el celular, una app instalada (PWA) no comparte sesión con el navegador, así que el enlace
del correo abre la sesión en el navegador y no en la app. Por eso el correo también trae un
código para escribirlo en la app.

La plantilla del correo vive en `supabase/templates/acceso.html`. Supabase en la nube no la toma
del repo: hay que copiarla a mano en Authentication → Email Templates, en "Magic Link" y en
"Confirm signup".

## Scripts

| Comando           | Qué hace                                  |
| ----------------- | ----------------------------------------- |
| `npm run dev`     | Servidor de desarrollo con recarga en vivo |
| `npm run build`   | Chequeo de tipos y build de producción    |
| `npm run lint`    | ESLint sobre todo el proyecto             |
| `npm test`        | Tests de Vitest (por ahora, el cálculo de qué toca cada día) |
| `npm run e2e`     | Pruebas de punta a punta en Chrome contra el Supabase local |
| `npm run preview` | Sirve el build de producción en local     |
| `npm run db:types` | Regenera los tipos de TypeScript desde el esquema de Supabase |
| `npm run db:test`  | Corre los tests de seguridad de la base (requiere `npx supabase start`) |

## Cambios en la base: siempre por migración

El esquema vive en `supabase/migrations/`. Para cambiarlo, crear una migración con
`npx supabase migration new <nombre>`, probarla en local con `npm run db:test` y aplicarla con
`npx supabase db push`. Después, correr `npm run db:types` para que el front vea los cambios.

Cambiar tablas o policies desde el dashboard deja el repo desactualizado.

## Pruebas de punta a punta: Chrome contra el Supabase local

`npm run e2e` levanta la app en el puerto 5174, apuntando al Supabase local, y simula en Chrome
a varias personas del hogar: ingresar, crear el hogar, invitar, gestionar mascotas y tareas y
marcar lo del día. Los correos se leen desde el buzón de prueba local (Mailpit).

```sh
npx supabase start
npm run e2e              # todas
npm run e2e -- hoy       # solo una: ingreso, hogar, mascotas, hoy o semana
```

Nunca tocan el proyecto real: el script se niega a correr si Supabase no es local, y cualquier
solicitud a `supabase.co` se bloquea y hace fallar la prueba. Usa el puerto 5174 con
`--strictPort` para no conectarse por error a un `npm run dev` abierto en el 5173. Si Chrome no
está en la ruta por defecto, se indica con la variable `CHROME_PATH`.

## Pendiente para la primera versión

El diseño sigue la maqueta de Manada, y se está adoptando por pasos. Faltan:

- Manada y ficha: cambiar roles sin dejar el hogar sin admin, y raza, edad y veterinario de la
  mascota.
- Unirse sin crear cuenta, con un código corto.
- Ver en tiempo real lo que marcan los demás (Supabase Realtime).
