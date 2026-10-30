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
- **API para agentes** (`/api/agent/*`, n8n / WhatsApp): autenticada con `Authorization: Bearer <llave>`; cada negocio genera su llave en *Mi negocio*. Endpoints: `GET business`, `GET slots?serviceId&date[&days]`, `GET|POST bookings`, `PATCH|DELETE bookings/:id` (el teléfono del cliente debe coincidir).
- Horarios disponibles: `lib/booking.ts` (horario semanal, descansos, bloqueos y citas existentes; zona horaria del negocio).

## Base de datos

Las migraciones están en `prisma/migrations`. Para aplicarlas en producción: `npx prisma migrate deploy` con `DATABASE_URL` apuntando a la conexión directa de Neon.

## Ejecutar localmente

1. Instala Node.js LTS.
2. Ejecuta `npm install`.
3. Copia `.env.example` a `.env.local` y completa `DATABASE_URL` y `BETTER_AUTH_SECRET`.
4. Ejecuta `npx prisma migrate dev --name init`.
5. Ejecuta `npm run dev`.

Para activar autenticación, crea una base Neon, configura `DATABASE_URL` y `BETTER_AUTH_SECRET` en `.env.local`, y ejecuta `npx prisma migrate dev --name init`. La carpeta `supabase/` conserva las migraciones anteriores como referencia histórica y ya no forma parte del flujo activo.

## Próximas fases

Autenticación y RLS; perfiles, servicios y staff; disponibilidad y reservas; notificaciones; pagos sandbox; suscripciones SaaS; auditoría y pruebas end-to-end.
