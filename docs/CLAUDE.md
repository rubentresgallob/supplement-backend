> Copia publicada del archivo que usa **Claude Code** en este proyecto: reglas de trabajo y REGISTRO DE AVANCES
> (lo escribe Claude tras cada cambio). El original vive en la carpeta raíz del proyecto, que no es un
> repositorio. En esta copia se han quitado las notas de marketing y los datos de usuarios.

# CLAUDE.md - Supplement Tracker (proyecto ACTIVO)

> ⚠️ Este es el CLAUDE.md principal del proyecto. Manda sobre `C:\Users\Usuario\Desktop\CLAUDE.md`
> (ese tiene rutas antiguas de `Supple\MySupleAPP`, que es una copia vieja de abril 2026).

## 🎯 REGLAS PARA CLAUDE

1. Responder en **español**, corto, práctico y con comandos exactos de **CMD** (Windows).
2. Confirmar antes de cambios grandes de arquitectura. Un problema a la vez.
3. Si algo falla, pedir el error completo antes de proponer soluciones.
4. 📝 **OBLIGATORIO: registrar cada avance** en la sección "REGISTRO DE AVANCES" de este archivo
   (fecha, qué se hizo, archivos tocados, qué queda pendiente). Hacerlo en la misma sesión,
   justo después de cada cambio, sin esperar a que el usuario lo pida.
5. Al empezar una sesión nueva: leer primero el "REGISTRO DE AVANCES" para saber dónde lo dejamos.

---

## 📁 ESTRUCTURA REAL

```
C:\Users\Usuario\Desktop\App_Suplementaci_n_Flutter\
├── CLAUDE.md                        ← Este archivo
├── supplement_app\
│   ├── flutter_app\                 ← App Flutter (BLoC + forui)
│   └── data\                        ← supplements_database.json, notas
├── supplement_backend\
│   └── nodejs_space\                ← Backend NestJS + Prisma
└── Uploads\                         ← Archivos sueltos (no está en Git)
```

## 🔧 COMANDOS

```cmd
REM === BACKEND ===
cd C:\Users\Usuario\Desktop\App_Suplementaci_n_Flutter\supplement_backend\nodejs_space
npm run start:dev

REM === FLUTTER ===
cd C:\Users\Usuario\Desktop\App_Suplementaci_n_Flutter\supplement_app\flutter_app
flutter run                                              REM contra producción (por defecto)
flutter run --dart-define=API_URL=http://10.0.2.2:3000   REM emulador contra backend local
flutter test

REM === PUBLICAR LA WEB (siempre con --no-web-resources-cdn: así no carga nada de Google) ===
flutter build web --release --no-web-resources-cdn
firebase deploy --only hosting --project mi-suplementacion-app
```

## 📱 APP FLUTTER - datos clave

- URL del backend: `lib/core/constants/api_constants.dart` usa `String.fromEnvironment('API_URL')`.
  Por defecto: `https://supplement-backend.onrender.com` (producción en Render).
- UI con `forui` + mascota `Capsu` (`lib/core/widgets/mascot/capsu.dart`).
- Design system en `lib/core/design/` (rama `rediseno-premium`): en pantallas, solo tokens
  (`AppColors`, `AppText`, `AppSpace`, `AppRadii`, `AppMotion`) y sus componentes; nada de colores,
  tamaños de letra o duraciones sueltos, ni emojis como iconos (iconos Lucide).
- Pantallas: login, registro, onboarding, home, añadir suplemento, amigos, perfil.
- Tests en `test/`: capsu, dialogs, notification_service, widget.
- Ya se ha probado en emulador Android ✅.

---

## 📝 REGISTRO DE AVANCES

> Formato: `### AAAA-MM-DD - Título` + qué se hizo / archivos / pendiente. Lo más nuevo arriba.

### 2026-10-21 - Backend del lanzamiento fusionado y desplegado ✅ backend `main` = `eec686d` (push hecho)
- Decisión del usuario: licencia **todos los derechos reservados** (`LICENSE` + README; `package.json` ya UNLICENSED)
  y fusionar. `lanzamiento-gratuito` → `main` (fast-forward, incluye los 3 commits de `main` sin push).
- Migración `20261016000000_lanzamiento_gratuito` aplicada en Supabase ANTES del push (`migrate deploy`; 0 deriva).
- Render: el usuario confirmó el Build Command con `npx prisma migrate deploy` y cambió las variables (valores no
  vistos por Claude). Producción comprobada después: OK.
- **App y web publicadas (mismo día):** app `lanzamiento-gratuito` → `main` (fast-forward, `035d634`, push hecho →
  lanza Codemagic; resultado del build NO visto). Tests 61/61, analyze solo 2 infos de orden en `pubspec.yaml`.
  Web: `flutter build web --release --no-web-resources-cdn` + `firebase deploy` → https://mi-suplementacion-app.web.app
  sirve «Supplement Tracker» y `/privacidad` 200. NO probado un registro real de punta a punta.
- Pendiente (usuario): GitHub > Settings > Change visibility > Public (backend). App repo: sigue privado.
  Ver el build de Codemagic. Rellenar los [CORCHETES] legales (siguen publicados así).

### 2026-10-21 - Migraciones con Prisma Migrate, test arreglado y repo backend listo para ser público ✅ backend `b56ae07`, app `035d634` (rama `lanzamiento-gratuito`)
- Motivo: candidatura de trabajo (pide «migraciones seguras») y hacer público el repo del backend.
- **Migraciones:** `prisma/migrations/0_init` (línea base; comprobado en solo lectura que producción = esquema de
  `main`, 0 diferencias) + `20261016000000_lanzamiento_gratuito` (idéntica al SQL manual, en transacción). Borrada
  `prisma/migraciones-manuales`. Se acabó `db push`. Scripts `db:migrate|db:deploy|db:status`.
  `render.yaml`: `npm run build && npx prisma migrate deploy`. CI nuevo `.github/workflows/ci.yml` (tests, build,
  migraciones sobre BD vacía y deriva). Probado en un Postgres desechable (no Supabase): sin línea base → P3005
  (se niega), con línea base aplica solo el lanzamiento, conserva usuarios, 0 deriva, 2.º deploy sin cambios; BD nueva OK.
- **Test «Hello World»:** fallaba porque al test le faltaba `PrismaService` (no por el texto). Arreglado + prueba de que
  `init-demo-data` no hace nada en producción. Backend **67/67** (13 suites).
- **Seguridad:** `src/auth/jwt-secret.ts`: sin `JWT_SECRET` el servidor no arranca (antes usaba `'your-secret-key'`).
  Comprobado arrancando el build.
- **Repo público:** historial revisado (todas las ramas): nunca se subió `.env` ni credenciales; legales solo con
  [CORCHETES]. README reescrito, `.env.example` con todas las variables (vacías). `INFORME.md` §3 actualizado.
- ✅ Línea base hecha en producción por el usuario (2026-10-21): `migrate status` → solo falta
  `20261016000000_lanzamiento_gratuito` (se aplicará con `migrate deploy` al desplegar). ⛔ NUNCA `migrate dev` contra Supabase.
- Pendiente (usuario): decidir rama/merge, licencia (README dice MIT, `package.json` UNLICENSED) y cambiar la
  visibilidad en GitHub. Ojo: al rellenar NIF/dirección en `public/*.html` quedarán en el historial público.

