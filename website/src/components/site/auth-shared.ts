// Small pieces shared by the login and sign-up screens.

export const cardContainer = {
  hidden: { opacity: 0, scale: 0.97, y: 10 },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" as const, staggerChildren: 0.08, delayChildren: 0.15 },
  },
};

export const cardItem = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

export function isValidIndianMobile(digits: string) {
  return /^[6-9]\d{9}$/.test(digits);
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}
