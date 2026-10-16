/**
 * Versiones vigentes de los textos legales (docs/legal en la app y public/ aquí).
 * Al publicar un cambio: subir la versión y resumirlo en LEGAL_CHANGES. Quien tenga
 * aceptada una versión anterior verá al iniciar sesión la pantalla de reaceptación.
 */
export const LEGAL_VERSIONS = { terms: '1.0', privacy: '1.0' } as const;

/** Resumen de los cambios de la versión vigente (lo ve quien tiene que volver a aceptar). */
export const LEGAL_CHANGES = [
  'Nuevos Términos de uso y Política de privacidad (versión 1.0).',
  'Confirmas que tienes 18 años o más.',
  'Consentimiento separado para tratar tus datos de salud (los suplementos que tomas, sus dosis y tus tomas).',
  'Tus amigos ya no ven tu progreso ni tus suplementos salvo que lo actives en Perfil.',
];

type Accepted = {
  terms_version: string | null;
  privacy_version: string | null;
  age_confirmed_at: Date | null;
  health_consent_at: Date | null;
};

/** ¿Tiene que (volver a) aceptar los textos vigentes? */
export function needsLegalAcceptance(u: Accepted) {
  return (
    u.terms_version !== LEGAL_VERSIONS.terms ||
    u.privacy_version !== LEGAL_VERSIONS.privacy ||
    !u.age_confirmed_at ||
    !u.health_consent_at
  );
}

/** Campos que se guardan al aceptar (registro o reaceptación). */
export function acceptanceData(now = new Date()) {
  return {
    age_confirmed_at: now,
    terms_accepted_at: now,
    terms_version: LEGAL_VERSIONS.terms,
    privacy_accepted_at: now,
    privacy_version: LEGAL_VERSIONS.privacy,
    health_consent_at: now,
  };
}

export const legalStatus = (u: Accepted) => ({
  needsAcceptance: needsLegalAcceptance(u),
  versions: LEGAL_VERSIONS,
  changes: LEGAL_CHANGES,
});