### 2026-10-16 - Preparación del lanzamiento gratuito (RGPD + tiendas) 🚧 rama `lanzamiento-gratuito` en ambos repos, ⚠️ SIN push, SIN desplegar, migración SIN ejecutar
- Antes: commit en `main` de lo pendiente (push de «Motivar», nombre e icono): app `213d484`, backend `80f8735`.
  Copia del código Pro en la rama **`futuro-pro`** (ambos repos).
- Respuestas del usuario (Fase 0): nombre **Supplement Tracker**; el push de «Motivar» SE QUEDA y va en los
  legales; todos los países; logs de Render 7 días; Supabase plan gratuito; los usuarios actuales son cuentas de prueba del autor;
  borrar la web antigua de `public/`.
- Fase 1 (app `40203bc`, backend `ee438b1`): Pro fuera del binario (borrado en esta rama; fuera `pdf`/`printing`);
  backend con `PRO_ENABLED` (false por defecto → rutas Pro 404). Borrada la demo web de `public/`.
- Fase 2 (app `39cf524`, backend `8ae2938`): solicitudes de amistad y registro sin revelar cuentas; logs con
  `requestLog` + `SafeExceptionFilter`; la app ya no registra token ni cuerpos; web con `flutter_bootstrap.js`
  (`fontFallbackBaseUrl` propio + Noto Color Emoji alojado): 0 peticiones a Google (comprobado con puppeteer);
  exportación con calendario y racha.
- Fase 3 (app `1cbfe3b`, backend `b631a60`): 3 casillas en el registro, versiones de textos en `src/legal/legal.ts`,
  `POST /auth/accept-legal` y `LegalAcceptPage`. Quitados los botones decorativos Google/Apple del login.
- Fase 4 (app `4c05042`, backend `056b63c`): interruptores `share_progress`/`share_supplements` (apagados),
  `sharing_event`, bloquear/denunciar (`/users/:id/block|report`), filtro de nombres, suspensión,
  `scripts/moderar.ts`, variable nueva `ADMIN_EMAIL`. Migración: `prisma/migraciones-manuales/2026-10-16_lanzamiento.sql`.
- Fase 5 (app `bdfd463`, backend `a2b5304`): sin dosis sugerida; `CATALOG_PUBLIC` (id, nombre, categoría,
  formas); aviso sanitario en añadir suplemento y en el 1.er paso del tutorial.
- Fase 6 (backend `e3c695b`): `src/retention` (24 h / 24 meses + 30 días; `last_login_at`,
  `inactivity_warned_at`) y `POST /auth/delete-account-with-password` (web de eliminación sin sesión).
  ⚠️ Falta el DISPARADOR diario (el usuario debe elegir; recomendado GitHub Actions → INFORME §6.a).
- Fase 7 (app `6d35347`, backend `3115f19`): `docs/legal/` (v1.0, con [CORCHETES]) → pantalla en la app,
  web `/privacidad` y `/terminos` (rewrites en `firebase.json`) y copia en `public/` del backend.
- Fase 8 (app `4864607`, backend `7ee23b6`): fuera alarmas exactas y `REQUEST_INSTALL_PACKAGES`
  (recordatorios inexactos), `PrivacyInfo.xcprivacy`, `scripts/crear-cuenta-demo.ts`.
- Entregables (app `fffc4b7`): `flutter_app\docs\lanzamiento\INFORME.md` (formularios de tiendas, notas
  del revisor, tareas manuales), `registro-actividades.md`, `eipd.md`.
- Verificado: tests app 61/61, backend 61/62 («Hello World» de siempre); web 0 peticiones externas;
  permisos del APK release. NO probado contra la BD real (sin migración → P2022), ni iOS, ni en móvil.
- ⚠️ Esta rama necesita la migración ANTES de desplegar el backend (si no, falla: columnas nuevas).
- Pendiente (usuario): tareas de INFORME §5 (DPA, corchetes, migración, variables `PRO_ENABLED=false`,
  `ADMIN_EMAIL`, `MAIL_FROM_NAME`, cuenta demo, despliegue) y decisiones de §6.

### 2026-10-13 - «Motivar» envía una push REAL al amigo (Firebase) ✅ código en ambos repos, ⚠️ SIN commit, SIN push, SIN desplegar
- Petición del usuario (cambia la decisión del 2026-10-07 de esperar al lanzamiento). Texto pedido por él:
  «¡Alex dice que no te olvides de tu creatina!» (el 1.er suplemento que le falte hoy; si no le falta nada:
  «Alex te manda ánimos 💪»). Al que motiva NO se le dice qué suplemento es. 1 al día por pareja (429 `ALREADY_MOTIVATED`).
- Backend: `firebase-admin`; `src/push/` (`PushService.sendToUser`, borra tokens muertos; `POST|DELETE /push/token`);
  `POST /friends/:id/motivate` → `{sent, delivered}`; tablas `push_token` y `motivation` (`db push` hecho en Supabase).
  Variable nueva **`FIREBASE_SERVICE_ACCOUNT`** (JSON de la cuenta de servicio en una línea). Sin ella → log `[SIN FIREBASE]`.
- Firebase: creada la app **Android** `com.supplement.tracker` en el proyecto `mi-suplementacion-app` (con la CLI)
  → `android/app/google-services.json` + plugin `com.google.gms.google-services` 4.4.2 en Gradle.
- App: `firebase_core` + `firebase_messaging`; `core/services/push_service.dart` (solo Android: registra el token
  al haber sesión y lo da de baja al cerrar sesión; con la app abierta lo pinta `NotificationService.showPush`,
  canal «Amigos» = `friends`). Quitado el aviso falso «¡Ánimos enviados!» que se mostraba a uno mismo. Si el
  amigo no tiene avisos: toast «X aún no tiene los avisos activados».
- Permiso: NO se pide al iniciar sesión; usa el de los recordatorios (si nunca los activó, no verá los push).
- Tests: backend 49 OK (+5 en `friends.spec.ts`; «Hello World» sigue fallando de antes), app 57/57, analyze sin
  errores, `flutter build apk --debug` OK. Verificado en local contra la BD real (3 usuarios temporales, borrados):
  token 201, token malo 400, motivar → `delivered:false` + log `[SIN FIREBASE]`, 2.ª vez 429, no amigo 403.
  ⚠️ NO probado un push de verdad (falta la clave de servicio) ni en un móvil.
- ⚠️ **iPhone y web: no reciben push** (iPhone necesita Apple Developer + clave APNs subida a Firebase +
  `GoogleService-Info.plist` + capacidad Push en Xcode).
- Pendiente (usuario): Firebase > Configuración del proyecto > Cuentas de servicio > «Generar nueva clave
  privada» → pegar el JSON en Render como `FIREBASE_SERVICE_ACCOUNT`. Después: commit + publicar junto con lo
  de abajo (backend, app y web A LA VEZ) y probar con 2 cuentas en Android.

### 2026-10-08 - La app se llama «Supplement Tracker» y su icono es Capsu ✅ app en `main`, ⚠️ SIN commit, SIN push, SIN desplegar
- Decisión del usuario. Antes: «Suplementos Tracker» en Android/iOS, `supplement_tracker` en la web e icono de Flutter.
- Nombre: `web\index.html` (título, título iOS, descripción), `web\manifest.json` (nombre, descripción, colores a
  negro), `AndroidManifest.xml` (`android:label`), `ios\Runner\Info.plist` (`CFBundleDisplayName`),
  `AppConstants.appName` y el pie del PDF de estadísticas.
