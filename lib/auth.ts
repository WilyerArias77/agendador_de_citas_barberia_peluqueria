import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { after } from "next/server";
import { actionEmailHtml, sendEmail } from "./email";
import { prisma } from "./prisma";

// Los correos se envían después de responder (after), para no revelar por el tiempo de respuesta si una cuenta existe.
export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL,
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    resetPasswordTokenExpiresIn: 60 * 60,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      after(() => sendEmail({ to: user.email, subject: "Recupera tu contraseña", html: actionEmailHtml({ title: "Recupera tu contraseña", intro: `Hola ${user.name.split(" ")[0]}, recibimos una solicitud para cambiar la contraseña de tu cuenta.`, buttonLabel: "Crear nueva contraseña", url, footer: "El enlace vence en 1 hora. Si no fuiste tú, ignora este correo: tu contraseña no cambiará." }) }));
    }
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60 * 24,
    sendVerificationEmail: async ({ user, url }) => {
      after(() => sendEmail({ to: user.email, subject: "Confirma tu correo", html: actionEmailHtml({ title: "Confirma tu correo", intro: `Hola ${user.name.split(" ")[0]}, confirma que este correo es tuyo para activar tu cuenta.`, buttonLabel: "Confirmar mi correo", url, footer: "El enlace vence en 24 horas. Si no creaste una cuenta, ignora este correo." }) }));
    }
  },
  session: { expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24 },
  trustedOrigins: [process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"],
  // En Vercel cada instancia tiene su memoria: el contador va en la base de datos.
  rateLimit: {
    enabled: true,
    storage: "database",
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 3600, max: 5 },
      "/request-password-reset": { window: 3600, max: 5 },
      "/reset-password": { window: 600, max: 10 },
      "/send-verification-email": { window: 3600, max: 5 }
    }
  }
});
