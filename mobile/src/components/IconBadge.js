import { StyleSheet, View } from 'react-native';

import { colors } from '../theme/colors';
import { radius } from '../theme/tokens';
import { Icon } from './Icon';

const TONES = {
  green: { bg: colors.greenSoft, fg: colors.greenDark },
  orange: { bg: colors.orangeSoft, fg: '#C95F12' },
  ink: { bg: colors.ink, fg: '#FFFFFF' },
  neutral: { bg: colors.surfaceRaised, fg: colors.textPrimary },
  error: { bg: colors.errorSoft, fg: colors.error },
};

export function IconBadge({ name, tone = 'green', size = 44, round = false, style }) {
  const t = TONES[tone] || TONES.green;
  return (
    <View
      style={[
        styles.box,
        { width: size, height: size, borderRadius: round ? size / 2 : radius.md, backgroundColor: t.bg },
        style,
      ]}
    >
      <Icon name={name} size={Math.round(size * 0.5)} color={t.fg} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center' },
});
