import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { Text } from './AppText';
import { colors } from '../theme/colors';
import { type } from '../theme/tokens';
import { Icon } from './Icon';

// Consistent page top: optional back button, a strong title, a quiet subtitle, optional
// right-hand action. Used by every full screen so they all start the same way.
export function ScreenHeader({ title, subtitle, eyebrow, onBack, right, style }) {
  return (
    <View style={[styles.wrap, style]}>
      {onBack ? (
        <TouchableOpacity onPress={onBack} style={styles.back} accessibilityRole="button" accessibilityLabel="Go back" hitSlop={10}>
          <Icon name="chevronLeft" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      ) : null}
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          {eyebrow ? <Text style={[type.eyebrow, { marginBottom: 4 }]}>{eyebrow}</Text> : null}
          <Text style={type.h1} accessibilityRole="header">
            {title}
          </Text>
          {subtitle ? <Text style={[type.body, { marginTop: 4 }]}>{subtitle}</Text> : null}
        </View>
        {right}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
});
