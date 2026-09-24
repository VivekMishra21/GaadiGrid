const E164_PATTERN = /^\+[1-9]\d{7,14}$/;
const INDIAN_MOBILE_PATTERN = /^\+91[6-9]\d{9}$/;

export function isValidPhoneNumber(value) {
  if (!value) return false;
  const trimmed = value.trim();
  if (!E164_PATTERN.test(trimmed)) return false;
  if (trimmed.startsWith('+91')) return INDIAN_MOBILE_PATTERN.test(trimmed);
  return true;
}

export function normalizePhoneInput(value) {
  const digits = value.replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) return digits;
  if (digits.length === 10) return `+91${digits}`;
  return digits;
}

export function isValidOtp(value) {
  return /^\d{4,8}$/.test(value || '');
}
