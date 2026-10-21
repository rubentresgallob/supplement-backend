# Supplement Tracker — Backend

API de **Supplement Tracker**, una app para llevar el control de los suplementos que tomas: registro de tomas,
rachas, calendario, amigos y una tienda de recompensas. La app móvil (Flutter) es un repositorio aparte.

**Stack:** NestJS 11 · TypeScript · PostgreSQL (Supabase) · Prisma 5 · JWT · Jest · Render

## Arquitectura

Monolito modular: cada carpeta de `src/` es un módulo de NestJS con su controlador y su servicio, que hablan con la
base de datos a través de un `PrismaService` global.

| Módulo | Qué hace |
|---|---|
| `auth` | Registro con verificación por email, login, recuperar contraseña, exportar datos, borrar cuenta |
| `supplements`, `user-supplements` | Catálogo y el stack de cada usuario (al quitar uno se retira, no se borra su historial) |
| `intakes`, `streaks`, `calendar`, `stats` | Tomas (máx. 48 h atrás, se pueden deshacer), rachas, calendario mensual |
| `rewards` | Puntos, logros, objetivos semanales y tienda (premios idempotentes por `ref` única) |
| `friends`, `leaderboard`, `social`, `push` | Amigos, ranking, privacidad, bloquear/denunciar, push con FCM |
| `retention` | Borrado de cuentas sin verificar e inactivas (RGPD) |
| `subscription` | Plan Pro, apagado con `PRO_ENABLED=false` |

Lo transversal está en `src/common/`: límite de peticiones por IP real (`CF-Connecting-IP`) y logs sin datos personales.
La documentación de todos los endpoints está en Swagger: `http://localhost:3000/api`.

## Puesta en marcha

Requisitos: Node.js 22 y PostgreSQL.

```bash
npm ci
cp .env.example .env      # rellena DATABASE_URL y JWT_SECRET
npm run db:deploy         # aplica las migraciones
npx prisma db seed        # carga el catálogo de suplementos
npm run start:dev
```

## Migraciones

El esquema se cambia **solo con migraciones versionadas** en `prisma/migrations/` (nada de `prisma db push`).

```bash
# 1. Edita prisma/schema.prisma
# 2. Genera la migración contra tu base de datos LOCAL y revisa el SQL antes de subirlo
npm run db:migrate -- --name descripcion_del_cambio
# 3. En producción se aplica sola al desplegar (render.yaml: prisma migrate deploy)
npm run db:status         # qué migraciones faltan por aplicar
```

Reglas para que sean seguras:

- **Solo añadir** en una migración (columnas con valor por defecto o que admitan nulos, tablas nuevas). Renombrar o
  borrar se hace en dos despliegues: primero el código deja de usarlo y después se quita de la base de datos.
- Cada migración va en una transacción: si falla, no se aplica nada.
- Se despliega solo si el código compila, y si una migración falla, Render mantiene la versión anterior.
- El CI aplica todas las migraciones sobre una base de datos vacía y comprueba que coinciden con `schema.prisma`.
- `0_init` es la línea base: el estado de producción cuando se pasó de `db push` a migraciones.

## Tests

```bash
npm test
```

## Despliegue

Render (Blueprint en `render.yaml`): cada push a `main` compila, aplica las migraciones y despliega. Las variables
secretas (`DATABASE_URL`, `BREVO_API_KEY`, `FIREBASE_SERVICE_ACCOUNT`…) se ponen en el panel de Render, nunca en el
repositorio. `JWT_SECRET` la genera Render.

## Licencia

MIT
