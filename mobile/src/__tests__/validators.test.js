import { isValidOtp, isValidPhoneNumber, normalizePhoneInput } from '../utils/validators';

describe('isValidPhoneNumber', () => {
  it('accepts a valid Indian mobile number', () => {
    expect(isValidPhoneNumber('+919810000001')).toBe(true);
  });

  it('rejects an Indian number starting with an invalid digit', () => {
    expect(isValidPhoneNumber('+915810000001')).toBe(false);
  });

  it('rejects a number that is too short', () => {
    expect(isValidPhoneNumber('+9198100')).toBe(false);
  });

  it('rejects a number without a country code', () => {
    expect(isValidPhoneNumber('9810000001')).toBe(false);
  });

  it('rejects empty input', () => {
    expect(isValidPhoneNumber('')).toBe(false);
    expect(isValidPhoneNumber(null)).toBe(false);
  });

  it('rejects non-numeric junk', () => {
    expect(isValidPhoneNumber('+91abcdefghij')).toBe(false);
  });
});

describe('normalizePhoneInput', () => {
  it('prefixes a bare 10-digit number with +91', () => {
    expect(normalizePhoneInput('9810000001')).toBe('+919810000001');
  });

  it('leaves an already-prefixed number untouched', () => {
    expect(normalizePhoneInput('+919810000001')).toBe('+919810000001');
  });

  it('strips spaces and dashes', () => {
    expect(normalizePhoneInput('98100 00001')).toBe('+919810000001');
  });
});

describe('isValidOtp', () => {
  it('accepts a 6-digit code', () => {
    expect(isValidOtp('123456')).toBe(true);
  });

  it('rejects letters', () => {
    expect(isValidOtp('12a456')).toBe(false);
  });

  it('rejects a code that is too short', () => {
    expect(isValidOtp('12')).toBe(false);
  });

  it('rejects empty input', () => {
    expect(isValidOtp('')).toBe(false);
  });
});
