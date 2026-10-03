import { StyleSheet, View } from 'react-native';

import { Text } from './AppText';
import { colors } from '../theme/colors';
import { IconBadge } from './IconBadge';
import { Button } from './Button';

export function EmptyState({ title, subtitle, actionLabel, onAction, icon = 'search', tone = 'neutral' }) {
  return (
    <View style={styles.container}>
      <IconBadge name={icon} tone={tone} size={64} round />
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {actionLabel && onAction ? (
        <Button fullWidth onPress={onAction} style={styles.action} variant="secondary">{actionLabel}</Button>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingVertical: 36 },
  title: { color: colors.textPrimary, fontSize: 17, fontWeight: '800', textAlign: 'center', marginTop: 16 },
  subtitle: { color: colors.textSecondary, fontSize: 13, textAlign: 'center', marginTop: 8, lineHeight: 19 },
  action: { marginTop: 20, alignSelf: 'stretch' },
});
