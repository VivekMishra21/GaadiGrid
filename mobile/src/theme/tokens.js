import { colors } from './colors';

export const radius = { sm: 10, md: 14, lg: 18, xl: 24, pill: 999 };
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 };

const ink = colors.ink;

// Soft, low-contrast depth: just enough to lift cards off the page without looking heavy.
export const shadow = {
  card: { shadowColor: ink, shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 2 },
  raised: { shadowColor: ink, shadowOpacity: 0.12, shadowRadius: 22, shadowOffset: { width: 0, height: 10 }, elevation: 6 },
  green: { shadowColor: colors.green, shadowOpacity: 0.3, shadowRadius: 14, shadowOffset: { width: 0, height: 7 }, elevation: 5 },
};

export const type = {
  display: { fontSize: 30, fontWeight: '700', letterSpacing: -0.6, color: colors.textPrimary },
  h1: { fontSize: 26, fontWeight: '700', letterSpacing: -0.5, color: colors.textPrimary },
  h2: { fontSize: 20, fontWeight: '700', letterSpacing: -0.3, color: colors.textPrimary },
  title: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  body: { fontSize: 14, lineHeight: 21, color: colors.textSecondary },
  caption: { fontSize: 12, lineHeight: 17, color: colors.textMuted },
  label: { fontSize: 12, fontWeight: '600', letterSpacing: 0.3, color: colors.textSecondary },
  eyebrow: { fontSize: 11, fontWeight: '600', letterSpacing: 1, color: colors.green },
};
