# HorariosEasy

Plataforma para construir horarios académicos de universidades. Toda persona
autenticada puede definir datos base y organizar los bloques de su semestre.

## Requisitos

- Node.js 20 o superior.
- Un proyecto de Supabase para autenticación.

## Instalación

```bash
npm install
copy .env.example .env.local
```

Completa `.env.local` con la URL y la clave publicable de Supabase. Luego inicia
el servidor:

```bash
npm run dev
```

La universidad de trabajo se selecciona desde el panel después de iniciar
sesión. El panel añade automáticamente su UUID a las inserciones de las tablas
que lo requieren.

Abre `http://localhost:3000`. Express sirve el frontend y entrega la
configuración pública de Supabase a través de `/config.js`; no abras los HTML
directamente desde el explorador.

Para que las universidades aparezcan, la tabla `universidades` debe tener
registros visibles para el usuario autenticado. Si RLS está activo, crea en
Supabase una política de lectura como esta:

```sql
create policy "Usuarios autenticados pueden leer universidades"
on public.universidades
for select
to authenticated
using (true);
```

La tabla también debe estar expuesta en `Database > API > Exposed schemas` y
tener al menos las columnas `id` y `nombre`.

Los editores permiten actualizar y eliminar carreras, asignaturas, profesores,
salas y relaciones de la malla. Si RLS está activo, agrega políticas `UPDATE`
y `DELETE` para esas tablas. Por ejemplo:

```sql
create policy "Usuarios autenticados pueden modificar carreras"
on public.carreras for update to authenticated using (true) with check (true);

create policy "Usuarios autenticados pueden eliminar carreras"
on public.carreras for delete to authenticated using (true);
```

Repite ambas políticas para `asignaturas`, `profesores`, `aulas` y
`malla_curricular`. Las restricciones de integridad de la base seguirán
impidiendo eliminar registros que estén siendo utilizados.

## Estructura

- `server.js`: servidor Node.js + Express, archivos estáticos y endpoint de
  configuración pública.
- `public/`: todo el frontend que recibe el navegador.
- `public/index.html`: página pública principal.
- `public/auth.html`: inicio de sesión, registro y recuperación de contraseña.
- `public/app.html`: editor de horario semanal.
- `public/semestres.html`: editor CRUD de semestres académicos.
- `public/cursos.html`: editor CRUD de cursos.
- `public/carreras.html`, `public/asignaturas.html`, `public/profesores.html`,
  `public/salas.html`: editores independientes para cada dato base.
- `public/malla.html`: editor de relaciones entre carreras y asignaturas.
- `public/css/app.css`: estilos propios sobre Bootstrap.
- `public/js/autenticacion.js`: flujo de autenticación con Supabase Auth.
- `public/js/horario/pagina.js`: coordinación del editor de horario.
- `public/js/horario/grilla.js`: renderizado de la grilla semanal.
- `public/js/horario/conflictos.js`: consulta y presentación de conflictos.
- `public/js/catalogos/editor-catalogo.js`: editor reutilizable de catálogos.
- `public/js/malla/editor-malla.js`: editor de la malla curricular.
- `public/js/nucleo/`: cliente Supabase y utilidades compartidas.
- `public/js/semestres.js`: CRUD de semestres con fechas y confirmación de eliminación.
- `public/js/cursos.js`: CRUD de cursos, profesores, cupos y eliminación de bloques asociados.
- `DOCUMENTACION.md`: explicación completa del código, IDs, clases, Bootstrap,
  flujo y decisiones de arquitectura.

## Alcance actual

La interfaz persiste los catálogos, la malla, los semestres, los cursos y los
bloques mediante Supabase. Los conflictos se consultan en vivo desde las
vistas de la base de datos.