- Icono (Capsu sacado de la pantalla de login a alta resolución): `web\icons\*`, `web\favicon.png` (32 px),
  `mipmap-*\ic_launcher.png`, los 15 PNG de `AppIcon.appiconset` (sin alfa) y, nuevo, **icono adaptativo** de
  Android 8+: `mipmap-anydpi-v26\ic_launcher.xml` + `mipmap-*\ic_launcher_foreground.png` +
  `values\ic_launcher_background.xml`.
- Verificado: tests 57/57, `flutter build web --release --no-web-resources-cdn` OK (título y manifest nuevos en
  `build\web`), `flutter build apk --debug` OK. NO visto instalado en un móvil ni en la pantalla de inicio.
- ⚠️ NO desplegar la web sola: `build\web` incluye los cambios de privacidad y perfil de amigo, que hay que
  publicar a la vez que el backend (ver entradas de abajo).
- Pendiente: commit + publicar junto con lo demás. El **backend** sigue diciendo «Suplementos Tracker» en los
  emails (`auth.service.ts`, `mail.service.ts` y la variable `MAIL_FROM_NAME` de Render) y en
  `public\eliminar-cuenta.html`, `privacidad.html`, `terminos.html`: sin tocar.

### 2026-10-08 - Privacidad: 5 arreglos antes de redactar los legales ✅ backend `ddb3700`, app `daa822f` (commits en `main`, ⚠️ SIN push ni despliegue)
- Salieron al contestar las preguntas previas de la IA-abogado (el usuario pidió "arregla todo"):
  1. **Emails de amigos**: `friends.service.ts` ya no devuelve `email` en amigos, solicitudes ni progreso;
     la app mostraba el email en la lista y en la solicitud → ahora "Ver perfil" / "Quiere ser tu amigo".
  2. **Logs sin datos personales**: fuera emails e IP de `auth.controller/service` y del log de solicitud
     de amistad; solo IDs de usuario. Excepción: `[SIN BREVO]` (solo si no hay proveedor de email, es decir, en local).
  3. **Web sin Google**: compilar con `flutter build web --release --no-web-resources-cdn` (CanvasKit local)
     + familia `Roboto` declarada en `pubspec.yaml` apuntando a Poppins (si no, el motor baja Roboto de
     fonts.gstatic.com al arrancar). Verificado con Chrome sin interfaz y registro de red: 0 peticiones a Google.
     Queda un caso: si un texto lleva caracteres que Poppins no tiene (emojis escritos por el usuario), el
     motor pide esa fuente a Google en ese momento.
  4. **Enumeración de emails**: `POST /friends/request` con un email que no existe responde igual que si
     se hubiera enviado (con nombre de usuario sí devuelve 404). El registro sigue diciendo "Email already exists".
  5. **Portabilidad**: `GET /auth/export` (JSON con cuenta, suplementos incl. retirados, tomas, amigos por
     nombre de usuario, puntos, objetos; sin contraseña ni códigos; 5/h). App: Perfil > Ajustes >
     "Descargar mis datos" con el paquete nuevo `share_plus` (móvil: compartir; web: descarga).
- Tests: backend 44 OK, app 57/57. Verificado en local contra la BD real con 2 usuarios temporales (borrados).
  "Descargar mis datos" NO probado en un dispositivo (solo compila y el endpoint responde).
- ⚠️ La web y la app antiguas esperan `email` en la lista de amigos: publicar backend, app y web A LA VEZ.
- ⚠️ A partir de ahora la web se compila SIEMPRE con `--no-web-resources-cdn`.
- Pendiente: publicar (incluye el perfil de amigo de la entrada de abajo); casilla de edad en el registro
  (decisión del usuario); respuestas del usuario a la IA-abogado.

### 2026-10-07 - Perfil de un amigo (Capsu, stack de hoy, calendario) ✅ commits en `main` de ambos repos, ⚠️ SIN push ni despliegue
- Petición: ver el Capsu de los amigos tal como lo llevan, su stack, qué han tomado hoy y su calendario.
- **Privacidad (decisión del usuario): visible por defecto, se puede ocultar.** Nueva columna
  `user.share_with_friends` (default true; `db push` hecho en Supabase). En la app: Perfil > Ajustes >
  "Compartir con mis amigos". Si se apaga, los amigos siguen viendo Capsu, racha, medalla y
  cumplimiento, pero no el stack ni el calendario. `public/privacidad.html` actualizado (antes decía
  que los amigos NO veían los suplementos).
- Backend: `GET /friends/:id/profile` (racha, cumplimiento 30 días, `equipped`, `memberSince`, `sharing`
  y `today` = stack con tomas de hoy, o null si no comparte), `GET /friends/:id/calendar?month=`
  (403 `SHARING_DISABLED` si no comparte), `GET|PUT /friends/sharing {enabled}`. Solo amigos aceptados.
  `CalendarModule` exporta su servicio; `FriendsModule` importa Rewards y Calendar.
- App: `friends/pages/friend_profile_page.dart` (banner equipado de fondo, Capsu con su ropa, cifras,
  "Hoy" con lo que le falta, botón "Ver su calendario") + `data/models/friend_profile.dart`.
  `CalendarPage` ahora acepta `title` y `loader` para pintar el calendario de otra persona.
  Tocar un amigo abre el perfil; borrada la hoja `_FriendDetailSheet`.
- Tests: backend 42 OK (+`friends.spec.ts`), app 57/57 (+`friend_profile_test.dart`). Verificado en local
  contra la BD real con 3 usuarios temporales (borrados): no amigo → 403, amigo ve stack y calendario,
  al dejar de compartir → `today` null y calendario 403.
- ⚠️ **"Motivar" NO envía nada al amigo**: la app llama a `POST /friends/:id/motivate`, que no existe en
  el backend; ignora el error y muestra "Ánimos enviados". Ya era así antes. Para un recordatorio real
  hace falta decidir cómo: aviso dentro de la app al abrirla, o notificaciones push (requieren Firebase
  Cloud Messaging y, en iPhone, Apple Developer).
  **Decisión del usuario (2026-10-07): se queda pendiente y se hará como notificación push REAL cuando
  se vaya a lanzar** (junto con Apple Developer). Hasta entonces el botón "Motivar" sigue sin enviar nada.
- Legales: el usuario va a generar la política de privacidad y los términos definitivos con otra IA
  (se le dio un prompt con todos los datos de la app). Cuando los traiga, sustituyen a
  `public/privacidad.html` y `public/terminos.html` (siguen siendo BORRADOR con [CORCHETES]).
- Pendiente: push backend (despliega en Render) + push app (Codemagic) + redesplegar web.

### 2026-10-07 - Borrar un suplemento conserva su historial ✅ backend `ccf7ed6` (**push hecho, desplegado en Render**), app `5d65db3` (rama, sin push)
- Petición del usuario: que el calendario siga mostrando lo que se tomó aunque el suplemento ya no esté.
- Antes `DELETE /user-supplements/:id` borraba la fila y, en cascada, todas sus tomas. Ahora lo **retira**:
  `active = false` + nueva columna `user_supplement.deleted_at` (`db push` hecho en Supabase; es nullable).
  Las tomas se conservan. Un retirado no sale en la lista y no admite tomas ni ediciones (404).
