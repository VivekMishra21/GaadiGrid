import { StyleSheet, View } from 'react-native';

import { EmptyState } from '../components/EmptyState';
import { colors } from '../theme/colors';

export function ComingSoonScreen({ title, subtitle }) {
  return (
    <View style={styles.container}>
      <EmptyState title={title} subtitle={subtitle} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
});
