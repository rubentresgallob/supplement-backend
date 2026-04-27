# Supplement Tracking Backend API

API completa en NestJS para el seguimiento de suplementos y gestión de usuarios.

## Características

- **Autenticación JWT**: Registro, login y gestión de perfiles de usuario
- **Base de datos de suplementos**: 30 suplementos precargados con información detallada
- **Suplementos personalizados**: Los usuarios pueden añadir suplementos de la base de datos o crear sus propios suplementos personalizados
- **Registro de tomas**: Seguimiento de cuándo se toman los suplementos
- **Sistema de rachas**: Cálculo automático de días consecutivos cumpliendo la rutina
- **Sistema social**: Añadir amigos, ver su progreso y competir en rankings
- **Leaderboards**: Clasificaciones por racha y adherencia entre amigos
- **Configuración de notificaciones**: Preferencias de recordatorios

## Requisitos Previos

- Node.js 18+
- PostgreSQL
- Yarn

## Instalación

```bash
# Clonar el repositorio
cd /home/ubuntu/supplement_backend/nodejs_space

# Instalar dependencias
yarn install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales
```

## Variables de Entorno

Edita el archivo `.env`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/supplement_db"
JWT_SECRET="your-super-secret-jwt-key"
PORT=3000
```

## Base de Datos

```bash
# Generar cliente Prisma
yarn prisma generate

# Sincronizar schema con la base de datos
yarn prisma db push

# Cargar datos iniciales (30 suplementos)
yarn ts-node prisma/seed.ts
```

## Ejecutar

```bash
# Desarrollo
yarn start:dev

# Producción
yarn build
yarn start:prod
```

## Documentación API

Una vez ejecutando el servidor, la documentación Swagger estará disponible en:

**http://localhost:3000/api**

## Endpoints Principales

### Autenticación
- `POST /auth/register` - Registrar nuevo usuario
- `POST /auth/login` - Iniciar sesión
- `GET /auth/profile` - Obtener perfil del usuario

### Suplementos Pre-cargados
- `GET /supplements/database` - Listar todos los suplementos (paginado)
- `GET /supplements/database/:id` - Detalle de un suplemento
- `GET /supplements/database/search?q=query` - Buscar suplementos

### Suplementos del Usuario
- `POST /user-supplements` - Crear suplemento
- `GET /user-supplements` - Listar suplementos del usuario
- `GET /user-supplements/:id` - Detalle de suplemento
- `PUT /user-supplements/:id` - Actualizar suplemento
- `DELETE /user-supplements/:id` - Eliminar suplemento

### Registro de Tomas
- `POST /intakes` - Registrar toma
- `GET /intakes` - Historial de tomas
- `GET /intakes/today` - Tomas de hoy
- `GET /intakes/progress/today` - Progreso diario
- `GET /intakes/stats/:supplementId` - Estadísticas por suplemento

### Rachas
- `GET /streaks/user` - Racha global del usuario
- `GET /streaks/supplement/:id` - Racha por suplemento

### Amigos
- `POST /friends/request` - Enviar solicitud de amistad
- `POST /friends/accept/:requestId` - Aceptar solicitud
- `POST /friends/reject/:requestId` - Rechazar solicitud
- `GET /friends` - Lista de amigos
- `DELETE /friends/:friendId` - Eliminar amistad
- `GET /friends/requests` - Solicitudes pendientes
- `GET /friends/:friendId/progress` - Ver progreso del amigo

### Leaderboards
- `GET /leaderboard/friends` - Ranking por racha
- `GET /leaderboard/adherence` - Ranking por adherencia

### Notificaciones
- `GET /notifications/config` - Obtener configuración
- `PUT /notifications/config` - Actualizar configuración

## Estructura del Proyecto

```
src/
├── auth/                 # Autenticación y JWT
├── supplements/          # Suplementos pre-cargados
├── user-supplements/     # Suplementos del usuario
├── intakes/              # Registro de tomas
├── streaks/              # Sistema de rachas
├── friends/              # Sistema social
├── leaderboard/          # Rankings
├── notifications/        # Configuración de notificaciones
├── prisma/               # Servicio Prisma
├── app.module.ts        # Módulo principal
└── main.ts              # Punto de entrada

prisma/
├── schema.prisma         # Schema de base de datos
├── seed.ts              # Script de carga inicial
└── supplements_database.json  # Datos de suplementos
```

## Tecnologías

- **NestJS** - Framework backend
- **TypeScript** - Lenguaje tipado
- **Prisma** - ORM
- **PostgreSQL** - Base de datos
- **JWT** - Autenticación
- **Bcrypt** - Hash de contraseñas
- **Swagger** - Documentación API
- **class-validator** - Validación de DTOs

## Licencia

MIT