- Calendario: cuenta activos + retirados. Un retirado cuenta desde que se añadió hasta el día anterior
  a quitarlo; el día en que se quitó solo cuenta lo que se llegó a tomar (no penaliza). En el detalle
  del día sale con "Ya no está en tu rutina" (`retired` en la respuesta).
- ⚠️ Racha, estadísticas Pro, ranking y logros siguen mirando SOLO los activos (igual que antes): si
  alguien falla un día y luego quita ese suplemento, la racha lo ignora pero el calendario lo sigue
  mostrando como día sin completar. Pendiente de decidir si se alinean.
- Los suplementos borrados ANTES de este cambio no se pueden recuperar (sus tomas ya no existen).
- App: texto de confirmación al eliminar ("Lo que ya tomaste seguirá en tu calendario").
- Tests: backend 36 OK, app 54/54. Verificado en local contra la BD real con usuario temporal (borrado).
  En producción los endpoints nuevos responden 401 sin token (existen); no probado con usuario real allí.
- Este push también desplegó "deshacer tomas" y "calendario" (entrada de abajo).
- Después: push de la app hecho → rama `rediseno-premium` en GitHub (16 commits por delante de `main`).
- **Publicado todo (2026-10-07):** `rediseno-premium` fusionada en `main` (fast-forward) y push hecho
  (`5d65db3`, lanza Codemagic). Web redesplegada en https://mi-suplementacion-app.web.app (comprobado:
  sirve la versión nueva, los renders de la tienda y Poppins; el backend acepta su origen en las rutas nuevas).
  A partir de ahora se trabaja otra vez en `main`. Pendiente: que el usuario lo pruebe en el iPhone.

### 2026-10-07 - Deshacer tomas + calendario de progreso ✅ backend `0820766` (push hecho con el de arriba), app `09d80de` en `rediseno-premium`
- **Deshacer:** `POST /intakes/undo {userSupplementId}` borra la última toma de HOY de ese suplemento y
  devuelve el stock gastado (400 "No hay tomas de hoy que deshacer"). Los puntos ya ganados NO se quitan
  (cada premio se da una sola vez, así que no se pueden repetir). App: botón pequeño de deshacer en la
  tarjeta cuando hay tomas hoy (`onUndo`, `HomeUndoIntakeEvent`); también sale con el día completado.
- **Calendario (gratis para todos, decisión del usuario):** `GET /calendar?month=AAAA-MM` →
  `src/calendar/` (`buildMonth` puro + servicio). Cada día: `complete | partial | missed | pending | none |
  future`, tomas/esperadas, `protected` (día salvado por protector) y el detalle por suplemento.
  Solo cuenta suplementos activos y desde el día en que se añadieron.
  App: `presentation/calendar/pages/calendar_page.dart` + `data/models/calendar_models.dart`. Se abre desde
  "Calendario" (cabecera de "Tu stack" en la home) o tocando la racha. Mes navegable (no deja ir al
  futuro ni antes del primer suplemento), leyenda, resumen del mes y detalle del día tocado.
- Pro: el texto de "Estadísticas avanzadas" ya no anuncia el calendario (backend `pro-plan.ts` y app).
- Tests: backend 32 OK (+`calendar.spec.ts`, +deshacer en `intakes.spec.ts`; "Hello World" sigue fallando
  de antes). App 54/54 (+`calendar_test.dart`, +deshacer en `home_intakes_test.dart`).
- Verificado de extremo a extremo con el backend en local (puerto 3001) contra la BD real y un usuario
  temporal (borrado): deshacer 2→1, sin tomas → 400, ajeno → 404, calendario del mes, mes inválido → 400.
- ⚠️ La app contra producción NO tendrá deshacer ni calendario hasta hacer `git push` del backend
  (autodeploy en Render, ~2 min). Pendiente: push backend → probar en la app.

### 2026-10-07 - Registrar tomas con botones + celebración solo al completar ✅ rama `rediseno-premium` (commit hecho, SIN push)
- Petición del usuario: el círculo de la tarjeta era poco intuitivo y la celebración "Racha del día"
  saltaba cada vez que entraba en la app con el día ya completo.
- Tarjeta (`home/widgets/supplement_card.dart`): fuera el círculo. Si falta 1 toma → botón
  "Registrar toma"; si faltan varias → "Una toma" y "Todas (n)"; completo → "Completado por hoy".
  Contador "1 de 3" junto a la barra.
- Home: botón azul "Registrar todo" en la tarjeta de progreso (se oculta cuando el día está completo).
  Va en un toque, sin confirmación (así lo pidió); no hay forma de deshacer una toma desde la app.
- Bloc: nuevo `HomeMarkEverythingTakenEvent` (registra lo que falta de cada suplemento). Los tres
  eventos pasan por `_register`, que ignora un suplemento que ya se está registrando (antes, pulsar
  dos veces duplicaba tomas).
- Celebración (`home_page.dart`, `_wasComplete`): solo salta al pasar de incompleto a completo con la
  app abierta. Causa del fallo: cada recarga emite `HomeLoadingState`, que ponía el "antes" a falso.
- Tests: nuevo `test/home_intakes_test.dart` (bloc + tarjeta). 50/50 OK. La celebración NO tiene test
  (la pantalla completa necesita demasiados datos falsos); revisada leyendo el flujo.
- Pendiente: que el usuario lo pruebe.

### 2026-10-07 - Objetos de la tienda en 3D con Blender ✅ rama `rediseno-premium` (commit hecho, SIN push)
- Canva se quedó sin créditos (5 de 14), así que se instaló **Blender 5.2** (`winget`, en
  `C:\Program Files\Blender Foundation\Blender 5.2\blender.exe`) y los 14 objetos se modelan y renderizan
  por script, con las medallas de Canva como referencia de estilo (plástico-metal brillante, cinta lavanda).
- `flutter_app\tool\shop_art\render_shop.py`: un `code` = un objeto. Medallas (bronce, plata, oro, cápsula,
  llama 30, hexágono con laurel 100, corona 365, diamante Pro) y escudo → PNG transparente 400x400;
  banners (amanecer, océano, bosque, galaxia, aurora, con los colores del backend) → JPG 800x400.
  Volver a generar todo (≈2 min, desde `flutter_app`):
  `"C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" -b --python tool\shop_art\render_shop.py -- "%CD%\assets\shop"`
  (añadir códigos al final para renderizar solo algunos). `contact_sheet.py` junta los renders en una hoja para revisarlos.
- App: `assets/shop/` (1 MB en total, declarado en `pubspec.yaml`). `ShopRender` en `rewards_widgets.dart`
  muestra el render si el `code` está en `ShopRender.rendered`; si no, el dibujo en código de `reward_art.dart`
  (que sigue usándose para los **logros**). `MedalIcon` (perfil, probador, ranking) también usa el render.
- Nuevo `test/shop_assets_test.dart` (cada render existe). Tests 45/45, analyze sin errores.
  Este commit incluye también el redibujado en código de abajo, que estaba sin commit.
- Revisado en hoja de contactos sobre negro; NO visto dentro de la app en marcha.
- Pendiente: que el usuario lo vea (`flutter run -d chrome --web-port=3000`). Ideas: logros también en 3D;
  usar el render del banner como fondo en perfil y probador (ahora es solo el degradado).

