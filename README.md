# barberia.growingsolutions

Plataforma SaaS de Growing Solutions de reservas para barberías y salones de belleza, con Neon PostgreSQL, Prisma y Better Auth.

## Fase 1 incluida

- App Router con Next.js y TypeScript.
- Sistema visual responsive en español.
- Temas iniciales para barbería y salón, con selector en la landing.
- Landing pública, acceso y panel inicial con datos demostrativos.
- Contratos de entorno preparados para Neon, correo y pagos futuros.
- Integración base de Better Auth con correo y contraseña y protección server-side para `/panel`.
- Esquema Prisma para usuarios, sesiones, organizaciones, perfiles, servicios y disponibilidad.
- Modelo inicial para organizaciones, miembros, servicios, horarios y excepciones de disponibilidad.
- Vistas de catálogo de servicios y disponibilidad del negocio.

## Cómo funciona

- **Dueños de negocio** se registran (`/registro`), configuran su negocio (`/bienvenida`) y reciben 7 días de prueba. El panel (`/panel`) exige plan vigente (`Organization.subscriptionStatus`, `trialEndsAt`, `currentPeriodEnd`); si vence, redirige a `/suscripcion`.
- **Clientes finales** reservan sin cuenta en la página pública `/b/<slug>`, que también tiene botón de WhatsApp con el número del negocio.
- **API para agentes** (`/api/agent/*`, n8n / WhatsApp): autenticada con `Authorization: Bearer <llave>`; cada negocio genera su llave en *Mi negocio*. Endpoints: `GET business` (incluye `barbers`), `GET slots?serviceId&date[&days][&barberId]`, `GET|POST bookings`, `PATCH|DELETE bookings/:id` (el teléfono del cliente debe coincidir).
- Horarios disponibles: `lib/booking.ts` (horario semanal, descansos, bloqueos y citas existentes; zona horaria del negocio). Intervalos de 30 minutos; la página pública los muestra en dos columnas (Día · AM / Tarde · Noche · PM) y el día en un calendario mensual.
- **Barberos** (`/panel/barberos`, solo dueño): cada barbero tiene su propia agenda. Si hay barberos activos, el cliente elige primero al barbero y luego servicio, día y hora. Con correo y contraseña el barbero entra al panel con rol `barber` (`OrganizationMember.role`): ve solo sus citas, puede agendar, reprogramar (`/panel/citas/:id/reprogramar`) y cancelar, y registrar clientes. Las citas sin barbero (anteriores) bloquean a todos. El agente de WhatsApp puede enviar `barberId` (opcional); si no lo envía, se asigna el primer barbero libre.
- **Clientes** (`/panel/clientes`, dueño y barberos) y botón opcional en la página pública: nombre, celular, correo y fecha de nacimiento, con autorización de tratamiento de datos. Requiere que el dueño configure en *Mi negocio* el enlace a su Política de Tratamiento de Datos Personales (`Organization.privacyPolicyUrl`); el texto legal lo define cada negocio. El registro nunca es requisito para reservar.
- **Tablero contable** (*Mi negocio → Tablero contable*): servicios prestados (citas confirmadas y atendidas), ingresos y ticket promedio en un rango de fechas, comparado con otro rango, con gráfica por servicio.

## Base de datos

Las migraciones están en `prisma/migrations`. Para aplicarlas en producción: `npx prisma migrate deploy` con `DATABASE_URL` apuntando a la conexión directa de Neon.

## Producción y dominio

- URL pública: **https://www.barberia.growingsolutions.online** (proyecto Vercel `agendador-de-citas-barberia-peluqueria`). Se despliega automáticamente con cada push a `main`.
- `barberia.growingsolutions.online` sigue asignado al proyecto y redirige al dominio con `www`, para no romper enlaces antiguos (`/b/<slug>`, API del agente).
- DNS en Hostinger (`growingsolutions.online`):

  | Tipo | Nombre | Valor |
  |---|---|---|
  | CNAME | `www.barberia` | el que indique Vercel (`*.vercel-dns-017.com`) |
  | TXT | `_vercel` | `vc-domain-verify=...` de cada subdominio (no borrarlos) |

  El dominio raíz está vinculado a otra cuenta de Vercel, por eso cada subdominio necesita su TXT de verificación. Esos TXT tienen TTL de 4 h: un registro nuevo puede tardar hasta 4 h en ser reconocido por Vercel.
- Variables de producción en Vercel: `NEXT_PUBLIC_APP_URL` y `BETTER_AUTH_URL` deben ser la URL pública exacta (con `https://`, sin `/` final). Better Auth solo confía en ese origen. Tras cambiarlas hay que hacer **Redeploy sin caché**, porque `NEXT_PUBLIC_*` se fija al compilar.
- Si cambia el dominio, actualizar también la URL base de la API en el flujo de n8n del agente de WhatsApp.

## Ejecutar localmente

1. Instala Node.js LTS.
2. Ejecuta `npm install`.
3. Copia `.env.example` a `.env.local` y completa `DATABASE_URL` y `BETTER_AUTH_SECRET`.
4. Ejecuta `npx prisma migrate dev --name init`.
5. Ejecuta `npm run dev`.

Para activar autenticación, crea una base Neon, configura `DATABASE_URL` y `BETTER_AUTH_SECRET` en `.env.local`, y ejecuta `npx prisma migrate dev --name init`. La carpeta `supabase/` conserva las migraciones anteriores como referencia histórica y ya no forma parte del flujo activo.

## Próximas fases

Autenticación y RLS; perfiles, servicios y staff; disponibilidad y reservas; notificaciones; pagos sandbox; suscripciones SaaS; auditoría y pruebas end-to-end.
