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

export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((value || '').trim());
}

export function isValidOtp(value) {
  return /^\d{4,8}$/.test(value || '');
}

export function todayIso() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function isValidIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

export function isFutureIsoDate(value) {
  return value > todayIso();
}