### 2026-10-07 - Objetos de la tienda redibujados en código ✅ (incluido en el commit de arriba)
- Al usuario no le convencían los dibujos (seguían siendo "un icono dentro de un disco"). Rehechos en
  `core/design/components/reward_art.dart`, todo pintado en código, sin iconos Lucide:
  - Medallas (`MedalArt` + `MedalShape`): bronce = disco, plata = roseta, oro = sol dentado (las tres con
    estrella grabada), cápsula dorada, llama "30", hexágono "100", corona con joyas, diamante facetado.
  - Banners (`BannerArt` + `BannerScene`): amanecer, océano, bosque, galaxia y aurora son paisajes
    pintados con los colores que manda el backend.
  - Protector (`ShieldArt`): escudo con una llama dibujada dentro.
  - Logros: los de racha llevan su número grabado y suben de metal/forma; el resto, icono grabado.
- Qué dibujo toca a cada `code`: `rewards_widgets.dart` (`shopMedalArt`, `achievementArt`, `bannerScene`).
  Borrados `medalMetal` y `achievementMetal`. Backend NO tocado.
- Revisado visualmente (render a PNG temporal, ya borrado) a 18, 32, 70 y 120 px. Tests 44/44, analyze sin errores.
- 2026-10-07 (después): el usuario conectó **Canva** para generar los objetos con IA. Generada la
  medalla de oro "maestra" (media id de Canva `MAHXVrtHAxg`, 3D brillante, cinta lavanda, fondo negro).
  Estilo aprobado por el usuario. Generadas 5 de 14 con la maestra de referencia (muy coherentes):
  `medal_gold` = `MAHXVrtHAxg`, `medal_bronze` = `MAHXVmzookk`, `medal_silver` = `MAHXVuMVP8g`,
  `medal_capsule` = `MAHXVuI5oVQ`, `medal_streak_30` = `MAHXVoDIBB0` (media ids de Canva).
  ⛔ Canva cortó por **cuota de créditos agotada** (`quota_exceeded`). Faltan 9: `medal_streak_100`
  (hexágono menta + laurel), `medal_streak_365` (iridiscente + corona), `medal_pro_diamond` (violeta +
  diamante), el escudo del protector y los 5 banners (2:1, con los colores del backend).
  Nada integrado en la app todavía (siguen los dibujos en código). Cuando haya créditos: generar las 9 →
  quitar fondo → exportar a `flutter_app\assets\shop\<code>.png` → usarlas en `ShopItemPreview`.
- Pendiente: que el usuario lo vea (`flutter run -d chrome --web-port=3000`) y opine; después commit.
  El banner del perfil y del probador sigue siendo solo el degradado (no el paisaje).

### 2026-10-05 - Rediseño premium de toda la app ✅ rama `rediseno-premium` (10 commits, `c4c531e`…`826b310`, SIN push ni merge)
- Skill `.claude\skills\premium-flutter-redesign.skill` (es un zip: SKILL.md + references + `scripts/ui_audit.py`).
  Auditoría: `py <skill>\scripts\ui_audit.py .` desde `flutter_app` (`python3` no existe en este PC, usar `py`).
- Auditoría: 748 hallazgos → 88. Lo que queda es intencionado: dibujo de Capsu (63), PDF de
  estadísticas (16), emojis en logs y en el texto de la notificación, y 2 temporizadores.
- Nuevo `lib/core/design/` (`design.dart` lo exporta todo): `tokens.dart` (negro puro, azul `#236BFE`
  solo para la acción principal, lavanda para seleccionado/progreso/racha; el naranja ya NO se usa),
  `typography.dart` (`AppText.*`, Poppins empaquetada en `assets/fonts/` con su `OFL.txt`), `theme.dart`
  (`buildAppTheme()`), `components/` (los de antes + `surfaces.dart`: PressableScale, GlassCard,
  AmbientBackground, HeroGlow, Floating, IridescentOrb, IconChip, AppPill; `flow.dart`: OptionTile,
  SelectionMark, FlowProgress, PageDots, Reveal, CountUp, BottomActions).
  Las rutas antiguas (`core/widgets/ui/ui.dart`, `core/theme/app_tokens.dart`, `app_constants.dart`)
  siguen funcionando: reexportan. Los nombres viejos (`bgCard`, `gold`…) son alias de los nuevos.
- Pantallas migradas (un commit cada una): onboarding, tienda, Pro + estadísticas, login/registro/
  verificar/recuperar, home + tarjeta + añadir suplemento, perfil, amigos.
- Emojis fuera de la UI: los objetos de la tienda, logros y ventajas Pro se traducen por `code` a iconos
  Lucide en la app (`shopItemIcon`, `achievementIcon`, `proFeatureIcon`); el backend NO se ha tocado.
- Motion: fuera blobs, shimmer, rebotes, pulso del botón + y entrada por tarjeta. Una sola entrada
  (`Reveal`) en pantallas de flujo; todo respeta "reducir movimiento".
- Pantalla Pro: los precios ahora van anclados abajo junto al botón (antes quedaban bajo el pliegue).
- Tests de UI actualizados (2 textos sin emoji en `rewards_test.dart`). 44/44 OK, analyze sin errores,
  `flutter build web --release` compila. Probado a 320-360 px con texto x1,3 sin desbordes.
- Pendiente (usuario): probar en emulador/iPhone desde la rama; si gusta →
  `git checkout main && git merge rediseno-premium && git push` (el push lanza Codemagic) y redesplegar la web.
- Después (mismo día): `3700122` arregla un desborde en el login; `flutter run -d chrome` daba
  "error de conexión" por CORS → usar `flutter run -d chrome --web-port=3000` (el backend solo acepta
  `localhost:3000` y la web de Firebase). Al usuario no le gustaban los premios de la tienda (icono en un
  círculo): ahora se dibujan en `core/design/components/reward_art.dart` (`MedalArt` con metal y cinta,
  `ShieldArt`, `BannerArt`); el metal de cada medalla/logro está en `rewards_widgets.dart`
  (`medalMetal`, `achievementMetal`). Pendiente: que el usuario lo vea y opine.
- Decisiones abiertas: Capsu sigue naranja (es el único naranja que queda); botones Google/Apple
  siguen decorativos; no hay renders 3D (se usan orbes iridiscentes hechos en código).

### 2026-10-05 - Límite por IP arreglado (Cloudflare) ✅ backend `f7f8bb6` (+ debug temporal `a657c0d` revertido en `d34dd8b`), push hecho
- Usuario configuró Brevo y variables en Render ("HECHO"). Falta que pruebe un registro real en el iPhone.
- Problema: con `trust proxy` la IP se podía falsear con `X-Forwarded-For` y el límite de registro no saltaba.
  En Render llega `X-Forwarded-For: cliente, IP-Cloudflare, 10.x (Render)` y el socket es `::1`.
- Solución: `src/common/client-ip.ts` → `ClientIpThrottlerGuard` (global en `app.module.ts`) usa
  `CF-Connecting-IP` (Cloudflare la sobrescribe; si alguien la falsea, Cloudflare responde 403).
  Quitado `trust proxy` de `main.ts` y `TRUST_PROXY` de `render.yaml` (la variable en Render ya no hace nada; se puede borrar).
- Verificado en producción: 6.º registro desde la misma IP → 429 aunque se falsee `X-Forwarded-For`.

