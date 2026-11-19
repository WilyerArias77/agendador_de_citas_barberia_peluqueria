import { LegalPage, LegalSection, supportContact } from "../../components/legal-page";
import { supportWhatsapp } from "../../lib/billing";

export const metadata = { title: "Eliminación de datos" };

export default function EliminacionDatosPage() {
  const wa = `https://wa.me/${supportWhatsapp().replace(/\D/g, "")}?text=${encodeURIComponent("Hola Growing Solutions, solicito la eliminación de mis datos. Mi correo o celular registrado es: ")}`;
  return <LegalPage eyebrow="Growing Solutions · Tus datos" title="Instrucciones para eliminar tus datos">
    <LegalSection title="Desconectar WhatsApp (dueños de negocio)">
      <p>Si conectaste tu número de WhatsApp Business con Facebook / Meta y quieres quitar el acceso:</p>
      <ol className="list-decimal space-y-1 pl-6">
        <li>Inicia sesión en tu panel y entra a <strong className="text-[var(--ink)]">Agente de citas</strong>.</li>
        <li>En el número que quieres quitar, toca <strong className="text-[var(--ink)]">Desconectar</strong>.</li>
      </ol>
      <p>Al hacerlo eliminamos de inmediato el token de acceso y los datos de conexión de ese número, y retiramos la suscripción de nuestra app en tu cuenta de WhatsApp Business. Tu número y tus chats en la app WhatsApp Business no se ven afectados.</p>
      <p>También puedes quitar el acceso desde Facebook: <strong className="text-[var(--ink)]">Configuración y privacidad → Configuración → Integraciones comerciales</strong>, elige la app y toca <strong className="text-[var(--ink)]">Eliminar</strong>.</p>
    </LegalSection>

    <LegalSection title="Eliminar tu cuenta y todos tus datos">
      <p>Para borrar por completo tu cuenta, tu negocio, tus clientes, citas, conversaciones y cualquier dato recibido de Meta:</p>
      <ol className="list-decimal space-y-1 pl-6">
        <li>Escríbenos por {supportContact()} con el asunto “Eliminación de datos”.</li>
        <li>Indica el correo o el celular con el que te registraste.</li>
        <li>Te confirmaremos la identidad del titular y eliminaremos los datos en un plazo máximo de quince (15) días hábiles, salvo los que la ley nos obligue a conservar.</li>
      </ol>
      <p><a href={wa} target="_blank" rel="noopener noreferrer" className="inline-block rounded-[10px] bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-[var(--on-accent)]">Solicitar eliminación por WhatsApp</a></p>
    </LegalSection>

    <LegalSection title="Si eres cliente de una barbería">
      <p>Puedes pedir la eliminación de tus datos directamente al negocio donde reservaste (sus datos de contacto están en su página de reservas y en su política de datos) o escribirnos por {supportContact()} indicando el negocio y tu número de celular. Borraremos tus citas, tu registro y tus conversaciones con el Agente de citas.</p>
    </LegalSection>
  </LegalPage>;
}
