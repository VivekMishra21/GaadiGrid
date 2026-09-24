import { StyleSheet, View } from 'react-native';

import { LogoWordmark } from '../components/LogoWordmark';
import { colors } from '../theme/colors';

export function SplashScreen() {
  return (
    <View style={styles.container}>
      <LogoWordmark size={56} variant="dark" showTagline />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