### 2026-10-05 - Revisión pre-envío App Store + Google Play 🔴 (sin cambios de código)
- Informe completo en `PRE_SUBMISSION_REPORT.md` (raíz). Veredicto: NO ENVIAR TODAVÍA.
- Bloqueantes: Pro con precios sin IAP (+ `PRO_TEST_MODE=true`), botones Google/Apple decorativos,
  legales con [CORCHETES], permisos `REQUEST_INSTALL_PACKAGES` y `USE_EXACT_ALARM` sobrantes,
  sin cuenta demo verificada (test@example.com → 401 en producción).
- Riesgos: Render tarda ~22-50 s en despertar; amigos sin denunciar/bloquear.
- targetSdk 36 OK, icono iOS sin alfa OK, borrar cuenta OK, sin SDKs de rastreo.
- Pendiente: aplicar correcciones rápidas (permisos, botones, `ITSAppUsesNonExemptEncryption`).

### 2026-10-03 - Verificación de email + antiabuso del registro ✅ backend `9dabf6f`+`ae4ef6f`, app `200be5e` (push hecho, web redesplegada)
- Motivo: sin verificar se podían crear miles de cuentas falsas. Además el límite por IP NO
  funcionaba en Render (sin `trust proxy` todas las peticiones parecían venir de la IP del proxy).
- Backend: `register` ya NO da sesión → `{needsVerification, email}` y envía un código de 6 cifras
  (30 min, 5 intentos, máx. 1 envío/min). `POST /auth/verify-email {email, code}` (devuelve sesión),
  `POST /auth/resend-verification {email}`. Login sin verificar → 403 `EMAIL_NOT_VERIFIED` (reenvía código).
  Re-registrar un email sin verificar reutiliza la cuenta. Sin verificar se borran a las 24 h (al registrar).
  Recuperar contraseña también deja el email verificado.
- Límites: registro 5/h por IP, login 10/min. `TRUST_PROXY` (nº de proxies; `main.ts`).
  `MAIL_DAILY_LIMIT` (250 por defecto, en memoria) → 503 si se supera, para no agotar Brevo (300/día).
- BD (`db push` hecho): `user.email_verified`, `verify_code_hash`, `verify_sent_at`, `verify_attempts`.
  Los 3 usuarios que ya había → marcados como verificados.
- App: `auth/pages/verify_email_page.dart` (código + "Reenviar en 60 s"), `AuthNeedsVerificationState`,
  `EmailNotVerifiedException`. Tests: backend 23 OK (+`auth.spec.ts`), app 44/44 (+`verify_email_test.dart`).
- Verificado en producción: registro → pide código, login sin verificar → 403. Usuario temporal borrado.
- Variables de Brevo puestas por el usuario el 2026-10-05. (`TRUST_PROXY` quedó obsoleto, ver entrada de arriba.)

### 2026-10-02 - Versión web en Firebase Hosting ✅ desplegada, app `a5f1cd1` (push hecho)
- URL: **https://mi-suplementacion-app.web.app** (proyecto Firebase `mi-suplementacion-app`).
  Redesplegar: `flutter build web --release` + `firebase deploy --only hosting --project mi-suplementacion-app`
  (desde `flutter_app`). Web responde 200. `CORS_ORIGINS` puesto en el servicio de Render
  (ojo: en un Environment Group sin enlazar NO se aplica). Verificado: el backend ya acepta la web.
- El usuario la está probando en su iPhone (Safari) estos días.
- Pendiente para más adelante: los botones "Google"/"Apple" del login son SOLO decorativos
  (`login_page.dart` `_buildSocialButtons`). Decisión: dejarlos así e implementarlos juntos cuando
  pague Apple Developer (Apple exige "Iniciar sesión con Apple" si se ofrece Google).
- Objetivo: ver la app desde el iPhone con un enlace (Flutter web en Firebase Hosting, gratis).
- `flutter build web --release` compila OK (→ `build\web`). Instalado `firebase-tools` 15.32.1 global.
- `notification_service.dart`: en web (`kIsWeb`) las notificaciones no hacen nada (no existen allí).
- Nuevo `flutter_app\firebase.json` (sirve `build/web`, todas las rutas → `index.html`).
- CORS: NO hay que tocar código; añadir en Render > Environment
  `CORS_ORIGINS=https://<proyecto>.web.app,https://<proyecto>.firebaseapp.com`.
- Pendiente (usuario): `firebase login` → crear proyecto → `firebase deploy --only hosting`.

### 2026-10-02 - Recuperar contraseña + privacidad y términos ✅ (push hecho: backend `8f79995`, app `ac9298f`)
- Recuperar contraseña: `POST /auth/forgot-password {email}` (respuesta genérica, 3/min) y
  `POST /auth/reset-password {email, code, newPassword}` (código 6 cifras, 15 min, máx. 5 intentos,
  devuelve sesión). Campos `user.reset_code_hash/reset_expires/reset_attempts`.
- Emails con **Brevo** (`src/mail/mail.service.ts`; NO Resend: sin dominio propio solo envía a ti).
  Variables `BREVO_API_KEY`, `MAIL_FROM` (email verificado en Brevo), `MAIL_FROM_NAME`.
  Sin ellas el código sale en el log del servidor (Render > Logs: "[SIN BREVO]").
- App: `auth/pages/forgot_password_page.dart` (email → código + contraseña nueva → sesión iniciada),
  enlazada desde "¿Olvidaste tu contraseña?". 429 → "Demasiados intentos".
- Legal (BORRADOR, rellenar [CORCHETES] y revisar con profesional): `public/privacidad.html`,
  `public/terminos.html`, `public/css/legal.css`. URLs: `/privacidad.html`, `/terminos.html`.
  `user.consent_at` guarda cuándo aceptó (RGPD, datos de salud = consentimiento explícito).
- App: texto de registro con enlaces y consentimiento de datos de salud; envía `acceptTerms: true`.
  Enlaces en Perfil y en la pantalla Pro (Apple lo exige). `core/utils/legal_links.dart` + `url_launcher`.
- Verificado en producción: páginas 200, forgot-password OK, consent_at guardado, borrar cuenta OK.
  Tests 42/42, APK compila (66 MB).
- Pendiente (usuario): crear cuenta Brevo y poner variables en Render; rellenar datos legales.

### 2026-10-02 - Eliminar cuenta ✅ backend `52624fa`, app `e1bac5f` (sin push)
- Plan "listo para publicar": 1) eliminar cuenta ✅ 2) recuperar contraseña 3) privacidad y términos.
- Backend: `POST /auth/delete-account {password}` (400 si contraseña mal; borra en cascada todo).
  Página web `public/eliminar-cuenta.html` (Google Play exige un enlace web para borrar la cuenta):
  `https://supplement-backend.onrender.com/eliminar-cuenta.html`.
- App: "Eliminar mi cuenta" bajo "Cerrar sesión" en Perfil → confirmación + contraseña →
  cancela notificaciones y cierra sesión. `showAppPrompt` ahora admite `obscureText`/`destructive`.
- Probado en local (contraseña mala → 400, buena → borrada, login después → 401, web OK). Tests 41/41.

