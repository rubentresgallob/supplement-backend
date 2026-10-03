import { addMinutes, subSeconds } from 'date-fns';
import {
  canResendVerification,
  isVerifyCodeValid,
  VERIFY_CODE_MINUTES,
  VERIFY_RESEND_SECONDS,
} from './auth.service';

const NOW = new Date(2026, 9, 3, 12, 0);

describe('verificación de email', () => {
  it('deja enviar el primer código', () => {
    expect(canResendVerification(null, NOW)).toBe(true);
  });

  it('no reenvía antes del tiempo de espera', () => {
    expect(canResendVerification(subSeconds(NOW, VERIFY_RESEND_SECONDS - 1), NOW)).toBe(false);
    expect(canResendVerification(subSeconds(NOW, VERIFY_RESEND_SECONDS), NOW)).toBe(true);
  });

  it('el código caduca a los VERIFY_CODE_MINUTES', () => {
    expect(isVerifyCodeValid(null, NOW)).toBe(false);
    expect(isVerifyCodeValid(addMinutes(NOW, -VERIFY_CODE_MINUTES + 1), NOW)).toBe(true);
    expect(isVerifyCodeValid(addMinutes(NOW, -VERIFY_CODE_MINUTES), NOW)).toBe(false);
  });
});
