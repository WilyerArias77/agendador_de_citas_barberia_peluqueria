import Link from "next/link";
import { LegalPage, LegalSection, supportContact } from "../../components/legal-page";

export const metadata = { title: "Política de privacidad" };

export default function PrivacidadPage() {
  const contact = supportContact();
  return <LegalPage eyebrow="Growing Solutions · Protección de datos" title="Política de privacidad y tratamiento de datos personales">
    <LegalSection title="1. Quiénes somos">
      <p><strong className="text-[var(--ink)]">Growing Solutions</strong> ofrece una plataforma en línea para que barberías y peluquerías gestionen su agenda, sus clientes y un asistente de reservas por WhatsApp y por chat web (el “Servicio”). Esta política explica qué datos tratamos, para qué y cuáles son tus derechos, conforme a la Ley 1581 de 2012, el Decreto 1377 de 2013 (compilado en el Decreto 1074 de 2015) y demás normas aplicables en Colombia.</p>
      <p>Frente a los datos de los <strong className="text-[var(--ink)]">dueños y equipos de los negocios</strong>, Growing Solutions es responsable del tratamiento. Frente a los datos de los <strong className="text-[var(--ink)]">clientes de cada negocio</strong>, el negocio es el responsable y Growing Solutions actúa como encargado, tratándolos solo por cuenta del negocio. Cada negocio publica su propia política en su página de reservas.</p>
    </LegalSection>

    <LegalSection title="2. Datos que tratamos">
      <ul className="list-disc space-y-1 pl-6">
        <li><strong className="text-[var(--ink)]">Cuenta:</strong> nombre, correo electrónico, contraseña cifrada y datos de sesión.</li>
        <li><strong className="text-[var(--ink)]">Negocio:</strong> nombre, dirección, teléfono, horarios, servicios, precios y equipo.</li>
        <li><strong className="text-[var(--ink)]">Clientes del negocio:</strong> nombre, celular, correo, fecha de nacimiento (si la dan) e historial de citas.</li>
        <li><strong className="text-[var(--ink)]">WhatsApp Business (Meta):</strong> cuando un negocio conecta su número, recibimos de Meta el identificador de la cuenta de WhatsApp Business, el identificador y el número de teléfono, el nombre verificado y un token de acceso, que guardamos cifrado. También procesamos los mensajes que los clientes envían a ese número y las respuestas del asistente, para poder agendar citas.</li>
        <li><strong className="text-[var(--ink)]">Chat web:</strong> nombre, WhatsApp y mensajes que el cliente escribe al Agente de citas.</li>
        <li><strong className="text-[var(--ink)]">Pagos:</strong> los reportes de pago y códigos de aprobación del plan. No almacenamos datos de tarjetas ni claves bancarias.</li>
        <li><strong className="text-[var(--ink)]">Técnicos:</strong> dirección IP y registros necesarios para seguridad y control de abuso.</li>
      </ul>
    </LegalSection>

    <LegalSection title="3. Para qué usamos los datos">
      <ul className="list-disc space-y-1 pl-6">
        <li>Prestar el Servicio: agenda, recordatorios, registro de clientes y reportes del negocio.</li>
        <li>Operar el asistente de reservas: responder mensajes, informar servicios y horarios, y crear, cambiar o cancelar citas.</li>
        <li>Gestionar la cuenta, la prueba gratis y la suscripción.</li>
        <li>Dar soporte, enviar avisos del Servicio y mantener la seguridad de la plataforma.</li>
      </ul>
      <p>No vendemos datos personales ni los usamos para publicidad de terceros. Los datos obtenidos de Meta se usan únicamente para prestar el asistente de WhatsApp al negocio que lo conectó.</p>
    </LegalSection>

    <LegalSection title="4. Con quién compartimos datos">
      <p>Solo con proveedores que necesitamos para operar el Servicio y que tratan los datos bajo nuestras instrucciones: alojamiento y base de datos en la nube, envío de correos, Meta (WhatsApp Cloud API) para enviar y recibir mensajes, y el proveedor de inteligencia artificial que genera las respuestas del asistente. También podemos entregar datos cuando lo exija una autoridad competente.</p>
      <p>Algunos de estos proveedores están fuera de Colombia; en esos casos exigimos niveles adecuados de protección.</p>
    </LegalSection>

    <LegalSection title="5. Conservación y seguridad">
      <p>Conservamos los datos mientras la cuenta esté activa o mientras sean necesarios para las finalidades descritas. Los tokens de acceso se guardan cifrados y las comunicaciones viajan por conexiones seguras (HTTPS). Al desconectar un número de WhatsApp eliminamos su token y dejamos de recibir sus mensajes.</p>
    </LegalSection>

    <LegalSection title="6. Tus derechos">
      <p>Puedes conocer, actualizar, rectificar y suprimir tus datos, revocar la autorización, pedir prueba de ella, ser informado del uso dado a tus datos y presentar quejas ante la Superintendencia de Industria y Comercio. Para pedir la eliminación sigue las instrucciones de <Link href="/eliminacion-de-datos" className="font-semibold text-[var(--accent)] underline">Eliminación de datos</Link>.</p>
      <p>Si eres cliente de una barbería, también puedes dirigirte directamente a ese negocio.</p>
    </LegalSection>

    <LegalSection title="7. Contacto">
      <p>Escríbenos por {contact} indicando tu nombre, tu correo o celular registrado y tu solicitud. Las consultas se responden en máximo diez (10) días hábiles y los reclamos en máximo quince (15) días hábiles, según la Ley 1581 de 2012.</p>
    </LegalSection>

    <LegalSection title="8. Cambios">
      <p>Publicaremos en esta página cualquier cambio a esta política, con su nueva fecha de vigencia.</p>
    </LegalSection>
  </LegalPage>;
}
