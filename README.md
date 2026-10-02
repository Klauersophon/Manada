# Manada 🐾

App para que los miembros de un grupo familiar coordinen el cuidado cotidiano de sus mascotas:
quién paseó al perro, quién dio la comida, qué falta hacer hoy.

**Estado actual:** el esqueleto técnico está listo y conectado a Supabase. Todavía no hay
esquema de datos, login ni pantallas de la app; la portada solo verifica la conexión.

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

Si la portada muestra `conectado ✓`, el proyecto de Supabase responde y la key es válida. Si
muestra un error, revisar que el proyecto no esté pausado: en el plan gratis Supabase pausa los
proyectos inactivos.

## Scripts

| Comando           | Qué hace                                  |
| ----------------- | ----------------------------------------- |
| `npm run dev`     | Servidor de desarrollo con recarga en vivo |
| `npm run build`   | Chequeo de tipos y build de producción    |
| `npm run lint`    | ESLint sobre todo el proyecto             |
| `npm run preview` | Sirve el build de producción en local     |
| `npm run db:types` | Regenera los tipos de TypeScript desde el esquema de Supabase |
| `npm run db:test`  | Corre los tests de seguridad de la base (requiere `npx supabase start`) |

## Cambios en la base: siempre por migración

El esquema vive en `supabase/migrations/`. Para cambiarlo, crear una migración con
`npx supabase migration new <nombre>`, probarla en local con `npm run db:test` y aplicarla con
`npx supabase db push`. Después, correr `npm run db:types` para que el front vea los cambios.

Cambiar tablas o policies desde el dashboard deja el repo desactualizado.

## Pendiente para tener una primera versión usable

- Esquema inicial: hogares, miembros, mascotas y actividades, con reglas RLS por hogar.
- Login y registro con Supabase Auth.
- Pantallas para ver y marcar las actividades del día.
