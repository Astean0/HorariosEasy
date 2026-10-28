# HorariosEasy

## Desarrollo local

Instala las dependencias y ejecuta el servidor de desarrollo:

```sh
npm install
npm run dev
```

La autenticación usa Supabase. Configura `NEXT_PUBLIC_SUPABASE_URL` y
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` en `.env.local` (consulta `.env.example`)
antes de iniciar Vite. `.env.local` no debe subirse al repositorio.