const messages: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "Correo o contraseña incorrectos.",
  USER_ALREADY_EXISTS: "Ya existe una cuenta con ese correo. Inicia sesión.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "Ya existe una cuenta con ese correo. Inicia sesión o usa otro.",
  PASSWORD_TOO_SHORT: "La contraseña debe tener al menos 8 caracteres.",
  PASSWORD_TOO_LONG: "La contraseña es demasiado larga.",
  INVALID_EMAIL: "Escribe un correo electrónico válido.",
  INVALID_PASSWORD: "Contraseña incorrecta.",
  INVALID_TOKEN: "El enlace no es válido o ya venció. Pide uno nuevo.",
  EMAIL_NOT_VERIFIED: "Confirma tu correo antes de continuar.",
  TOO_MANY_REQUESTS: "Demasiados intentos. Espera un momento y vuelve a intentarlo."
};

export function authErrorMessage(error: { code?: string; status?: number; message?: string } | null | undefined, fallback: string) {
  if (!error) return fallback;
  if (error.code && messages[error.code]) return messages[error.code];
  if (error.status === 429) return messages.TOO_MANY_REQUESTS;
  return fallback;
}
