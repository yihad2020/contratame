export type RegistrationInput = {
  firstName: string; lastName: string; email: string; phone: string;
  password: string; passwordConfirmation: string;
};
export type ProfileInput = Pick<RegistrationInput, 'firstName' | 'lastName' | 'phone'>;
export type ValidationErrors = Partial<Record<keyof RegistrationInput, string>>;
export type ValidationResult<T> = { ok: true; value: T } | { ok: false; errors: ValidationErrors };
const INTERNATIONAL_PHONE = /^\+[1-9][0-9]{7,14}$/;

export function normalizePhone(phone: string): string | null {
  const trimmed = phone.trim();
  return trimmed ? trimmed.replace(/[\s().-]/g, '') : null;
}

function nameError(value: string, label: string, minimum: number, maximum: number) {
  const length = Array.from(value).length;
  return length < minimum || length > maximum
    ? `${label} debe tener entre ${minimum} y ${maximum} caracteres.` : undefined;
}

export function validateProfileInput(input: ProfileInput): ValidationResult<ProfileInput> {
  const value = { firstName: input.firstName.trim(), lastName: input.lastName.trim(), phone: normalizePhone(input.phone) ?? '' };
  const errors: ValidationErrors = {};
  const firstNameError = nameError(value.firstName, 'El nombre', 2, 50);
  const lastNameError = nameError(value.lastName, 'El apellido', 2, 80);
  if (firstNameError) errors.firstName = firstNameError;
  if (lastNameError) errors.lastName = lastNameError;
  if (value.phone && !INTERNATIONAL_PHONE.test(value.phone)) errors.phone = 'Usa formato internacional, por ejemplo +59170000000.';
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value };
}

export function validateRegistration(input: RegistrationInput): ValidationResult<Omit<RegistrationInput, 'passwordConfirmation'>> {
  const profile = validateProfileInput(input);
  const value = { firstName: input.firstName.trim(), lastName: input.lastName.trim(), phone: normalizePhone(input.phone) ?? '', email: input.email.trim(), password: input.password };
  const errors: ValidationErrors = profile.ok ? {} : { ...profile.errors };
  if (!/^\S+@\S+\.\S+$/.test(value.email)) errors.email = 'Ingresa un correo válido.';
  if (value.password.length < 8) errors.password = 'La contraseña debe tener al menos 8 caracteres.';
  if (input.password !== input.passwordConfirmation) errors.passwordConfirmation = 'Las contraseñas no coinciden.';
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value };
}
