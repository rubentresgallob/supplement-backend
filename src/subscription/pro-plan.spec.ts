import { isProEnabled, isProTestMode } from './pro-plan';

describe('Plan Pro apagado por defecto', () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it('sin PRO_ENABLED, Pro está apagado aunque PRO_TEST_MODE sea true', () => {
    delete process.env.PRO_ENABLED;
    process.env.PRO_TEST_MODE = 'true';
    expect(isProEnabled()).toBe(false);
    expect(isProTestMode()).toBe(false);
  });

  it('solo se enciende con PRO_ENABLED=true', () => {
    process.env.PRO_ENABLED = 'false';
    expect(isProEnabled()).toBe(false);
    process.env.PRO_ENABLED = 'true';
    expect(isProEnabled()).toBe(true);
  });
});
