import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "../../../../lib/prisma";

export const dynamic = "force-dynamic";

// Política por defecto de cada negocio (Ley 1581 de 2012 y Decreto 1377 de 2013, Colombia).
// Se usa cuando el negocio no ha publicado un enlace propio en Mi negocio.
const VERSION_DATE = "2 de noviembre de 2026";

async function getOrganization(slug: string) {
  return prisma.organization.findUnique({ where: { slug }, select: { name: true, slug: true, address: true, phone: true } });
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const organization = await getOrganization(params.slug);
  return { title: organization ? `Política de datos · ${organization.name}` : "Negocio no encontrado" };
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="mt-8"><h2 className="text-[18px] font-semibold">{title}</h2><div className="mt-3 space-y-3 text-[15px] leading-7 text-[var(--ink-muted)]">{children}</div></section>;
}

export default async function PrivacyPolicyPage({ params }: { params: { slug: string } }) {
  const organization = await getOrganization(params.slug);
  if (!organization) notFound();
  const { name } = organization;
  const contact = [organization.phone && `WhatsApp o teléfono ${organization.phone}`, organization.address && `en el establecimiento ubicado en ${organization.address}`].filter(Boolean).join(" o ") || "directamente en el establecimiento";

  return <main className="min-h-screen bg-[var(--surface-sunken)] px-4 py-10">
    <article className="mx-auto max-w-2xl rounded-[10px] border border-[var(--line)] bg-[var(--surface-raised)] p-6 sm:p-10">
      <p className="eyebrow">Protección de datos personales</p>
      <h1 className="display mt-3 text-[32px] leading-[1.1] sm:text-[40px]">Política de Tratamiento de Datos Personales de {name}</h1>
      <p className="mt-3 text-[13px] text-[var(--ink-muted)]">Vigente desde el {VERSION_DATE}.</p>

      <Section title="1. Responsable del tratamiento">
        <p><strong className="text-[var(--ink)]">{name}</strong>{organization.address ? `, con domicilio en ${organization.address}` : ""}{organization.phone ? `, teléfono / WhatsApp ${organization.phone}` : ""}, es el responsable del tratamiento de los datos personales de sus clientes, en cumplimiento de la Ley 1581 de 2012, el Decreto 1377 de 2013 (compilado en el Decreto 1074 de 2015) y demás normas que los modifiquen o complementen.</p>
      </Section>

      <Section title="2. Datos que recolectamos">
        <p>Cuando reservas una cita o te registras voluntariamente como cliente podemos recolectar: nombre completo, número de teléfono celular, correo electrónico, fecha de nacimiento y los datos de tus citas (servicio, fecha, hora y notas que nos dejes).</p>
        <p>No solicitamos datos sensibles. El registro como cliente es opcional y no es necesario para reservar.</p>
      </Section>

      <Section title="3. Finalidades del tratamiento">
        <p>Tus datos se usarán para:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Agendar, confirmar, reprogramar o cancelar tus citas y comunicarnos contigo sobre ellas.</li>
          <li>Llevar el historial de los servicios que has recibido.</li>
          <li>Enviarte, si te registras como cliente, descuentos, promociones, novedades y saludos de cumpleaños por WhatsApp, mensaje de texto o correo electrónico.</li>
          <li>Elaborar estadísticas internas para mejorar nuestro servicio.</li>
          <li>Atender tus consultas, peticiones y reclamos.</li>
        </ul>
      </Section>

      <Section title="4. Encargado del tratamiento">
        <p>Las reservas y el registro de clientes se gestionan mediante la plataforma de Growing Solutions, que actúa como encargado del tratamiento: almacena los datos por cuenta de {name}, únicamente para prestar este servicio y con medidas de seguridad adecuadas. Tus datos no se venden ni se comparten con terceros para fines distintos a los aquí descritos, salvo requerimiento de autoridad competente.</p>
      </Section>

      <Section title="5. Tus derechos como titular">
        <p>De acuerdo con el artículo 8 de la Ley 1581 de 2012, tienes derecho a:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Conocer, actualizar y rectificar tus datos personales.</li>
          <li>Solicitar prueba de la autorización que nos otorgaste.</li>
          <li>Ser informado sobre el uso que les hemos dado a tus datos.</li>
          <li>Revocar la autorización y/o solicitar la supresión de tus datos cuando no exista un deber legal o contractual de conservarlos.</li>
          <li>Acceder gratuitamente a tus datos personales.</li>
          <li>Presentar quejas ante la Superintendencia de Industria y Comercio por infracciones a la ley, una vez agotado el trámite de consulta o reclamo ante nosotros.</li>
        </ul>
        <p>Puedes pedir en cualquier momento que dejemos de enviarte promociones, sin que eso afecte tus reservas.</p>
      </Section>

      <Section title="6. Cómo ejercer tus derechos">
        <p>Puedes enviar tus consultas y reclamos a {name} por {contact}, indicando tu nombre, tu número de celular registrado y lo que solicitas.</p>
        <p><strong className="text-[var(--ink)]">Consultas:</strong> se responderán en un plazo máximo de diez (10) días hábiles desde su recibo, prorrogable por cinco (5) días hábiles más, informándote los motivos de la demora.</p>
        <p><strong className="text-[var(--ink)]">Reclamos</strong> (corrección, actualización, supresión o revocatoria): se atenderán en un plazo máximo de quince (15) días hábiles desde su recibo, prorrogable por ocho (8) días hábiles más, informándote los motivos de la demora. Si el reclamo está incompleto, te pediremos completarlo dentro de los cinco (5) días siguientes; si pasan dos (2) meses sin que lo hagas, se entenderá que desististe.</p>
      </Section>

      <Section title="7. Seguridad y conservación">
        <p>Aplicamos medidas técnicas, humanas y administrativas razonables para proteger tus datos contra pérdida, consulta, uso o acceso no autorizado. Conservaremos tus datos mientras seas nuestro cliente o mientras sean necesarios para las finalidades descritas, y luego los suprimiremos, salvo que la ley exija conservarlos.</p>
      </Section>

      <Section title="8. Cambios a esta política">
        <p>Cualquier cambio sustancial a esta política se publicará en esta misma página, indicando la nueva fecha de vigencia.</p>
      </Section>

      <div className="mt-10 border-t border-[var(--line)] pt-6"><Link href={`/b/${organization.slug}`} className="text-sm font-semibold text-[var(--accent)]">← Volver a la página de reservas</Link></div>
    </article>
  </main>;
}
