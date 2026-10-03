import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text, TextInput } from './AppText';
import { colors } from '../theme/colors';
import { radius } from '../theme/tokens';
import { Icon } from './Icon';

export function TextField({ label, error, style, icon, onFocus, onBlur, multiline, ...inputProps }) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.container, style && { marginBottom: style.marginBottom }]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.field, multiline && styles.fieldMultiline, focused && styles.fieldFocused, !!error && styles.fieldError, style && { minHeight: style.minHeight }]}>
        {icon ? <Icon name={icon} size={18} color={focused ? colors.green : colors.textMuted} /> : null}
        <TextInput
          style={[styles.input, multiline && styles.inputMultiline, outlineNone]}
          placeholderTextColor={colors.textMuted}
          accessibilityLabel={label || inputProps.placeholder}
          accessibilityHint={error || undefined}
          multiline={multiline}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...inputProps}
        />
      </View>
      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

// react-native-web draws a browser outline on focus; the field border already shows focus.
const outlineNone = { outlineStyle: 'none', outlineWidth: 0 };

const styles = StyleSheet.create({
  container: { marginBottom: 14 },
  label: { color: colors.textSecondary, fontSize: 12, fontWeight: '700', letterSpacing: 0.3, marginBottom: 7 },
  field: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
  },
  fieldMultiline: { alignItems: 'flex-start', paddingVertical: 12 },
  fieldFocused: { borderColor: colors.green, backgroundColor: '#FFFFFF' },
  fieldError: { borderColor: colors.error, backgroundColor: colors.errorSoft },
  input: { flex: 1, color: colors.textPrimary, fontSize: 15, paddingVertical: 12 },
  inputMultiline: { minHeight: 70, textAlignVertical: 'top', paddingVertical: 0 },
  error: { color: colors.error, fontSize: 12, fontWeight: '600', marginTop: 5 },
});
