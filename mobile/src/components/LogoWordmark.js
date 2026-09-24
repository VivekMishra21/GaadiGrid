import { StyleSheet, Text, View } from 'react-native';

import { Logo } from './Logo';
import { colors } from '../theme/colors';

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
  text: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  tagline: {
    fontSize: 11,
    fontWeight: '500',
    color: '#9FB2C4',
    letterSpacing: 0.2,
  },
});