### 2026-10-02 - Plan Pro verificado en producción ✅
- Usuario añadió a mano en Render > Environment `PRO_TEST_MODE=true` y `TZ=Europe/Madrid`.
- Verificado en Render (usuario temporal, borrado): testMode activo, activar Pro, stock 30→29 tras
  una toma, protector del mes, día completo con x1,5 (15 pts), estadísticas OK.
- TZ confirmada: a las 22:52 UTC del 1/10 el servidor ya contó la toma como 2/10 (hora de España).
- Nota: los cambios de variables en `render.yaml` NO se aplican solos; hay que ponerlos en el panel.
- Pendiente: el usuario prueba en el emulador. Al publicar: `PRO_TEST_MODE=false` + RevenueCat
  (requiere Apple Developer + Google Play Console).

### 2026-10-01 - Plan Pro: app Flutter ✅ commit `8640485` (push hecho, backend `6431e5a` también)
- `lib/presentation/pro/`: `bloc/pro_cubit.dart` (estado Pro global), `pages/pro_page.dart`
  (pantalla "Hazte Pro" + `ProBadge` + `openProPage()`), `pages/stats_page.dart` (calendario,
  adherencia, días de la semana, consejo; sin Pro = vista previa borrosa), `pages/stats_pdf.dart`
  (informe PDF con paquetes `pdf` + `printing`), `widgets/pro_profile_section.dart`.
- Datos: `pro_models.dart`, `pro_remote_datasource.dart`; `ProRequiredException` (403 PRO_REQUIRED).
- Stock: `UserSupplement.stockUnits/unitsPerIntake/stockDaysLeft/isStockLow`; sección Pro en editar
  suplemento; "📦 Quedan X días" en la tarjeta; tarjeta "Toca reponer" en la home (≤7 días).
- Tienda: etiqueta y filtro "Pro"; sin Pro el botón abre "Hazte Pro". Capsu: aureola y skin galaxia
  (revisados visualmente). Popup de premios sin "+0 puntos" (protector del mes = 🎁).
- Tests: 41/41 (+`test/pro_test.dart`). APK release compila (65,8 MB). Analyze: 21 infos previos.
- ⚠️ Render NO aplicó las variables nuevas de `render.yaml` (`PRO_TEST_MODE`, y seguramente `TZ`):
  hay que añadirlas a mano en Render > Environment. Verificado en producción: Pro bloquea bien (403).

### 2026-10-01 - Plan Pro: backend ✅ commit `6431e5a` (sin push)
- Plan acordado: Pro a 2,99 €/mes o 19,99 €/año, 7 días de prueba. Pagos reales con RevenueCat
  (Apple/Google) SOLO al publicar. Mientras, "modo de prueba" (`PRO_TEST_MODE=true` en `.env` y
  `render.yaml`; ⚠️ poner a false al publicar).
- BD (`db push` hecho): `user.pro_until`, `user.pro_source`, `user_supplement.stock_units`,
  `user_supplement.units_per_intake`.
- `src/subscription/`: `GET /subscription` (estado, precios, funciones), `POST /subscription/test/
  activate|deactivate`, `ProGuard` (403 con `code: PRO_REQUIRED`). Catálogo en `pro-plan.ts`.
- Stock: `PUT /user-supplements/:id/stock` (Pro) `{stockUnits, unitsPerIntake}`; cada toma resta.
- `src/stats/`: `GET /stats?days=7|30|90|365` (Pro): días, adherencia por suplemento, días de la
  semana, resumen. Un suplemento cuenta desde el día en que se añadió.
- Tienda: 4 objetos `proOnly` (medalla diamante, banner aurora, aureola, Capsu galaxia), puntos
  x1,5 en días/semanas, protector gratis al mes (`pro_protector:AAAA-MM`). Si deja Pro conserva lo comprado.
- Probado en local con usuario temporal (borrado). Tests backend: 20 OK (+`stats.spec.ts`).
- Pendiente: Flutter (pantalla Hazte Pro, candados, stock, estadísticas + PDF, objetos Pro).

