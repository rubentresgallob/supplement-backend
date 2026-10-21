/**
 * Clave para firmar los tokens. Sin ella el servidor NO arranca: un valor por defecto
 * escrito en el código (público en el repositorio) permitiría a cualquiera fabricar tokens.
 */
export function getJwtSecret(env: NodeJS.ProcessEnv = process.env): string {
  const secret = env.JWT_SECRET?.trim();
  if (!secret) {
    throw new Error('Falta la variable JWT_SECRET (ver .env.example)');
  }
  return secret;
}
