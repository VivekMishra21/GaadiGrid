import { StyleSheet, View } from 'react-native';

import { Text } from './AppText';
import { Logo } from './Logo';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';

export function LogoWordmark({ size = 40, variant = 'dark', showTagline = false }) {
  const textColor = variant === 'dark' ? colors.textPrimary : colors.bg;
  const pinColor = variant === 'dark' ? colors.textPrimary : colors.bg;

  return (
    <View style={styles.row}>
      <Logo size={size} pinColor={pinColor} />
      <View>
        <Text style={[styles.text, { color: textColor }]}>GaadiGrid</Text>
        {showTagline ? <Text style={styles.tagline}>Fuel. Clean. Care. Drive.</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  // The one place ExtraBold is used (see theme/fonts.js).
  text: {
    fontFamily: fonts.extrabold,
    fontSize: 22,
    letterSpacing: -0.4,
  },
  tagline: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textMuted,
    letterSpacing: 0.2,
  },
});