### 2026-10-01 - Tienda fase 3: antitrampas y ajustes ✅ backend `a556d7e`, app `f54ca68` (push hecho)
- `POST /intakes`: rechaza tomas de hace >48 h (400 "Solo puedes registrar tomas de las últimas
  48 horas") y trata las futuras como "ahora" (`resolveTakenAt` en `intakes.service.ts`).
- `render.yaml`: `TZ=Europe/Madrid` (Render usa UTC: una toma a las 00:30 contaba en el día anterior).
- App: envía `takenAt` en UTC (`toUtc()`); antes iba sin zona horaria.
- Protector: solo se gasta si había racha de ≥2 días que salvar (`MIN_STREAK_TO_REPAIR`).
- Precios revisados, sin cambios: semana perfecta = 150 pts; primer objeto en ~5 días;
  protector = 1 semana; corona/Capsu dorado = 1-2 meses; catálogo completo ≈ 6 meses.
- Tests: backend 15 nuevos OK (`intakes.spec.ts`, `rewards.spec.ts`); app 35/35.
  `app.controller.spec.ts` ("Hello World") sigue fallando desde antes, no es de esto.
- Verificado en producción tras redeploy (~2 min): toma antigua → 400, toma actual → premios.
- Pendiente: comprobar en Render > Environment que aparece `TZ`. Ideas futuras: más objetos,
  eventos temporales, retos entre amigos.

### 2026-10-01 - Probar en móvil: el usuario tiene iPhone (no Android)
- El APK de Codemagic no sirve en iPhone. Decisión del usuario: **NO pagar Apple Developer
  (99 €/año) hasta que la app esté casi terminada**. Entonces: workflow iOS en Codemagic + TestFlight.
- Mientras tanto se prueba en el **emulador Android** (`flutter run`, ya apunta a Render).
  Alternativa gratis si quiere verla en su iPhone: `.ipa` sin firmar + Sideloadly (caduca a 7 días).

### 2026-10-01 - Backend desplegado en Render ✅
- Usuario creó el Blueprint en Render. URL definitiva: **https://supplement-backend.onrender.com**
  (coincide con la de la app y Codemagic, no hay que cambiar nada).
- Verificado en producción: `/api`, catálogo, registro, añadir suplemento, toma con premios
  (+10 día, +20 primer paso, +20 día redondo), `/rewards/summary` y `/shop/items` (21 objetos).
  Usuario temporal de prueba borrado.
- Abacus ya no se usa: se puede borrar la app allí.
- Pendiente: instalar el APK de Codemagic (build lanzado con el push `d7e1021`) y probar en móvil
  → fase 3 (limitar `takenAt` a 48 h, equilibrio de precios).

### 2026-10-01 - Fuera Abacus: backend en Render ✅ commits backend `820ce09`, app `d7e1021` (✅ push hecho)
- Push de ambos repos (incluye tienda: backend `4999349`, app `b5f8f7e`). El push de la app lanzó
  Codemagic; ese APK no conectará hasta que el backend esté desplegado en Render.
- Decisión: alojar el backend en **Render (plan gratis)**. BD sigue en Supabase (no se mueve nada).
- Backend: nuevo `render.yaml` (Frankfurt, autodeploy desde `main`, `JWT_SECRET` generado por
  Render, `DATABASE_URL` se pega a mano). `start:prod` → `node dist/src/main.js` (antes apuntaba
  a una ruta que no existía). Demo web servida desde `public/` con `process.cwd()` (antes no cargaba
  en build). CORS sin Abacus (+ variable `CORS_ORIGINS`). Borrados `.yarnrc.yml` (rutas del
  servidor de Abacus) y `Procfile`. Probado build + `start:prod` en local: `/`, `/api`, endpoints OK.
- App: `API_URL` por defecto y en `codemagic.yaml` = `https://supplement-backend.onrender.com`.
  Timeouts de Dio a 70 s (Render gratis duerme tras 15 min; despertar tarda ~50 s) y mensaje claro.
- Docs: URLs de Abacus cambiadas en CLAUDE.md antiguos, `CONFIGURAR_BACKEND_URL.md` y `Desktop\CLAUDE.md`.
- ⚠️ Si Render asigna otra URL (nombre ocupado), cambiarla en `api_constants.dart` y `codemagic.yaml`.
- Pendiente: push backend → crear Blueprint en Render → pegar DATABASE_URL → comprobar URL →
  push app (lanza Codemagic) → probar APK.

### 2026-10-01 - Tienda y puntos: fase 2 (Flutter) ✅ commit `b5f8f7e` (sin push)
- Nueva pestaña **Tienda** (nav: Suplementos · Amigos · Tienda · Perfil):
  `lib/presentation/rewards/` → `bloc/rewards_cubit.dart` (estado global de puntos/tienda +
  stream de celebraciones), `pages/shop_page.dart` (probador de Capsu, objetivos semanales,
  filtros, objetos, logros, historial), `widgets/rewards_widgets.dart` (PointsChip, RewardPopup,
  StreakRepairCard, ShopItemPreview).
- Datos: `data/models/rewards_models.dart`, `data/datasources/rewards_remote_datasource.dart`;
  `intakes_remote_datasource.dart` emite los premios de cada toma (stream `rewards`).
- `capsu.dart`: nuevo `CapsuOutfit` (head/face/neck/skin) y dibujo de 9 accesorios en código.
- Home: saldo en cabecera, tarjeta "¡Se ha roto tu racha!" si es recuperable, popup de Capsu al
  ganar puntos, Capsu de la celebración con su ropa. Perfil: banner, medalla, Capsu y puntos.
  Ranking de amigos: medalla junto al nombre.
- Comprar un cosmético lo equipa automáticamente. Error de la tienda se muestra en la pestaña.
- Tests: `test/rewards_test.dart` (35/35 OK en total, a tamaño móvil 360x800). Analyze sin
  errores ni warnings. Accesorios revisados visualmente (render a PNG temporal, ya borrado).
- ⚠️ La app contra producción NO tendrá tienda hasta desplegar el backend (`4999349`).
- Pendiente: push de ambos repos → desplegar backend → probar en emulador/móvil →
  fase 3 (limitar `takenAt` a 48 h, ajustes de precios/equilibrio).

### 2026-10-01 - Tienda y puntos: fase 1 (backend) ✅ commit `4999349` (sin push)
- ✅ `npx prisma db push` hecho en Supabase. Probado en local (puerto 3001) con usuario temporal
  (ya borrado): premios, compra sin puntos, reparación de racha (1→5), exclusivas, equipar 1 por slot.
- ⚠️ Producción aún NO tiene este código: hay que desplegar el backend (ahora en Render).
- Plan acordado: puntos por racha, objetivos y logros → tienda (protector de racha, medallas,
  banners, accesorios de Capsu). Fase 1 backend · Fase 2 Flutter · Fase 3 ajustes.
- `prisma/schema.prisma`: `user.points` + tablas `points_transaction` (historial, `ref` única para
  no dar un premio 2 veces), `user_item` (objetos, `equipped`) y `streak_freeze` (días protegidos).
- `src/streaks/`: racha recalculada en memoria (3 consultas en vez de cientos) y cuenta los días
  protegidos. Lógica pura en `streak-utils.ts`.
- Nuevo `src/rewards/`: catálogos en código (`shop-catalog.ts`, `rewards-catalog.ts`),
  `rewards.service.ts` (sync idempotente: +10/día completo solo hoy/ayer, objetivos semanales,
  logros, auto-reparación de racha con protector en ventana de 48 h), `shop.service.ts`
  (comprar/equipar, 1 objeto por slot), endpoints `GET /rewards/summary`, `GET /rewards/history`,
  `GET /shop/items`, `POST /shop/buy|equip|unequip` (`{ itemCode }`).
- `POST /intakes` ahora devuelve también `rewards` (premios ganados con esa toma).
- Ranking de amigos devuelve `equipped` (medalla/banner/Capsu de cada uno).
- Tests: `src/rewards/rewards.spec.ts` (10 OK). `app.controller.spec.ts` ya fallaba antes.
- Pendiente: `git push` del backend → desplegar en producción → fase 2 Flutter.

### 2026-09-30 - Codemagic fase 1 configurada (commit `7f3ad21`)
- Usuario conectó `supplement-flutter` en codemagic.io.
- Creado `flutter_app\codemagic.yaml`, workflow `android-test`: se lanza con cada push a `main`.
  Hace `pub get` → `flutter analyze --no-fatal-infos` → `flutter test` (con informe) →
  APK release contra producción (`API_URL`). El APK queda en Artifacts y se avisa por email.
- `android\app\build.gradle.kts`: si NO existe `key.properties` (Codemagic) firma con la clave debug.
  En local sigue usando `upload-keystore.jks` (ambos están en `.gitignore`, NO en GitHub).
- Quitados 2 casts innecesarios en `add_supplement_page.dart` (eran warnings del análisis).
- Verificado en local: analyze OK, 28 tests OK, APK release compila sin `key.properties` (59,6 MB).
- Flutter local: 3.47.5 stable (Codemagic usa `stable`).
- Pendiente: ver resultado del primer build en Codemagic → instalar APK en móvil y probar →
  fase 2 (test de integración en emulador).

### 2026-09-30 - Registro en CLAUDE.md + preparación para Codemagic
- Creado este `CLAUDE.md` en la raíz del proyecto, con rutas reales y registro de avances.
- Añadido aviso en `Desktop\CLAUDE.md` apuntando a este archivo.
- Objetivo: probar la app completa con **Codemagic** (CI en la nube).
  - Fase 1: `flutter analyze` + `flutter test` + APK contra producción.
  - Fase 2: test de integración (`integration_test/`) en emulador en Codemagic.
- Git: hay **2 repos privados** en GitHub (cada uno con su propio `.git`, NO hay repo en la raíz):
  - App: `supplement_app\flutter_app` → https://github.com/rubentresgallob/supplement-flutter
  - Backend: `supplement_backend\nodejs_space` → https://github.com/rubentresgallob/supplement-backend
- Subidos todos los cambios pendientes (rediseño forui, onboarding, Capsu, tests, carpeta ios,
  PrismaModule). Commits: app `36ce2c4`, backend `98beb32`.
- `gh` CLI sin login, pero `git push` funciona (credenciales de Windows).
- Pendiente: conectar `supplement-flutter` en codemagic.io → crear `codemagic.yaml` (fase 1).

### Antes de 2026-09-30 (resumen, sin registro detallado)
- Backend NestJS funcional (local y producción; antes en Abacus, desde 2026-10-01 en Render), 30 suplementos, JWT.
- App Flutter: BLoC, forui, onboarding, amigos, perfil, notificaciones locales, mascota Capsu.
- `API_URL` configurable con `--dart-define`.
- App probada en emulador Android.
