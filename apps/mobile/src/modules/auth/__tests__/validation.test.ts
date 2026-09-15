import { normalizePhone, validateProfileInput, validateRegistration } from '@/modules/auth/validation';

const valid = {
  firstName: '  María  ', lastName: ' Núñez ', email: ' MARIA@EXAMPLE.COM ',
  phone: ' +591 700-00000 ', password: '12345678', passwordConfirmation: '12345678',
};

describe('validación de registro MOD-01', () => {
  it('normaliza nombres, correo y teléfono válidos', () => {
    const result = validateRegistration(valid);
    expect(result).toEqual({ ok: true, value: { firstName: 'María', lastName: 'Núñez', email: 'MARIA@EXAMPLE.COM', phone: '+59170000000', password: '12345678' } });
  });

  it('acepta teléfono vacío como dato opcional', () => {
    expect(normalizePhone('   ')).toBeNull();
    expect(validateRegistration({ ...valid, phone: '' }).ok).toBe(true);
  });

  it.each([
    ['nombre corto', { firstName: 'A' }, 'firstName'],
    ['nombre largo', { firstName: 'a'.repeat(51) }, 'firstName'],
    ['apellido corto', { lastName: 'A' }, 'lastName'],
    ['apellido largo', { lastName: 'a'.repeat(81) }, 'lastName'],
    ['correo inválido', { email: 'sin-arroba' }, 'email'],
    ['teléfono inválido', { phone: '70000000' }, 'phone'],
    ['contraseña corta', { password: '1234567', passwordConfirmation: '1234567' }, 'password'],
    ['confirmación distinta', { passwordConfirmation: 'abcdefgh' }, 'passwordConfirmation'],
  ])('rechaza %s', (_name, change, field) => {
    const result = validateRegistration({ ...valid, ...change });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[field as keyof typeof result.errors]).toBeDefined();
  });

  it('cuenta caracteres Unicode y no bytes', () => {
    expect(validateProfileInput({ firstName: 'Ña', lastName: 'Ávila', phone: '' }).ok).toBe(true);
  });
});
