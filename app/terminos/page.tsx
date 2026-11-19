import Link from "next/link";
import { LegalPage, LegalSection, supportContact } from "../../components/legal-page";

export const metadata = { title: "Términos del servicio" };

export default function TerminosPage() {
  return <LegalPage eyebrow="Growing Solutions · Condiciones de uso" title="Términos del servicio">
    <LegalSection title="1. Aceptación">
      <p>Al crear una cuenta o usar la plataforma de <strong className="text-[var(--ink)]">Growing Solutions</strong> (el “Servicio”) aceptas estos términos. Si los aceptas en nombre de un negocio, declaras que tienes autorización para hacerlo.</p>
    </LegalSection>

    <LegalSection title="2. El Servicio">
      <p>El Servicio permite a barberías y peluquerías administrar su agenda, servicios, equipo y clientes, publicar una página de reservas y usar un asistente de reservas (“Agente de citas”) por chat web y por WhatsApp. El asistente de WhatsApp requiere que el negocio conecte su propio número de WhatsApp Business mediante el registro integrado de Meta.</p>
    </LegalSection>

    <LegalSection title="3. Prueba gratis y plan">
      <p>Cada negocio puede usar una prueba gratis por tiempo limitado, con un número de WhatsApp. La prueba se ofrece una sola vez por negocio y por número. Al terminar, el número se desconecta automáticamente si no se activa el plan.</p>
      <p>El plan se paga por mes, según el número de barberos, mediante transferencia. Se activa con el código de aprobación que entregamos después de verificar el pago. Si no se renueva, el acceso al panel y al asistente se suspende hasta el siguiente pago.</p>
    </LegalSection>

    <LegalSection title="4. Responsabilidades del negocio">
      <ul className="list-disc space-y-1 pl-6">
        <li>Mantener la información de su cuenta y su contraseña seguras.</li>
        <li>Publicar información veraz de servicios, precios y horarios.</li>
        <li>Contar con la autorización de sus clientes para tratar sus datos y publicar su política de tratamiento de datos.</li>
        <li>Cumplir las políticas de WhatsApp Business y de Meta al usar su número, incluyendo no enviar spam ni contenido prohibido.</li>
        <li>Revisar las citas agendadas por el asistente. El asistente es una herramienta automática y puede cometer errores.</li>
      </ul>
    </LegalSection>

    <LegalSection title="5. Uso no permitido">
      <p>No está permitido usar el Servicio para actividades ilegales, suplantar a otras personas, enviar mensajes masivos no solicitados, intentar acceder a datos de otros negocios ni afectar el funcionamiento de la plataforma. Podemos suspender cuentas que incumplan estos términos.</p>
    </LegalSection>

    <LegalSection title="6. Servicios de terceros">
      <p>El asistente de WhatsApp depende de Meta (WhatsApp Cloud API) y de proveedores de inteligencia artificial. No controlamos su disponibilidad ni sus políticas, y no respondemos por interrupciones o bloqueos originados en ellos.</p>
    </LegalSection>

    <LegalSection title="7. Datos personales">
      <p>Tratamos los datos según nuestra <Link href="/privacidad" className="font-semibold text-[var(--accent)] underline">Política de privacidad</Link>. Puedes pedir la eliminación de tus datos siguiendo las instrucciones de <Link href="/eliminacion-de-datos" className="font-semibold text-[var(--accent)] underline">Eliminación de datos</Link>.</p>
    </LegalSection>

    <LegalSection title="8. Limitación de responsabilidad">
      <p>El Servicio se presta “tal como está”. Hacemos lo razonable para que funcione de forma continua y segura, pero no garantizamos que esté libre de fallas. En la medida permitida por la ley, nuestra responsabilidad total se limita al valor pagado por el negocio en el último mes de servicio.</p>
    </LegalSection>

    <LegalSection title="9. Terminación">
      <p>Puedes dejar de usar el Servicio en cualquier momento. Podemos terminar o suspender el acceso por incumplimiento de estos términos o por falta de pago.</p>
    </LegalSection>

    <LegalSection title="10. Ley aplicable y contacto">
      <p>Estos términos se rigen por las leyes de la República de Colombia. Para cualquier inquietud escríbenos por {supportContact()}.</p>
      <p>Podemos actualizar estos términos; los cambios se publicarán en esta página con su nueva fecha de vigencia.</p>
    </LegalSection>
  </LegalPage>;
}
