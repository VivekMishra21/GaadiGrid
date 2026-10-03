import { StyleSheet, TouchableOpacity } from 'react-native';

import { colors } from '../theme/colors';
import { shadow } from '../theme/tokens';
import { Icon } from './Icon';

export function BackButton({ onPress, style }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.button, style]} accessibilityRole="button" accessibilityLabel="Go back" hitSlop={10}>
      <Icon name="chevronLeft" size={22} color={colors.textPrimary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: 'flex-start',
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    ...shadow.card,
  },
});
