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

- **Dueños de negocio** se registran (`/registro`), **confirman su correo** (enlace enviado con Resend; sin confirmarlo `/bienvenida` no deja crear el negocio) y configuran su negocio con nombre, WhatsApp (obligatorio) y dirección. Reciben 7 días de prueba **una sola vez por negocio**: si el WhatsApp (últimos 10 dígitos) o el mismo nombre + dirección ya existen en otro negocio, se crea sin prueba y se envía a `/suscripcion?sinPrueba=1`. El panel (`/panel`) exige plan vigente (`Organization.subscriptionStatus`, `trialEndsAt`, `currentPeriodEnd`); si vence, redirige a `/suscripcion`.
- **Cobro del plan** (`lib/billing.ts`): pago único de instalación según los barberos activos (1 barbero $300.000; 2 barberos $400.000; más de 2 $500.000) + **$50.000 al mes por barbero** (mínimo 1). La instalación se cobra solo en el primer pago (`Organization.setupPaidAt`; los negocios que ya pagaban con la tarifa anterior quedaron marcados como pagados). Se paga por transferencia a Nequi 3001284662. En `/suscripcion` el dueño ve la tabla de tarifas y el desglose de su pago, reporta el pago (nombre y referencia → `PaymentReport`, que guarda total, instalación y barberos) y envía el comprobante por WhatsApp. El administrador aprueba o rechaza en `/admin/pagos`; al aprobar, el plan queda `active`, `currentPeriodEnd` suma un mes desde lo más lejano entre hoy, el fin de la prueba y el fin del periodo pagado, y si el reporte incluía instalación se marca `setupPaidAt`. También puede "Sumar 1 mes" y "Marcar pagada" la instalación sin reporte. No hay cobro automático. Desde 5 días antes del vencimiento el panel muestra "Tu mensualidad vence en N días · Renovar ahora" (`RENEWAL_NOTICE_DAYS` en `components/app-shell.tsx`).
- **Clientes finales** reservan sin cuenta en la página pública `/b/<slug>`, que también tiene botón de WhatsApp con el número del negocio.
- **API para agentes** (`/api/agent/*`, n8n / WhatsApp): autenticada con `Authorization: Bearer <llave>`; cada negocio genera su llave en *Mi negocio*. Endpoints: `GET business` (incluye `barbers`), `GET slots?serviceId&date[&days][&barberId]`, `GET|POST bookings`, `PATCH|DELETE bookings/:id` (el teléfono del cliente debe coincidir).
- Horarios disponibles: `lib/booking.ts` (horario semanal, descansos, bloqueos y citas existentes; zona horaria del negocio). Intervalos de 30 minutos; la página pública los muestra en dos columnas (Día · AM / Tarde · Noche · PM) y el día en un calendario mensual.
- **Barberos** (`/panel/barberos`, solo dueño): cada barbero tiene su propia agenda. Si hay barberos activos, el cliente elige primero al barbero y luego servicio, día y hora. Con correo y contraseña el barbero entra al panel con rol `barber` (`OrganizationMember.role`) y **solo ve su calendario y el formulario para crear clientes**: crear, reprogramar, cancelar o cambiar el estado de citas, y ver, modificar o eliminar clientes, es solo del dueño. Las citas sin barbero (anteriores) bloquean a todos. El agente de WhatsApp puede enviar `barberId` (opcional); si no lo envía, se asigna el primer barbero libre.
- **Clientes** (`/panel/clientes`: el dueño ve, edita y elimina; los barberos solo crean) y botón opcional en la página pública (arriba, antes del formulario de reserva): ambos despliegan el mismo formulario (`components/customer-form.tsx`) con nombre, celular, correo, fecha de nacimiento y casilla obligatoria de autorización de tratamiento de datos. El formulario enlaza a la Política de Tratamiento de Datos Personales del negocio: por defecto, `/b/<slug>/politica-de-datos`, generada con el nombre, la dirección y el WhatsApp del negocio (modelo según Ley 1581 de 2012 y Decreto 1377 de 2013; conviene que cada negocio la revise). Si el negocio tiene una propia, pega su enlace (`https://` obligatorio) en *Mi negocio* (`Organization.privacyPolicyUrl`) y se usa esa (`policyUrlFor` en `lib/customers.ts`). El registro nunca es requisito para reservar.
- Página pública `/b/<slug>`: sin bloque de horario semanal; los días cerrados se ven tachados en el calendario. En `/registro` y `/acceso` la promoción de 7 días gratis va en fucsia (`#ff1493`).
- **Calendario** (`/panel/calendario`): vista semanal de las citas (sin canceladas). El dueño ve todo el negocio o filtra por barbero (también desde *Barberos → Ver calendario*); cada barbero ve solo el suyo. Se refresca solo cada 30 s y al volver a la pestaña.
- **Correos al cliente** (`lib/email.ts`, Resend): al crear, reprogramar o cancelar una cita desde el panel se envía un correo con servicio, fecha, hora, barbero y valor. El correo se toma de la cita (campo opcional en *Nueva cita*) o, si no tiene, de la base de clientes por celular. Requiere `RESEND_API_KEY` y `EMAIL_FROM` (dominio verificado en Resend); sin ellas las citas funcionan igual, solo no se envía correo.
- **Tablero de gastos** (*Mi negocio → Tablero de gastos*, solo dueño, tabla `Expense`): registro con fecha, descripción, cantidad, valor de la compra (entero), total (cantidad × valor, calculado), proveedor y responsable. Filtro por fechas, totales, promedio, ingresos del periodo, utilidad (ingresos − gastos) y gráficas por día/mes, proveedor y responsable.
- **Tablero de ingresos** (*Mi negocio → Tablero de ingresos*): servicios prestados (citas confirmadas y atendidas, por fecha de la cita), ingresos y ticket promedio en un rango de fechas (por defecto el mes completo, comparado con el mes anterior), comparado con otro rango, con gráfica por servicio.

- **Seguridad de cuentas**: recuperación de contraseña en `/recuperar` → correo con enlace (1 h) → `/restablecer` (cierra las sesiones abiertas). El acceso a `/admin/pagos` exige que el correo esté en `PLATFORM_ADMIN_EMAILS` **y confirmado** (`isVerifiedPlatformAdmin`); si no lo está, la página ofrece enviar el enlace de confirmación. Límites: inicio de sesión 5/min, registro 5/h, recuperación 5/h, reenvío de confirmación 5/h, reservas y registros públicos 5 cada 10 min por IP, horarios públicos (`/api/slots`) 60/min por IP.
- **Dependencias**: Next.js 16, React 19, Prisma 6.19 (con `overrides` de `deepmerge-ts` 8 para cerrar la alerta del CLI de Prisma). `npm audit` sin vulnerabilidades.

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
