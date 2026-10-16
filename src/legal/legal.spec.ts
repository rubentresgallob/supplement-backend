import { acceptanceData, LEGAL_VERSIONS, needsLegalAcceptance } from './legal';

describe('aceptación de los textos legales', () => {
  it('quien se registró con las tres casillas no tiene que volver a aceptar', () => {
    expect(needsLegalAcceptance(acceptanceData())).toBe(false);
  });

  it('un usuario anterior (sin versiones guardadas) tiene que aceptar', () => {
    expect(
      needsLegalAcceptance({
        terms_version: null,
        privacy_version: null,
        age_confirmed_at: null,
        health_consent_at: null,
      }),
    ).toBe(true);
  });

  it('si cambia la versión de la política, hay que volver a aceptar', () => {
    const data = { ...acceptanceData(), privacy_version: '0.9' };
    expect(LEGAL_VERSIONS.privacy).not.toBe('0.9');
    expect(needsLegalAcceptance(data)).toBe(true);
  });
});
